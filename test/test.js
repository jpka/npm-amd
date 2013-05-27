var chai = require("chai"),
  fs = require("fs-extra"),
  path = require("path"),
  expect = chai.expect,
  should = chai.should(),
  npmAmd = require("../index.js"),
  sinon = require("sinon"),
  async = require("async"),

  fixturePath = path.join("test", "fixtures"),
  dummyNodeModules = fs.readdirSync(fixturePath);

function getMiddleChunk(entry) {
  var filePath = entry.indexOf(path.sep) > -1 ? entry : require.resolve(entry),
    contents = fs.readFileSync(filePath, "utf8");

  return contents.substr(Math.floor(contents.length / 2));
};

describe("NPM-AMD", function() {
  before(function(done) {
    async.each(dummyNodeModules, function(dir, cb) {
      fs.copy(path.join(fixturePath, dir), path.join("node_modules", dir), function(err) {
        if (err) throw err;
        cb();
      });
    }, done);
  });

  after(function(done) {
    fs.remove(npmAmd.storagePath, function() {
      async.each(dummyNodeModules, function(dir, cb) {
        fs.remove(path.join("node_modules", dir), function(err) {
          if (err) throw err;
          cb();
        });
      }, done);
    });
  });

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
      npmAmd._bundleCommonJS("cjs", options, function(err, filePath) {
        bundlePath = filePath;
        fs.readFile(filePath, "utf8", function(err, contents) {
          expect(err).to.not.exist;
          bundleContents = contents;
          done();
        });
      });
    });

    it("bundle installed node modules", function() {
      [require.resolve("cjs"), path.join("node_modules", "cjs", "dependency.js")].forEach(function(entry) {
        bundleContents.should.include(getMiddleChunk(entry));
      });
    });

    it("passes the options to browserify", function() {
      bundleContents.should.include("__filename");
    });
    
    it("wraps it as a functional AMD module", function(done) {
      requirejs("cjs", bundlePath, function(cjs) {
        cjs.should.equal("I am a dummy NPM module");
        done();
      });
    });

    it("appends the module version and options passed to the filename", function() {
      path.basename(bundlePath).should.equal("cjs-0.0.0-" + hashedOptions  + ".js");
    });

    it("doesn't bundle again what was already bundled with the same filename but it does when forced", function(done) {
      var oldStat = fs.statSync(bundlePath),
        newStat;
      this.timeout(4000);

      setTimeout(function() {
        npmAmd._bundleCommonJS("cjs", {insertGlobals: true}, function(err, filePath) {
          if (err) throw err;

          newStat = fs.statSync(filePath);
          oldStat.mtime.getTime().should.equal(newStat.mtime.getTime());

          setTimeout(function() {
            var options = {insertGlobals: true, force: true};
            npmAmd._bundleCommonJS("cjs", options, function(err, newFilePath) {
              expect(newFilePath).to.equal(filePath);
              oldStat.mtime.getTime().should.not.equal(fs.statSync(newFilePath).mtime.getTime());
              done();
            });
          }, 1000);
        });
      }, 1000);
    });

    it("saves a dummy modules that returns the error for modules that can't be browserified", function(done) {
      npmAmd._bundleCommonJS("unbrowserifiable", {}, function(err, filePath) {
        if (err) throw err;

        requirejs("ub", filePath, function(ub) {
          expect(ub).to.have.property("message");
          expect(ub.message).to.include("module \"./a\" not found");
          done();
        });
      });
    });
  });

  describe("Path object generation", function() {
    var pathObj,
    installedModules = fs.readdirSync("node_modules").filter(function(name) {
      if (name === ".bin") {
        return false;
      }
      return true;
    });

    before(function(done) {
      this.timeout(10000);
      sinon.spy(npmAmd, "_bundleCommonJS");
      npmAmd({insertGlobals: true}, function(err, p) {
        if (err) throw err;
        pathObj = p;
        done();
      });
    });

    it("has every installed node module in it", function() {
      installedModules.forEach(function(name) {
        pathObj.should.have.property(name);
        pathObj[name].should.be.a("string").and.include(name);
      });
    });

    it("creates all the files as expected", function() {
      var files = fs.readdirSync(npmAmd.storagePath).map(function(file) {
        return path.join(npmAmd.storagePath, file);
      });
      Object.keys(pathObj).forEach(function(key) {
        var value = pathObj[key];
        if (value.indexOf(npmAmd.storagePath) > -1) {
          files.should.contain(value);
        }
      });
    });

    it("points to the resolved entry file if it is AMD", function() {
      expect(pathObj.amd).to.equal(path.resolve(path.join("node_modules", "amd", "index-amd.js")));
    });

    it("bundles the module if it is CommonJS", function() {
      npmAmd._bundleCommonJS.calledWith("cjs").should.be.true;
      expect(pathObj.cjs).to.include(npmAmd.storagePath);
    });
  });
});
