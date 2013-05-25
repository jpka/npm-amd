var chai = require("chai"),
  fs = require("fs-extra"),
  path = require("path"),
  expect = chai.expect,
  should = chai.should(),
  npmAmd = require("../index.js"),
  sinon = require("sinon"),
  async = require("async"),

  fixturePath = path.join("test", "fixtures"),
  dummyNodeModules = fs.readdirSync(fixturePath).map(function(dir) {
    return path.join(fixturePath, dir);
  });

function getMiddleChunk(entry) {
  var filePath = entry.indexOf(path.sep) > -1 ? entry : require.resolve(entry),
    contents = fs.readFileSync(filePath, "utf8");

  return contents.substr(Math.floor(contents.length / 2));
};

describe("NPM-AMD", function() {
  before(function(done) {
    async.each(dummyNodeModules, function(dir, cb) {
      fs.copy(dir, path.join("node_modules", path.basename(dir)), function(err) {
        if (err) throw err;
        cb();
      });
    }, done);
  });

  after(function(done) {
    async.each(dummyNodeModules.concat(npmAmd.storagePath), function(dir, cb) {
      fs.remove(dir, function(err) {
        if (err) throw err;
        cb();
      });
    }, done);
  });

  describe("CommonJS bundling", function(done) {
    var bundleContents,
      bundlePath,
      options = {insertGlobals: true, debug: true},
      normalizedOptions = npmAmd._normalizeOptions(options);

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
    
    it("wraps it as an AMD module", function() {
      bundleContents.should.include("define(function");
    });

    it("appends the module version and options passed to the filename", function() {
      path.basename(bundlePath).should.equal("cjs-0.0.0-" + normalizedOptions);
    });

    it("doesn't bundle again what was already bundled with the same filename but it does when forced", function(done) {
      var oldStat = fs.statSync(bundlePath),
        newStat;
      this.timeout(4000);

      setTimeout(function() {
        npmAmd._bundleCommonJS("cjs", JSON.parse(normalizedOptions), function(err, filePath) {
          if (err) throw err;

          newStat = fs.statSync(filePath);
          oldStat.mtime.getTime().should.equal(newStat.mtime.getTime());

          setTimeout(function() {
            var options = JSON.parse(normalizedOptions);
            options.force = true;
            npmAmd._bundleCommonJS("cjs", options, function(err, filePath) {
              expect(filePath).to.not.include("force");
              oldStat.mtime.getTime().should.not.equal(fs.statSync(filePath).mtime.getTime());
              done();
            });
          }, 1000);
        });
      }, 1000);
    });

    it("saves a dummy modules that throws the error for modules that can't be browserified", function(done) {
      npmAmd._bundleCommonJS("unbrowserifiable", {}, function(err, filePath) {
        if (err) throw err;

        fs.readFile(filePath, "utf8", function(err, fileContents) {
          expect(fileContents).to.contain("module \"./a\" not found");
          done();
        });
      });
    });
  });

  describe("Path object generation", function() {
    var pathObj;

    before(function(done) {
      this.timeout(10000);
      sinon.spy(npmAmd, "_bundleCommonJS");
      npmAmd({insertGlobals: true}, function(err, p) {
        if (err) throw err;
        pathObj = p;
        done();
      });
    });

    it("has every installed node module in it", function(done) {
      fs.readdir("node_modules", function(err, modules) {
        modules.splice(modules.indexOf(".bin"), 1);

        modules.forEach(function(name) {
          pathObj.should.have.property(name);
          pathObj[name].should.be.a("string");
        });
        done();
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
