var fs = require("fs-extra"),
chai = require("chai"),
sinon = require("sinon"),
async = require("async"),
path = require("path"),
expect = chai.expect,
should = chai.should(),
npmAmd = require("../");

require("./setup/");

describe("Path object generation", function() {
  var browserifyOptions = {insertGlobals: true};

  before(function() {
    npmAmd._bundleCommonJS = sinon.spy(function(entry, options, force, cb) {
      cb(null, "dummyPath");
    });
  });

  it("maps every installed node module when it is not told otherwise", function(done) {
    var installedModules = fs.readdirSync("node_modules").filter(function(name) {
      return name !== ".bin";
    });

    npmAmd({}, function(err, pathObj) {
      installedModules.sort().should.deep.equal(Object.keys(pathObj).sort());
      done();
    });
  });

  it("filters installed modules with match option", function(done) {
    var dummyNodeModules = fs.readdirSync(path.join("test", "fixtures")).filter(function(name) {
      return name !== "_unbrowserifiable_";
    }),
    patterns = ["_*_", "!_unbrowserifiable_"];

    npmAmd({match: patterns}, function(err, pathObj) {
      Object.keys(pathObj).sort().should.deep.equal(dummyNodeModules);
      done();
    });
  });

  it("points to the resolved entry file if it is AMD", function() {
    npmAmd({}, function(err, pathObj) {
      expect(pathObj._amd_).to.equal(path.resolve(path.join("node_modules", "_amd_", "index-amd.js")));
    });
  });

  it("bundles the module if it is CommonJS with the options given", function(done) {
    npmAmd({force: true, browserifyOptions: browserifyOptions}, function(err, pathObj) {
      npmAmd._bundleCommonJS.calledWith("_cjs_", browserifyOptions, true).should.be.true;
      expect(pathObj._cjs_).to.equal(path.resolve("dummyPath"));
      done();
    });
  });

  it("can give you the paths relative to a given path", function(done) {
    npmAmd({from: "test"}, function(err, paths) {
      if (err) throw err;

      expect(paths._amd_).to.equal(path.join("..", "node_modules", "_amd_", "index-amd.js"));
      expect(paths._cjs_).to.include(path.join("..", "dummyPath"));
      done();
    });
  });
});
