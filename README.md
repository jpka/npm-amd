Node utility intended to bridge npm modules and browser AMD consumers, it browserifies every installed browserifiable npm module and generates a paths hash to be used in a [RequireJS](http://requirejs.org/) configuration or the like.

# What it does

It resolves the entry files of the npm modules with [browser-resolve](https://github.com/shtylman/node-browser-resolve) to make use of the [browser](https://gist.github.com/shtylman/4339901) field if present. If the resolved file doesn't have AMD support it bundles it with [browserify](https://github.com/substack/node-browserify).
Finally it returns a paths object pointing the npm module's id's to the browserified bundle (wrapped in an AMD define), or to the original entry file if it already has AMD support.

It does caching via the bundle filename. The same module version with the same browserify options won't be browserified twice.

# API

```javascript
require("npm-amd")(options, function(err, paths){});
```

options can be browserify options and `force: true`, that disables the caching and rebrowserifies everything


# Roadmap

- "exclude" and "only" options to speed up lengthy builds
