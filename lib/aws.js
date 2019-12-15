const _ = require('lodash');
const { S3 } = require('aws-sdk');
const UploadStream = require('streaming-s3');
const downloadStream = require('s3-download-stream');

const DEFAULT_S3_CREDENTIALS = {
  s3BucketEndpoint: false,
  endpoint: 'https://s3.amazonaws.com'
};

function validateS3Credentials(s3Credentials, bucket) {
  if (!_.get(s3Credentials, 'accessKeyId') || !_.get(s3Credentials, 'secretAccessKey') || !_.get(s3Credentials, 'region')) {
    throw new Error('You must pass in accessKeyId, secretAccessKey, and region properties with your s3 credentials.');
  }
  if (!bucket) {
    throw new Error('You must pass in an s3Bucket parameter to the simple cache in order to use the s3 cache feature.');
  }
}

function putFileOnS3({ s3Credentials, bucket, key, fileStream, contentType = 'text/plain' }) { // eslint-disable-line no-unused-vars
  validateS3Credentials(s3Credentials, bucket);
  const myS3Credentials = _.defaults(s3Credentials, DEFAULT_S3_CREDENTIALS);
  return new Promise((resolve, reject) => {
    new UploadStream(fileStream, myS3Credentials, { // eslint-disable-line no-new
      Bucket: bucket,
      Key: key,
      ContentType: contentType
    }, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          bucket,
          key
        });
      }
    });
  });
}

function getFileFromS3({ s3Credentials, bucket, key, writeStream }) { // eslint-disable-line no-unused-vars
  validateS3Credentials(s3Credentials , bucket);
  const myS3Credentials = _.defaults(s3Credentials, DEFAULT_S3_CREDENTIALS);
  return new Promise((resolve, reject) => {
    const download = downloadStream({
      client: new S3(myS3Credentials),
      concurrency: 6,
      params: {
        Key: key,
        Bucket: bucket
      }
    });
    download.on('error', (err) => reject(err));
    download.on('end', _.ary(resolve, 0));
    download.pipe(writeStream);
  });
}

module.exports = {
  putFileOnS3,
  getFileFromS3
};
