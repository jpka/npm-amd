var fs = require("fs-extra"),
path = require("path"),
sinon = require("sinon"),
async = require("async"),
npmAmd = require("../"),
chai = require("chai"),
expect = chai.expect,
should = chai.should();

require("./setup/");

describe("CommonJS bundling", function(done) {
  var bundleContents,
  bundlePath,
  options = {insertGlobals: true},
  hashedOptions = npmAmd._hashObject(options);

  function requirejs(id, filePath, cb) {
    var rjs = require("requirejs"),
    paths = {};
    root.window = {};

    paths[id] = path.resolve(filePath.replace(".js", ""));
    rjs.config({
      paths: paths
    });
    rjs.nodeRequire = null;

    rjs([id], cb);
  }

  before(function(done) {
    npmAmd._bundleCommonJS("_cjs_", options, false, function(err, filePath) {
      bundlePath = filePath;
      fs.readFile(filePath, "utf8", function(err, contents) {
        expect(err).to.not.exist;
        bundleContents = contents;
        done();
      });
    });
  });

  it("bundles installed node modules", function() {
    [require.resolve("_cjs_"), path.join("node_modules", "_cjs_", "dependency.js")].forEach(function(entry) {
      bundleContents.should.include("I am a dummy NPM module")
        .and.include("I am a dummy dependency");
    });
  });

  it("passes the options to browserify", function() {
    bundleContents.should.include("__filename");
  });

  it("wraps it as a functional AMD module", function(done) {
    requirejs("_cjs_", bundlePath, function(cjs) {
      cjs.should.equal("I am a dummy NPM module");
      done();
    });
  });

  it("appends the module version and options passed to the filename", function() {
    path.basename(bundlePath).should.equal("_cjs_-0.0.0-" + hashedOptions  + ".js");
  });

  it("doesn't bundle again what was already bundled with the same filename but it does when forced", function(done) {
    var oldStat = fs.statSync(bundlePath),
    newStat;
    this.timeout(4000);

    setTimeout(function() {
      npmAmd._bundleCommonJS("_cjs_", {insertGlobals: true}, false, function(err, filePath) {
        if (err) throw err;

        newStat = fs.statSync(filePath);
        oldStat.mtime.getTime().should.equal(newStat.mtime.getTime());

        setTimeout(function() {
          npmAmd._bundleCommonJS("_cjs_", {insertGlobals: true}, true, function(err, newFilePath) {
            expect(newFilePath).to.equal(filePath);
            oldStat.mtime.getTime().should.not.equal(fs.statSync(newFilePath).mtime.getTime());
            done();
          });
        }, 1000);
      });
    }, 1000);
  });

  it("saves a dummy modules that returns the error for modules that can't be browserified", function(done) {
    npmAmd._bundleCommonJS("_unbrowserifiable_", {}, false, function(err, filePath) {
      if (err) throw err;

      requirejs("ub", filePath, function(ub) {
        expect(ub).to.have.property("message");
        expect(ub.message).to.include("module \"./a\" not found");
        done();
      });
    });
  });
});
