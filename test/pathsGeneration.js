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
      u.installedModules.should.deep.equal(Object.keys(pathObj).sort());
      done();
    });
  });

  it("filters installed modules with match option", function(done) {
    var dummyNodeModules = u.dummyNodeModules.filter(function(name) {
      return name !== "_unbrowserifiable_";
    }),
    patterns = ["_*_", "!_unbrowserifiable_"];

    npmAmd({match: patterns}, function(err, pathObj) {
      Object.keys(pathObj).sort().should.deep.equal(dummyNodeModules);
      done();
    });
  });

  it("works as a stream as well", function(done) {
    var streamPaths = {};

    npmAmd({})
      .on("data", function(data) {
        data.should.have.keys(["id", "path"]);
        streamPaths[data.id] = data.path;
      })
      .on("end", function() {
        npmAmd({}, function(err, cbPaths) {
          streamPaths.should.deep.equal(cbPaths);
          done();
        });
      });
  });
});
