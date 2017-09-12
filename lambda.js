const awsServerlessExpress = require('aws-serverless-express');
const app = require('./dist/app');
const binaryMimeTypes = [
    'image/gif'
];

const server = awsServerlessExpress.createServer(app, null, binaryMimeTypes);

module.exports.express = (event, context) => awsServerlessExpress.proxy(server, event, context);