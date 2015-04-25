import azure from 'azure-storage';
import mime from 'mime';
import fsSync from 'fs';
import zlib from 'zlib';
import path from 'path';
import Promise from 'bluebird';

let fs = Promise.promisifyAll(fsSync);
Promise.promisifyAll(azure.BlobService.prototype);
let logger = console.log.bind(console);

function getFileSizeAsync (path) {
  return fs.statAsync(path).then(stat => !stat.isDirectory() && stat.size);
}

async function gzipAndCompareAsync(fileName, size) {
  let gzip = zlib.createGzip({
    level: 9
  });
  let tmp = fileName + '.gz';
  let file = fs.createReadStream(fileName);
  let out = fs.createWriteStream(tmp);
  file.pipe(gzip).pipe(out);
  await new Promise((res, rej) => {
      gzip.once('error', rej);
      out.once('close',res);
  });
  let compressedSize = await getFileSizeAsync(tmp);
  if (compressedSize > size) {
    await fs.unlinkAsync(tmp);
    return fileName;
  }
  return tmp;
}

export default async function upload({
  files = [],
  log = logger,
  blobService = [],
  container = null,
  containerOptions = {publicAccessLevel: 'blob'},
  folder = '',
  erase = true,
  concurrency = 10,
  zip = false,
  metadata = {cacheControl: 'public, max-age=31556926'},
  test = false,
}) {
  if (!container) throw new Error('Usage error: container must be set to the container name');
  logger = log || logger;
  let service = azure.createBlobService(...blobService);
  await service.createContainerIfNotExistsAsync(container, containerOptions);
  if (erase) {
    let blobs = await service.listBlobsSegmentedWithPrefixAsync(container, folder);
    await Promise.all(blobs.entries.map(blob => test
        ? logger(`deleted ${blob.name}`)
        : service.deleteBlobAsync(container, blob.name)
          .then(() => logger(`deleted ${blob.name}`))));
  }
  if (!files.length) return;

  async function processFileAsync (file) {
    let fileName = file.path;
    let zipped = false;
    let relativePath = path.relative(file.cwd, file.path);
    let remoteFileName = path.join(folder, relativePath);
    let meta = Object.assign({}, metadata);
    let size = await getFileSizeAsync(fileName);
    if (!size) return null;
    meta.contentType = mime.lookup(fileName);
    if (zip) fileName = await gzipAndCompareAsync(fileName, size);
    if (fileName !== file.path) {
      zipped = true;
      meta.contentEncoding = 'gzip';
    }
    if (test) {
      logger(`Uploaded ${remoteFileName} as a ${meta.contentEncoding} file`);
    } else {
      logger(`Uploading ${remoteFileName} as a ${meta.contentEncoding} file`);
      await service.createBlockBlobFromLocalFileAsync(container, remoteFileName, fileName, meta)
              .finally(() => zipped && fs.unlinkAsync(fileName));
      logger(`Uploaded ${remoteFileName} as a ${meta.contentEncoding} file`);
    }
  }
  await Bluebird.map(files, processFileAsync, {concurrency});
}