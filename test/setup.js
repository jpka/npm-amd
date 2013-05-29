module.exports = function() {
  var async = require("async"),
  fs = require("fs-extra"),
  path = require("path"),
  fixturePath = path.join("test", "fixtures"),
  dummyNodeModules = fs.readdirSync(fixturePath);

  before(function(done) {
    async.each(dummyNodeModules, function(dir, cb) {
      fs.copy(path.join(fixturePath, dir), path.join("node_modules", dir), function(err) {
        if (err) throw err;
        cb();
      });
    }, done);
  });

  after(function(done) {
    var dirs = dummyNodeModules.map(function(name) {
      return path.join("node_modules", name);
    }).concat(["npm_amd_bundles", "foo"]);
    async.each(dirs, function(dir, cb) {
      fs.remove(dir, function(err) {
        if (err) throw err;
        cb();
      });
    }, done);
  });


  return {
    fixturePath: fixturePath,
    dummyNodeModules: dummyNodeModules,
    installedModules: fs.readdirSync("node_modules").filter(function(name) {
      return name !== ".bin";
    }).sort()
  };
}
