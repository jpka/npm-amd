#!/usr/bin/env node

require("./index")({}, function(err, paths) {
  if (err) throw err;
  console.log(paths);
});
