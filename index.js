var fs = require("fs-extra"),
path = require("path"),
async = require("async"),
bresolve = require("browser-resolve"),
investigate = require("module-investigator");

fn = function(options, cb) {
  var paths = {},
  called;

  function resolvePath(to) {
    if (options.from) {
      return path.relative(options.from, to);
    } else {
      return path.resolve(to);
    }
  }

  fs.readdir("node_modules", function(err, dirs) {
    if (err) return cb(err);
    dirs.splice(dirs.indexOf(".bin"), 1);

    async.eachSeries(dirs, function(name, cb) {
      //browser-resolve should have a dirname option so I wouldn't have to lie to it
      bresolve(name, {filename: path.join(process.cwd(), "index.js")}, function(err, filePath) {
        if (err) return cb(err);

        fs.readFile(filePath, "utf8", function(err, fileContents) {
          var info;
          if (err) return cb(err);

          info = investigate(fileContents);
          if (info.dependencies.amd.length || info.uses.indexOf("define") > -1 || info.uses.indexOf("require (AMD)") > -1) {
            paths[name] = resolvePath(filePath);
            return cb();
          } else {
            fn._bundleCommonJS(name, options.browserify, options.force, function(err, filePath) {
              if (err) return cb(err);

              paths[name] = resolvePath(filePath);
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

fn._bundleCommonJS = function(entry, options, force, cb) {
  var browserify = require("browserify")(),
  src = "",
  version = fs.readJSONSync(path.join("node_modules", entry, "package.json")).version,
  filePath = "",
  errored;

  options = options || {};

  filePath = path.join(fn.storagePath, entry + "-" + version + "-" + fn._hashObject(options) + ".js");
  if (fs.existsSync(filePath) && !force) {
    return cb(null, filePath);
  }

  function finish() {
    fs.writeFile(filePath, src, function(err) {
      cb(err, filePath);
    });
  }

  fs.mkdirs(fn.storagePath, function(err) {
    if (err) return cb(err);

    options.standalone = entry;
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
        src = "define(function() { var error = new Error('" + err.message + "'); return error; });";
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

fn._hashObject = function(obj) {
  var normalized = {};

  Object.keys(obj).sort().forEach(function(key) {
    normalized[key] = obj[key];
  });

  return require("md5").digest_s(JSON.stringify(normalized));
};

module.exports = fn;
