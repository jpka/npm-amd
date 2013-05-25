var fs = require("fs-extra"),
path = require("path"),
async = require("async"),
bresolve = require("browser-resolve"),
investigate = require("module-investigator");

fn = function(options, cb) {
  var paths = {},
  called;

  fs.readdir("node_modules", function(err, dirs) {
    if (err) return cb(err);
    dirs.splice(dirs.indexOf(".bin"), 1);

    async.each(dirs, function(name, cb) {
      bresolve(name, {filename: module.parent.filename}, function(err, filePath) {
        if (err) return cb(err);

        fs.readFile(filePath, "utf8", function(err, fileContents) {
          if (err) return cb(err);

          if (investigate(fileContents).dependencies.amd.length) {
            paths[name] = filePath;
            return cb();
          } else {
            fn._bundleCommonJS(name, options, function(err, filePath) {
              if (err) return cb(err);

              paths[name] = filePath;
              cb();
            });
          }
        });
      });
    }, function(err) {
      if (err) return cb(err);
      cb(null, paths);
    });
  });
};

fn.storagePath = "npm_amd_bundles";

fn._bundleCommonJS = function(entry, options, cb) {
  var browserify = require("browserify")(),
  src = "",
  force = options.force,
  errored;

  delete options.force;

  function finish() {
    fs.writeFile(filePath, "define(function() {" + src + "});", function(err) {
      cb(err, filePath);
    });
  }

  fs.mkdirs(fn.storagePath, function(err) {
    var version = fs.readJSONSync(path.join("node_modules", entry, "package.json")).version;
    
    filePath = path.join(fn.storagePath, entry + "-" + version + "-" + fn._normalizeOptions(options));
    if (fs.existsSync(filePath) && !force) {
      return cb(null, filePath);
    }

    browserify.on("error", function() {
      cb(err);
      errored = true;
    });
    browserify.add(entry);
    browserify.bundle(options)
      .on("error", function(err) {
        if (errored) return;
        errored = true;

        console.warn("Warn: " + entry + " could not be browserified, creating dummy");
        src = "throw(new Error('" + err.message + "'));";
        finish();
      })
      .on("data", function(data) {
        src += data;
      })
      .once("end", function() {
        if (errored) return;
        finish();
      });
  });
};

fn._normalizeOptions = function(obj) {
  var normalized = {};

  Object.keys(obj).sort().forEach(function(key) {
    normalized[key] = obj[key];
  });

  return JSON.stringify(normalized);
};

module.exports = fn;
