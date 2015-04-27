'use strict';

var _toConsumableArray = require('babel-runtime/helpers/to-consumable-array')['default'];

var _Object$defineProperty = require('babel-runtime/core-js/object/define-property')['default'];

var _Object$assign = require('babel-runtime/core-js/object/assign')['default'];

var _regeneratorRuntime = require('babel-runtime/regenerator')['default'];

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

_Object$defineProperty(exports, '__esModule', {
  value: true
});

exports['default'] = upload;
//inspired by:
//https://github.com/bestander/deploy-azure-cdn

var _azure = require('azure-storage');

var _azure2 = _interopRequireDefault(_azure);

var _mime = require('mime');

var _mime2 = _interopRequireDefault(_mime);

var _fsSync = require('fs');

var _fsSync2 = _interopRequireDefault(_fsSync);

var _zlib = require('zlib');

var _zlib2 = _interopRequireDefault(_zlib);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _Promise = require('bluebird');

var _Promise2 = _interopRequireDefault(_Promise);

var LinearRetryPolicyFilter = _azure2['default'].LinearRetryPolicyFilter;
var map = _Promise2['default'].map;
var fs = _Promise2['default'].promisifyAll(_fsSync2['default']);
_Promise2['default'].promisifyAll(_azure2['default'].BlobService.prototype);
var logger = console.log.bind(console);

function getFileSizeAsync(path) {
  return fs.statAsync(path).then(function (stat) {
    return !stat.isDirectory() && stat.size;
  });
}

function eraseBlobsAsync(service, container, folder, concurrency, test) {
  var blobs;
  return _regeneratorRuntime.async(function eraseBlobsAsync$(context$1$0) {
    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        logger('Erasing records...');
        context$1$0.next = 3;
        return service.listBlobsSegmentedWithPrefixAsync(container, folder, null, null);

      case 3:
        blobs = context$1$0.sent[0];
        context$1$0.next = 6;
        return map(blobs.entries, function (blob) {
          return test ? logger('deleted* ' + blob.name) : service.deleteBlobAsync(container, blob.name).then(function () {
            return logger('deleted ' + blob.name);
          });
        }, { concurrency: concurrency });

      case 6:
      case 'end':
        return context$1$0.stop();
    }
  }, null, this);
}

function gzipAndCompareAsync(fileName, size) {
  var gzip, tmp, file, out, writing, compressedSize;
  return _regeneratorRuntime.async(function gzipAndCompareAsync$(context$1$0) {
    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        gzip = _zlib2['default'].createGzip({
          level: 9
        });
        tmp = fileName + '.gz';
        file = fs.createReadStream(fileName);
        out = fs.createWriteStream(tmp);
        writing = new _Promise2['default'](function (res, rej) {
          out.once('close', res);
          gzip.once('error', rej);
        });

        file.pipe(gzip).pipe(out);
        context$1$0.next = 8;
        return writing;

      case 8:
        context$1$0.next = 10;
        return getFileSizeAsync(tmp);

      case 10:
        compressedSize = context$1$0.sent;

        if (!(compressedSize > size)) {
          context$1$0.next = 15;
          break;
        }

        context$1$0.next = 14;
        return fs.unlinkAsync(tmp);

      case 14:
        return context$1$0.abrupt('return', fileName);

      case 15:
        return context$1$0.abrupt('return', tmp);

      case 16:
      case 'end':
        return context$1$0.stop();
    }
  }, null, this);
}

