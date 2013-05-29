var fs = require("fs-extra"),
path = require("path"),
async = require("async"),
bresolve = require("browser-resolve"),
investigate = require("module-investigator");

fn = function(options, cb) {
  var paths = {},
  stream;

  if (!cb) {
    stream = new (require("stream"));
    stream.readable = true;
  }

  fs.readdir("node_modules", function(err, modules) {
    var match = options.match;
    if (err) return cb(err);
    modules.splice(modules.indexOf(".bin"), 1);

    if (match) {
      match = typeof match === "string" ? [match] : match;
      match.forEach(function(pattern) {
        modules = modules.filter(require("minimatch").filter(pattern));
      });
    }

    async.each(modules, function(name, cb) {
      fn._processModule(name, options, function(err, filePath) {
        if (err) return cb(err);
        paths[name] = filePath;
        if (stream) stream.emit("data", {id: name, path: filePath});
        cb();
      });
    }, function(err) {
      if (cb) {
        if (err) return cb(err);
        cb(null, paths);
      } else {
        stream.emit("end");
      }
    });
  });

  return stream;
};

function bundleCommonJS(name, options, cb) {
  var errored, src = "";

  require("browserify")(name)
  .bundle(options)
  .on("error", function(err) {
    if (errored) return;
    errored = true;
    cb(err);
  })
  .on("data", function(data) {
    src += data;
  })
  .once("end", function() {
    if (errored) return;
    cb(null, src);
  });
};

fn._processModule = function(name, options, cb) {
  var version = fs.readJSONSync(path.join("node_modules", name, "package.json")).version,
  force = options.force,
  storagePath = options.storagePath || "npm_amd_bundles",
  browserifyOptions = options.browserifyOptions || {},
  filePath = path.join(process.cwd(), storagePath, [name, version, fn._hashObject(browserifyOptions) + ".js"].join("-"));

  function finish(err) {
    if (options.from) {
      filePath = path.relative(options.from, filePath);
    }
    cb(err, filePath);
  }

  if (fs.existsSync(filePath) && !force) {
    return finish();
  }

  function writeToFile(src) {
    fs.mkdirs(storagePath, function(err) {
      fs.writeFile(filePath, src, finish);
    });
  }

  function dumpError(error) {
    writeToFile("define(function() { return new Error('" + error + "'); });");
  }

  //browser-resolve should have a dirname option so I wouldn't have to lie to it
  bresolve(name, {filename: path.join(process.cwd(), "index.js")}, function(err, entryFilePath) {
    if (err || !entryFilePath) {
      console.warn("Warning: " + name + " could not be resolved from " + process.cwd() + ", creating dummy");
      return dumpError(err ? err.message : name + " could not be resolved");
    }

    fs.readFile(entryFilePath, "utf8", function(err, fileContents) {
      var info;
      if (err) return cb(err);

      info = investigate(fileContents);
      if (info.dependencies.amd.length || info.uses.indexOf("define") > -1 || info.uses.indexOf("require (AMD)") > -1) {
        filePath = entryFilePath;
        finish();
      } else {
        browserifyOptions.standalone = name;
        bundleCommonJS(name, browserifyOptions, function(err, src) {
          if (err) {
            console.warn("Warning: " + name + " could not be browserified, creating dummy");
            return dumpError(err.message);
          }

          writeToFile(src);
        });
      }
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
