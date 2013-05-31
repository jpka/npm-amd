var fs = require("fs"),
path = require("path"),
npmAmd = require("../"),
should = require("chai").should(),
u = require("./setup")();

describe("Acceptance", function() {
  this.timeout(10000);

  it("should work as expected when streaming", function(done) {
    var names = [],
    files = [];

    npmAmd({}).on("readable", function() {
      var data;
      while (data = this.read()) {
        names.push(data[0]);
        files.push(data[1]);
      }
    }).on("end", function() {
      names.sort().should.deep.equal(u.installedModules);
      files.forEach(function(file) {
        fs.existsSync(file).should.be.true;
      });
      done();
    });
  });

  it("should work as expected with a callback", function(done) {
    npmAmd({}, function(err, pathObj) {
      var mappedModules = Object.keys(pathObj);

      mappedModules.sort().should.deep.equal(u.installedModules);
      mappedModules.forEach(function(key) {
        fs.existsSync(pathObj[key]).should.be.true;
      });
      done();
    });
  });
});
