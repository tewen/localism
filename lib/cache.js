const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const uuid = require('uuid');
const { isJsonString } = require('deep-cuts');
const { putFile, getFile } = require('./third-party/aws-filestore');

const arrayName = (ar) => `array-${_.size(ar)}`;
const objectName = (obj) => `object-${_.chain(obj).keys().size().value()}`;

function defaultFileNameGenerator(...args) {
  if (_.isEmpty(args)) {
    return 'no-parameters';
  } else if (_.size(args) === 1) {
    const firstArg = _.first(args);
    if (_.isArray(firstArg)) {
      return arrayName(firstArg);
    } else if (_.isObject(firstArg)) {
      return _.chain(args[0])
        .toPairs()
        .sortBy(([k]) => k)
        .slice(0, 4)
        .map(([k, v]) => {
          if (_.isArray(v)) {
            return [k, arrayName(v)];
          } else if (_.isObject(v)) {
            return [k, objectName(v)];
          }
          return [k, v];
        })
        .map(([k, v]) => [k, v].join('='))
        .join('&')
        .value();
    } else {
      return String(firstArg);
    }
  } else {
    return _.replace(`${defaultFileNameGenerator(_.first(args))}__${defaultFileNameGenerator(..._.tail(args))}`, /\s/g, '');
  }
}

function chooseFileNameGenerator({ fileNameGenerator, uuidFileName }) {
  return (...args) => {
    if (uuidFileName) {
      return uuid.v4();
    } else if (_.isFunction(fileNameGenerator)) {
      return fileNameGenerator(...args);
    } else {
      return defaultFileNameGenerator(...args);
    }
  };
}

function stringifyIfNecessary(response) {
  return _.isObject(response) ? JSON.stringify(response) : response;
}

function transformFileContents(contents, transformFromFile = null) {
  if (_.isFunction(transformFromFile)) {
    return transformFromFile(contents);
  }
  return isJsonString(contents) ? JSON.parse(contents) : contents;
}

async function getFileFromS3(s3Credentials, s3Bucket, s3FilePath) {
  const directoryPath = path.join(__dirname, 'tmp');
  const filePath = path.join(directoryPath, uuid.v4());
  await fs.mkdirp(directoryPath);
  try {
    await getFile({
      s3Credentials,
      bucket: s3Bucket,
      key: s3FilePath,
      writeStream: fs.createWriteStream(filePath)
    });
  } catch (e) {
    // NOTE - In this case, there is no file, so we just move on
    await fs.remove(filePath);
    return undefined;
  }
  const contents = await fs.readFile(filePath, 'utf-8');
  await fs.remove(filePath);
  return contents;
}

async function putFileOnS3(s3Credentials, s3Bucket, s3FilePath, contents) {
  const directoryPath = path.join(__dirname, 'tmp');
  const filePath = path.join(directoryPath, uuid.v4());
  await fs.mkdirp(directoryPath);
  await fs.writeFile(filePath, contents);
  await putFile({
    s3Credentials,
    bucket: s3Bucket,
    key: s3FilePath,
    fileStream: fs.createReadStream(filePath)
  });
  return fs.remove(filePath);
}

function simpleCache({ fn, transformFromFile, fileNameGenerator, s3Credentials, s3Bucket, cacheDirectoryPath = 'cache', uuidFileName = false } = {}) {
  if (_.isFunction(fn)) {
    const cachedFn = async (...args) => {
      const filePath = path.join(cacheDirectoryPath, chooseFileNameGenerator({
        fileNameGenerator,
        uuidFileName
      })(...args));
      const s3FileContents = !_.isEmpty(s3Credentials) && (await getFileFromS3(s3Credentials, s3Bucket, filePath));
      if (s3FileContents) {
        return transformFileContents(s3FileContents, transformFromFile);
      } else if (await fs.exists(filePath)) {
        return transformFileContents(await fs.readFile(filePath, 'utf-8'), transformFromFile);
      } else {
        const response = await fn(...args);
        if (!_.isEmpty(s3Credentials)) {
          await putFileOnS3(s3Credentials, s3Bucket, filePath, stringifyIfNecessary(response));
        } else {
          await fs.mkdirp(cacheDirectoryPath);
          await fs.writeFile(filePath, stringifyIfNecessary(response));
        }
        return response;
      }
    };
    cachedFn.hasKey = async (...args) => {
      const filePath = path.join(cacheDirectoryPath, chooseFileNameGenerator({
        fileNameGenerator,
        uuidFileName
      })(...args));
      const s3FileContents = !_.isEmpty(s3Credentials) && (await getFileFromS3(s3Credentials, s3Bucket, filePath));
      return s3FileContents || fs.exists(filePath);
    };
    return cachedFn;
  } else {
    console.warn('You should pass a \'fn\' named param in order to create a cached function.'); // eslint-disable-line no-console
    return null;
  }
}

module.exports = {
  defaultFileNameGenerator,
  getFileFromS3,
  putFileOnS3,
  simpleCache
};
