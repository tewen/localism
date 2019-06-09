const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const uuid = require('uuid');
const { isJsonString } = require('deep-cuts');

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

function simpleCache({ fn, transformFromFile, fileNameGenerator, cacheDirectoryPath = 'cache', uuidFileName = false } = {}) {
  if (_.isFunction(fn)) {
    return async (...args) => {
      const filePath = path.join(cacheDirectoryPath, chooseFileNameGenerator({ fileNameGenerator, uuidFileName })(...args));
      if (await fs.exists(filePath)) {
        const contents = await fs.readFile(filePath, 'utf-8');
        if (_.isFunction(transformFromFile)) {
          return transformFromFile(contents);
        }
        return isJsonString(contents) ? JSON.parse(contents) : contents;
      } else {
        const response = await fn(...args);
        await fs.mkdirp(cacheDirectoryPath);
        await fs.writeFile(filePath, _.isObject(response) ? JSON.stringify(response) : response);
        return response;
      }
    };
  } else {
    console.warn('You should pass a \'fn\' named param in order to create a cached function.'); // eslint-disable-line no-console
    return null;
  }
}

module.exports = {
  defaultFileNameGenerator,
  simpleCache
};
