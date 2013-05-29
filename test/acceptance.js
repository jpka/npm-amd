var fs = require("fs-extra"),
path = require("path"),
should = require("chai").should(),
npmAmd = require("../");

require("./setup/");

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

  it("all paths point to a real file", function() {
    var files = fs.readdirSync(npmAmd.storagePath).map(function(file) {
      return path.resolve(path.join(npmAmd.storagePath, file));
    });
    Object.keys(pathObj).forEach(function(key) {
      var value = pathObj[key];
      if (value.indexOf(npmAmd.storagePath) > -1) {
        files.should.contain(value);
      }
      fs.existsSync(value).should.be.true;
    });
  });
});