function upload(_ref) {
  var _ref$files = _ref.files;
  var files = _ref$files === undefined ? [] : _ref$files;
  var _ref$log = _ref.log;
  var log = _ref$log === undefined ? logger : _ref$log;
  var _ref$blobService = _ref.blobService;
  var blobService = _ref$blobService === undefined ? [] : _ref$blobService;
  var _ref$container = _ref.container;
  var container = _ref$container === undefined ? null : _ref$container;
  var _ref$containerOptions = _ref.containerOptions;
  var containerOptions = _ref$containerOptions === undefined ? { publicAccessLevel: 'blob' } : _ref$containerOptions;
  var _ref$folder = _ref.folder;
  var folder = _ref$folder === undefined ? '' : _ref$folder;
  var _ref$erase = _ref.erase;
  var erase = _ref$erase === undefined ? true : _ref$erase;
  var _ref$concurrency = _ref.concurrency;
  var concurrency = _ref$concurrency === undefined ? 10 : _ref$concurrency;
  var _ref$zip = _ref.zip;
  var zip = _ref$zip === undefined ? false : _ref$zip;
  var _ref$metadata = _ref.metadata;
  var metadata = _ref$metadata === undefined ? { cacheControl: 'public, max-age=31556926' } : _ref$metadata;
  var _ref$test = _ref.test;
  var test = _ref$test === undefined ? false : _ref$test;
  var service, processFileAsync;
  return _regeneratorRuntime.async(function upload$(context$1$0) {
    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        processFileAsync = function processFileAsync(file) {
          var fileName, zipped, remoteFileName, meta, size;
          return _regeneratorRuntime.async(function processFileAsync$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
              case 0:
                fileName = file.path;
                zipped = false;
                remoteFileName = _path2['default'].join(folder, _path2['default'].relative(file.cwd, file.path));
                meta = _Object$assign({}, metadata);
                context$2$0.next = 6;
                return getFileSizeAsync(fileName);

              case 6:
                size = context$2$0.sent;

                if (size) {
                  context$2$0.next = 9;
                  break;
                }

                return context$2$0.abrupt('return');

              case 9:
                meta.contentType = _mime2['default'].lookup(fileName);

                if (!zip) {
                  context$2$0.next = 14;
                  break;
                }

                context$2$0.next = 13;
                return gzipAndCompareAsync(fileName, size);

              case 13:
                fileName = context$2$0.sent;

              case 14:
                if (fileName !== file.path) {
                  zipped = true;
                  meta.contentEncoding = 'gzip';
                }

                if (!test) {
                  context$2$0.next = 22;
                  break;
                }

                logger('Uploaded ' + remoteFileName + ' as a ' + (meta.contentEncoding || '') + ' file');

                if (!zipped) {
                  context$2$0.next = 20;
                  break;
                }

                context$2$0.next = 20;
                return fs.unlinkAsync(fileName);

              case 20:
                context$2$0.next = 26;
                break;

              case 22:
                logger('Uploading ' + remoteFileName + ' as a ' + meta.contentEncoding + ' file');
                context$2$0.next = 25;
                return service.createBlockBlobFromLocalFileAsync(container, remoteFileName, fileName, meta)['finally'](function () {
                  return zipped && fs.unlinkAsync(fileName);
                });

              case 25:
                logger('Uploaded ' + remoteFileName + ' as a ' + meta.contentEncoding + ' file');

              case 26:
              case 'end':
                return context$2$0.stop();
            }
          }, null, this);
        };

        if (container) {
          context$1$0.next = 3;
          break;
        }

        throw new Error('Usage error: container must be set to the container name');

      case 3:
        logger = log;
        service = _azure2['default'].createBlobService.apply(_azure2['default'], _toConsumableArray(blobService)).withFilter(new LinearRetryPolicyFilter(100, 5));
        context$1$0.next = 7;
        return service.createContainerIfNotExistsAsync(container, containerOptions);

      case 7:
        console.log('Processing ' + files.length + ' files (' + concurrency + ' concurrently).');

        if (!erase) {
          context$1$0.next = 11;
          break;
        }

        context$1$0.next = 11;
        return eraseBlobsAsync(service, container, folder, concurrency, test);

      case 11:
        if (files.length) {
          context$1$0.next = 13;
          break;
        }

        return context$1$0.abrupt('return');

      case 13:
        context$1$0.next = 15;
        return map(files, processFileAsync, { concurrency: concurrency });

      case 15:
      case 'end':
        return context$1$0.stop();
    }
  }, null, this);
}

module.exports = exports['default'];
