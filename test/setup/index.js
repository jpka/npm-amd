var async = require("async"),
fs = require("fs-extra"),
path = require("path"),
fixturePath = path.join("test", "fixtures"),
dummyNodeModules = fs.readdirSync(fixturePath),
npmAmd = require("../../");

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
