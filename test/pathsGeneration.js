var fs = require("fs-extra"),
async = require("async"),
path = require("path"),
chai = require("chai"),
expect = chai.expect,
should = chai.should(),
u = require("./setup")(),
npmAmd = require("../");

describe("Path object generation", function() {
  var browserifyOptions = {insertGlobals: true};

  before(function() {
    npmAmd._processModule = function(entry, options, cb) {
      cb(null, "dummyPath");
    };
  });

  it("maps every installed node module when it is not told otherwise", function(done) {
    npmAmd({}, function(err, pathObj) {
      Object.keys(pathObj).sort().should.deep.equal(u.installedModules);
      done();
    });
  });

  it("filters installed modules with match option", function(done) {
    var dummyNodeModules = u.dummyNodeModules.filter(function(name) {
      return name !== "_unbrowserifiable_";
    }),
    patterns = ["_*_", "!_unbrowserifiable_"];

    npmAmd({match: patterns}, function(err, pathObj) {
      Object.keys(pathObj).sort().should.deep.equal(dummyNodeModules.sort());
      done();
    });
  });

  it("streams well with new stream api", function(done) {
    var streamPaths = {};

    var stream = npmAmd({});
    setTimeout(function() {
      stream
      .on("readable", function() {
        while (data = this.read()) {
          data.should.be.an("Array");
          data.length.should.equal(2);
          streamPaths[data[0]] = data[1];
        }
      })
      .on("end", function() {
        Object.keys(streamPaths).sort().should.deep.equal(u.installedModules);
        done();
      });
    }, 1000);
  });
});
