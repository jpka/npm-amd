var fs = require("fs-extra"),
async = require("async"),
path = require("path"),
chai = require("chai"),
expect = chai.expect,
should = chai.should(),
npmAmd = require("../"),
u = require("./setup")();

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

describe("Module Processing", function() {
  var fn = npmAmd._processModule;

  it("appends the module version and browserify options passed to the filename", function(done) {
    fn("_cjs_", {browserifyOptions: {insertGlobals: true}}, function(err, filePath) {
      path.basename(filePath).should.equal("_cjs_-0.0.0-" + npmAmd._hashObject({insertGlobals: true})  + ".js");
      done();
    });
  });

  it("points to the resolved entry file if it is AMD", function(done) {
    fn("_amd_", {}, function(err, filePath) {
      expect(filePath).to.equal(path.resolve(path.join("node_modules", "_amd_", "index-amd.js")));
      done();
    });
  });

  it("bundles the module if it is CommonJS with the options given", function(done) {
    fn("_cjs_", {browserifyOptions: {insertGlobals: true}}, function(err, filePath) {
      var src = fs.readFileSync(filePath, "utf8");

      src.should.include("I am a dummy NPM module")
        .and.include("I am a dummy dependency")
        .and.include("__filename");
      done();
    });
  });

  it("bundles CommonJS modules with a functional AMD wrapper", function(done) {
    fn("_cjs_", {}, function(err, filePath) {
      requirejs("_cjs_", filePath, function(cjs) {
        cjs.should.equal("I am a dummy NPM module");
        done();
      });
    });
  });

  it("allows you to specify a dir for bundle storage", function(done) {
    fn("_cjs_", {storagePath: "foo"}, function(err, filePath) {
      filePath.should.include("foo");
      done();
    });
  });

  it("returns absolute paths unless otherwise specified", function(done) {
    fn("_cjs_", {}, function(err, filePath) {
      path.resolve(filePath).should.equal(filePath);
      done();
    });
  });

  it("applies map function to the path", function(done) {
    fn("_cjs_", {map: function(p) { return p[0]; }}, function(err, filePath) {
      filePath.length.should.equal(1);
      done();
    });
  });

  it("saves a dummy module that returns the error for modules that can't be browserified", function(done) {
    fn("_unbrowserifiable_", {}, function(err, filePath) {
      requirejs("ub", filePath, function(ub) {
        expect(ub).to.have.property("message");
        expect(ub.message).to.include("module \"./a\" not found");
        done();
      });
    });
  });

  it("saves a dummy module that returns the error for modules that can't be resolved", function(done) {
    fn("_unresolvable_", {}, function(err, filePath) {
      requirejs("ur", filePath, function(ur) {
        expect(ur).to.have.property("message");
        expect(ur.message).to.include("_unresolvable_ could not be resolved");
        done();
      });
    });
  });

  it("doesn't process again a module of the same version with the same options", function(done) {
    var options = {browserifyOptions: {insertGlobals: true}};

    fn("_cjs_", options, function(err, filePath) {
      var stat = fs.statSync(filePath);

      setTimeout(function() {
        fn("_cjs_", options, function(err, filePath) {
          stat.mtime.getTime().should.equal(fs.statSync(filePath).mtime.getTime());
          done();
        });
      }, 1000);
    });
  });

  it("does process again the modules of the same version with the same options when forced", function(done) {
    var options = {browserifyOptions: {insertGlobals: true}, force: true};

    fn("_cjs_", options, function(err, filePath) {
      var stat = fs.statSync(filePath);

      setTimeout(function() {
        fn("_cjs_", options, function(err, filePath) {
          stat.mtime.getTime().should.not.equal(fs.statSync(filePath).mtime.getTime());
          done();
        });
      }, 1000);
    });
  });
});
