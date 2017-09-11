const express = require('express');
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware');

const app = new express();

app.use(awsServerlessExpressMiddleware.eventContext());
app.set('view engine', 'html');

app.use('/', express.static('dist', {index: false}));

app.get('/', (req,res) => {
    res.sendFile('index.html', { root: __dirname });
});

module.exports = app;