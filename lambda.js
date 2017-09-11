const awsServerlessExpress = require('aws-serverless-express');
const app = require('./dist/app');

const server = awsServerlessExpress.createServer(app);

module.exports.express = (event, context) => awsServerlessExpress.proxy(server, event, context);
