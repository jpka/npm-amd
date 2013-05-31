var fs = require("fs-extra"),
path = require("path"),
async = require("async"),
bresolve = require("browser-resolve"),
investigate = require("module-investigator"),
sigmund = require("sigmund"),
readableStream = require("stream").Readable,
fn;

//node v0.8 support
if (!readableStream) {
  readableStream = require("readable-stream");
}

module.exports = fn = function(options, callback) {
  var modules = fs.readdirSync("node_modules").filter(function(name) {
    return name !== ".bin";
  }),
  match = options.match,
  stream = new readableStream({objectMode: true}),
  running = false,
  paths;

  if (match) {
    match = typeof match === "string" ? [match] : match;
    match.forEach(function(pattern) {
      modules = modules.filter(require("minimatch").filter(pattern));
    });
  }

  stream._read = function() {
    if (running) return;
    running = true;
    async.each(modules, function(name, cb) {
      fn._processModule(name, options, function(err, filePath) {
        if (err) stream.emit("error", err);
        if (stream.push([name, filePath])) {
          cb();
        } else {
          cb(true);
        }
      });
    }, function() {
      stream.push(null);
      running = false;
    });
  };

  if (callback) {
    paths = {};
    stream
    .on("error", callback)
    .on("data", function(data) {
      paths[data[0]] = data[1];
    })
    .on("end", function() {
      callback(null, paths);
    });
  }

  return stream;
};

fn._processModule = function(name, options, cb) {
  var version = fs.readJSONSync(path.join("node_modules", name, "package.json")).version,
  force = options.force,
  storagePath = options.storagePath || "npm_amd_bundles",
  browserifyOptions = options.browserifyOptions || {},
  filePath = path.join(process.cwd(), storagePath, [name, version, fn._hashObject(browserifyOptions) + ".js"].join("-"));

  function finish(err) {
    if (options.map) {
      filePath = options.map(filePath);
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
        require("browserify")(name).bundle(browserifyOptions, function(err, src) {
          if (this.errored) return;
          if (err) {
            this.errored = true;
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

  return sigmund(normalized);
};
