#!/usr/bin/env node

const commandLineArgs = require('command-line-args'); // eslint-disable-line node/shebang
const fs = require('fs-extra');
const path = require('path');
const { getFile } = require('./aws-filestore');

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
      name: 'output',
      type: String
    }
  ]);

  const { accessKeyId, secretAccessKey, region, bucket, file, output } = options;

  if (accessKeyId && secretAccessKey && region && bucket && file && output) {
    await fs.mkdirp(path.dirname(output));
    try {
      await getFile({
        s3Credentials: {
          accessKeyId,
          secretAccessKey,
          region
        },
        bucket,
        key: file,
        writeStream: fs.createWriteStream(output)
      });
      console.log(`Successfully retrieved file: ${output}`); // eslint-disable-line no-console
    } catch (e) {
      console.error(e); // eslint-disable-line no-console
    }
  } else {
    console.error('You must provide --accessKeyId, --secretAccessKey, --region, --bucket, --file, and --output options to use this command.'); // eslint-disable-line no-console
  }
}

main();
