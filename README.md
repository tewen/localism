## Localism

Local development tools. Not for production, just to make you more PRODUCTIVE.

### Installation

```BASH
npm install -g localism
npm install --save localism
```

### Getting Started

Just require the module, every method lives at the top level.

```JavaScript
const { simpleCache } = require('localism');

const cacheFn = simpleCache({fn: myAsyncFunction });
```

### Methods

#### getFileFromS3({s3Credentials, bucket, key, fileStream, contentType = 'text/plain'})

Retrieves the file from the bucket at the key and writes it to the stream provided. 


#### putFileOnS3({s3Credentials, bucket, key, fileStream, contentType = 'text/plain'})

Places the file into the bucket at the key and reads it from the stream provided.


#### simpleCache({fn, [transformFromFile, fileNameGenerator, cacheDirectoryPath, uuidFileName]})

Wraps a given method to create a cache that writes to the local file system. The huge local development advantage is the ability to read and review responses, while keeping the cache from relying on what's in memory.

```JavaScript
// This is made for async functions

const cachedFn = simpleCache({fn: myAsyncFunction, cacheDirectoryPath: 'tmp/local/cache'});

const response = await cachedFn({red: 2, green: 6, blue: false});

// The above response will be saved to a file and then accessed from there on future calls
```

### Contribution Guidelines

Fork the respository and install all the dependencies:

```BASH
npm install
```

Make sure to run the unit tests (and lint) before committing. Obviously, add to the tests as you make changes:

```BASH
npm run test
```

For watch:

```BASH
npm run test:watch
```

