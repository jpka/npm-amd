#!/usr/bin/env node

process.stdout.write("{\n");

require("./index")({})
  .on("data", function(data) {
    process.stdout.write("  " + data.id + ": " + data.path + ",\n");
  })
  .on("end", function() {
    process.stdout.write("}");
  });
