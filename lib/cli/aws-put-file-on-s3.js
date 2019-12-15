#!/usr/bin/env node

const commandLineArgs = require('command-line-args'); // eslint-disable-line node/shebang
const fs = require('fs-extra');
const { putFileOnS3 } = require('../aws');

async function main() {
  const options = commandLineArgs([
    {
      name: 'accessKeyId',
      type: String
    },
    {
      name: 'secretAccessKey',
      type: String
    },
    {
      name: 'region',
      type: String
    },
    {
      name: 'bucket',
      type: String
    },
    {
      name: 'file',
      type: String
    },
    {
      name: 'input',
      type: String
    }
  ]);

  const { accessKeyId, secretAccessKey, region, bucket, file, input } = options;

  if (accessKeyId && secretAccessKey && region && bucket && file && input) {
    try {
      await putFileOnS3({
        s3Credentials: {
          accessKeyId,
          secretAccessKey,
          region
        },
        bucket,
        key: file,
        fileStream: fs.createReadStream(input)
      });
      console.log(`Successfully put file: ${input}`); // eslint-disable-line no-console
    } catch (e) {
      console.error(e); // eslint-disable-line no-console
    }
  } else {
    console.error('You must provide --accessKeyId, --secretAccessKey, --region, --bucket, --file, and --input options to use this command.'); // eslint-disable-line no-console
  }
}

main();
