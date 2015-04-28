//inspired by:
//https://github.com/bestander/deploy-azure-cdn
import azure from 'azure-storage';
import mime from 'mime';
import fsSync from 'fs';
import zlib from 'zlib';
import path from 'path';
import Promise from 'bluebird';

let fs = Promise.promisifyAll(fsSync);
Promise.promisifyAll(azure.BlobService.prototype);
let LinearRetryPolicyFilter = azure.LinearRetryPolicyFilter;
let map = Promise.map;

//
function getFileSizeAsync (path) {
  return fs.statAsync(path).then(stat => !stat.isDirectory() && stat.size);
}

//Erase all blobs under folder
async function eraseBlobsAsync (service, container, folder, concurrency, test, log) {
  let blobs = (await service.listBlobsSegmentedWithPrefixAsync(container, folder, null))[0];
  await map(blobs.entries, blob => test
    ? log(`deleted* ${blob.name}`)
    : service.deleteBlobAsync(container, blob.name)
      .then(() => log(`deleted ${blob.name}`))
  , {concurrency});
}

//gzip fileName and return file name for smallest version
async function gzipAndCompareAsync(fileName, size) {
  let gzip = zlib.createGzip({
    level: 9
  });
  let tmp = fileName + '.gz';
  let file = fs.createReadStream(fileName);
  let out = fs.createWriteStream(tmp);
  let writing = new Promise((res, rej) => {
    out.once('close', res);
    gzip.once('error', rej);
  });
  file.pipe(gzip).pipe(out);
  await writing;
  let compressedSize = await getFileSizeAsync(tmp);
  if (compressedSize > size) {
    await fs.unlinkAsync(tmp);
    return fileName;
  }
  return tmp;
}


export default async function upload({
    files = [],
    log = function () {},
    blobService = [],
    container = null,
    containerOptions = {publicAccessLevel: 'blob'},
    folder = '',
    erase = true,
    concurrency = 10,
    zip = false,
    metadata = {cacheControl: 'public, max-age=31556926'},
    test = false,}) {
  if (!container) throw new Error('Usage error: container must be set to the container name');
  let service = azure.createBlobService(...blobService)
        .withFilter(new LinearRetryPolicyFilter(100, 5));
  await service.createContainerIfNotExistsAsync(container, containerOptions);
  log(`Processing ${files.length} files (${concurrency} concurrently).`);
  if (erase) await eraseBlobsAsync(service, container, folder, concurrency, test, log);
  if (!files.length) return;
  return map(files, async function processFileAsync (file) {
    let fileName = file.path;
    let zipped = false;
    let remoteFileName = path.join(folder, path.relative(file.cwd, file.path));
    let meta = Object.assign({}, metadata);
    let size = await getFileSizeAsync(fileName);
    if (!size) return;
    meta.contentType = mime.lookup(fileName);
    if (zip) fileName = await gzipAndCompareAsync(fileName, size);
    if (fileName !== file.path) {
      zipped = true;
      meta.contentEncoding = 'gzip';
    }
    log(`Uploading ${remoteFileName}`);
    if (!test) await service.createBlockBlobFromLocalFileAsync(container, remoteFileName, fileName, meta)
                .finally(() => zipped && fs.unlinkAsync(fileName)); // always unlink tmp file
    if (test && zipped) await fs.unlinkAsync(fileName);
    log(`Uploaded ${remoteFileName}`);
  }, {concurrency});
}