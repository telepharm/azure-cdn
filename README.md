## azure-cdn

Deploy static assets to azure blob storage for consumption via cdn.

```javascript
var uploadToAzure = require('azure-cdn');

uploadToAzure({
  blobService: [ ... ],                                 // arguments for azure#createBlobService
  container: null,                                      // the container name
  containerOptions: {publicAccessLevel: 'blob'},        // container creation options (createContainerIfNotExists)
  folder: '',                                           // prefix for all blobs  
  metadata: {cacheControl: 'public, max-age=31556926'}, // applied to each blob
  concurrency: 10                                       // number of active network requests with azure
  erase: true,                                          // erase all blobs in container/folder before uploading
  zip: true,                                            // gzip all blobs (use smallest)
  test: true,                                           // test run
  log: function () {},                                  // log current operations
  files: [                                              // file list
    { cwd: './public', 
      path: '/user/test/project/public/index.html' }    // => cdn.com/myContainer/folder/index.html
    ...
  ]
})
.then(function () { ... })
.catch(function (error) { ... });
```

### Grunt

An example grunt task. Where files are provided by the `src` field in grunt options

```javascript
var upload = require('azure-cdn');
var path = require('path');

module.exports = function (grunt) {
  grunt.registerMultiTask('azure-cdn', 'Copy files to an azure storage blob', function () {
    var asyncTask = this.async();
    var options = this.options();
    options.log = grunt.log.debug;
    options.files = Array.prototype.concat.apply([], this.files.map(function (glob) {
      return glob.src.map(function (file) {
        return {path: path.resolve(glob.cwd, file), cwd: glob.cwd};
      });
    }));
    upload(options).then(asyncTask)
      .catch(function (err) {
        grunt.log.error('Error while copying files to azure ' + err);
        asyncTask(false);
      });
  });
};
```