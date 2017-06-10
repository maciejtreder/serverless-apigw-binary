'use strict'

const express = require('express');
const compression = require('compression');
const cors = require('cors');
const bodyParser = require('body-parser');
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware');

const app = new express();

app.use(compression());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(awsServerlessExpressMiddleware.eventContext());

app.set('view engine', 'html');

app.use('/', express.static('dist', {index: false}));

app.get('/', (req,res) => {
    res.sendFile('dist/index.html', { root: __dirname });
});

module.exports = app;