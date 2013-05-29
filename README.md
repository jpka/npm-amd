Node utility intended to bridge npm modules and browser AMD consumers, it browserifies every installed browserifiable npm module and generates a paths hash to be used in a [RequireJS](http://requirejs.org/) configuration or the like.

# What it does

It resolves the entry files of the npm modules with [browser-resolve](https://github.com/shtylman/node-browser-resolve) to make use of the [browser](https://gist.github.com/shtylman/4339901) field if present. If the resolved file doesn't have AMD support it bundles it with [browserify](https://github.com/substack/node-browserify).
Finally it returns a paths object pointing the npm module's id's to the browserified bundle (wrapped in an AMD define), or to the original entry file if it already has AMD support.

It does caching via the bundle filename. The same module version with the same browserify options won't be browserified twice.

# API

```javascript
require("npm-amd")(options, function(err, paths){});
```

which will return the paths object like so:
```javascript
{
  "a": "path/to/a",
  "b": "path/to/b"
}
```

or

```javascript
var stream = require("npm-amd")(options);
```

which will emit `{id: "a", path: "path/to/a"}` for each module
(this comes in handy to process each entry as it comes in, taking into account that browserifying takes it's time)

or just

```
node_modules/.bin/npm-amd
```

from the command line

options can be:

- `browserifyOptions: {/* browserify options */}`

- `force: true`, that disables the caching and rebrowserifies everything

- `from: "some/path"`, that resolves all the returned paths relative to that (by default it will resolve to absolute paths).

- `match: [/* minimatch patterns */]`, that makes use of [minimatch](https://github.com/isaacs/minimatch) to filter the installed node modules before processing them. This can be used to exclude certain modules (with the use of the negative operator, i.e: `"!grunt-*"`) or to only process a few select ones or both. Take into consideration the patterns will be applied in the order in which they are given.

- `storagePath: some/path`, that specifies a destination for bundled modules, defaults to `npm_amd_bundles`
