'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

//Erase all blobs under folder
var eraseBlobsAsync = function () {
  var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(service, container, folder, concurrency, test, log) {
    var blobs;
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return service.listBlobsSegmentedWithPrefixAsync(container, folder, null);

          case 2:
            blobs = _context.sent[0];
            _context.next = 5;
            return map(blobs.entries, function (blob) {
              return test ? log(`deleted* ${blob.name}`) : service.deleteBlobAsync(container, blob.name).then(function () {
                return log(`deleted ${blob.name}`);
              });
            }, { concurrency });

          case 5:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function eraseBlobsAsync(_x, _x2, _x3, _x4, _x5, _x6) {
    return _ref.apply(this, arguments);
  };
}();

//gzip fileName and return file name for smallest version


var gzipAndCompareAsync = function () {
  var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(fileName, size) {
    var gzip, tmp, file, out, writing, compressedSize;
    return _regenerator2.default.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            gzip = _zlib2.default.createGzip({
              level: 9
            });
            tmp = fileName + '.gz';
            file = fs.createReadStream(fileName);
            out = fs.createWriteStream(tmp);
            writing = new _bluebird2.default(function (res, rej) {
              out.once('close', res);
              gzip.once('error', rej);
            });

            file.pipe(gzip).pipe(out);
            _context2.next = 8;
            return writing;

          case 8:
            _context2.next = 10;
            return getFileSizeAsync(tmp);

          case 10:
            compressedSize = _context2.sent;

            if (!(compressedSize > size)) {
              _context2.next = 15;
              break;
            }

            _context2.next = 14;
            return fs.unlinkAsync(tmp);

          case 14:
            return _context2.abrupt('return', fileName);

          case 15:
            return _context2.abrupt('return', tmp);

          case 16:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function gzipAndCompareAsync(_x7, _x8) {
    return _ref2.apply(this, arguments);
  };
}();

var _azureStorage = require('azure-storage');

var _azureStorage2 = _interopRequireDefault(_azureStorage);

var _mime = require('mime');

var _mime2 = _interopRequireDefault(_mime);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _zlib = require('zlib');

var _zlib2 = _interopRequireDefault(_zlib);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//inspired by:
//https://github.com/bestander/deploy-azure-cdn
var fs = _bluebird2.default.promisifyAll(_fs2.default);
_bluebird2.default.promisifyAll(_azureStorage2.default.BlobService.prototype);
var LinearRetryPolicyFilter = _azureStorage2.default.LinearRetryPolicyFilter;
var map = _bluebird2.default.map;

//
function getFileSizeAsync(path) {
  return fs.statAsync(path).then(function (stat) {
    return !stat.isDirectory() && stat.size;
  });
}
exports.default = function () {
  var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(_ref3) {
    var _ref3$files = _ref3.files,
        files = _ref3$files === undefined ? [] : _ref3$files,
        _ref3$log = _ref3.log,
        log = _ref3$log === undefined ? function () {} : _ref3$log,
        _ref3$blobService = _ref3.blobService,
        blobService = _ref3$blobService === undefined ? [] : _ref3$blobService,
        _ref3$container = _ref3.container,
        container = _ref3$container === undefined ? null : _ref3$container,
        _ref3$containerOption = _ref3.containerOptions,
        containerOptions = _ref3$containerOption === undefined ? { publicAccessLevel: 'blob' } : _ref3$containerOption,
        _ref3$folder = _ref3.folder,
        folder = _ref3$folder === undefined ? '' : _ref3$folder,
        _ref3$erase = _ref3.erase,
        erase = _ref3$erase === undefined ? true : _ref3$erase,
        _ref3$concurrency = _ref3.concurrency,
        concurrency = _ref3$concurrency === undefined ? 10 : _ref3$concurrency,
        _ref3$zip = _ref3.zip,
        zip = _ref3$zip === undefined ? false : _ref3$zip,
        _ref3$metadata = _ref3.metadata,
        metadata = _ref3$metadata === undefined ? { cacheControl: 'public, max-age=31556926' } : _ref3$metadata,
        _ref3$test = _ref3.test,
        test = _ref3$test === undefined ? false : _ref3$test;
    var service;
    return _regenerator2.default.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            if (container) {
              _context4.next = 2;
              break;
            }

            throw new Error('Usage error: container must be set to the container name');

          case 2:
            service = _azureStorage2.default.createBlobService.apply(_azureStorage2.default, (0, _toConsumableArray3.default)(blobService)).withFilter(new LinearRetryPolicyFilter(100, 5));
            _context4.next = 5;
            return service.createContainerIfNotExistsAsync(container, containerOptions);

          case 5:
            log(`Processing ${files.length} files (${concurrency} concurrently).`);

            if (!erase) {
              _context4.next = 9;
              break;
            }

            _context4.next = 9;
            return eraseBlobsAsync(service, container, folder, concurrency, test, log);

          case 9:
            if (files.length) {
              _context4.next = 11;
              break;
            }

            return _context4.abrupt('return');

          case 11:
            return _context4.abrupt('return', map(files, function () {
              var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(file) {
                var fileName, zipped, remoteFileName, meta, size;
                return _regenerator2.default.wrap(function _callee3$(_context3) {
                  while (1) {
                    switch (_context3.prev = _context3.next) {
                      case 0:
                        fileName = file.path;
                        zipped = false;
                        remoteFileName = _path2.default.join(folder, _path2.default.relative(file.cwd, file.path));
                        meta = (0, _assign2.default)({}, metadata);
                        _context3.next = 6;
                        return getFileSizeAsync(fileName);

                      case 6:
                        size = _context3.sent;

                        if (size) {
                          _context3.next = 9;
                          break;
                        }

                        return _context3.abrupt('return');

                      case 9:
                        meta.contentType = _mime2.default.lookup(fileName);

                        if (!zip) {
                          _context3.next = 14;
                          break;
                        }

                        _context3.next = 13;
                        return gzipAndCompareAsync(fileName, size);

                      case 13:
                        fileName = _context3.sent;

                      case 14:
                        if (fileName !== file.path) {
                          zipped = true;
                          meta.contentEncoding = 'gzip';
                        }
                        log(`Uploading ${remoteFileName}`);

                        if (test) {
                          _context3.next = 19;
                          break;
                        }

                        _context3.next = 19;
                        return service.createBlockBlobFromLocalFileAsync(container, remoteFileName, fileName, meta).finally(function () {
                          return zipped && fs.unlinkAsync(fileName);
                        });

                      case 19:
                        if (!(test && zipped)) {
                          _context3.next = 22;
                          break;
                        }

                        _context3.next = 22;
                        return fs.unlinkAsync(fileName);

                      case 22:
                        log(`Uploaded ${remoteFileName}`);

                      case 23:
                      case 'end':
                        return _context3.stop();
                    }
                  }
                }, _callee3, this);
              }));

              function processFileAsync(_x10) {
                return _ref5.apply(this, arguments);
              }

              return processFileAsync;
            }(), { concurrency }));

          case 12:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));

  function upload(_x9) {
    return _ref4.apply(this, arguments);
  }

  return upload;
}();
