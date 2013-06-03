#!/usr/bin/env node

process.stdout.write("{\n");

require("./index")({})
  .on("data", function(data) {
    process.stdout.write("  " + data[0] + ": " + data[1] + ",\n");
  })
  .on("end", function() {
    process.stdout.write("}");
  });
