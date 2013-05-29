var fs = require("fs"),
path = require("path"),
npmAmd = require("../"),
should = require("chai").should(),
u = require("./setup")();

describe("Acceptance", function() {
  var pathObj;

  before(function(done) {
    this.timeout(10000);

    npmAmd({}, function(err, p) {
      if (err) throw err;
      pathObj = p;
      done();
    });
  });

  it("should bundle all modules and return paths to actual files", function() {
    var mappedModules = Object.keys(pathObj);
    mappedModules.sort().should.deep.equal(u.installedModules);
    mappedModules.forEach(function(key) {
      fs.existsSync(pathObj[key]).should.be.true;
    });
  });
});
