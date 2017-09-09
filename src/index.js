'use strict';

const util = require('util')

class BinarySupport {
  constructor(serverless, options) {
    this.interval = 1000;
    this.serverless = serverless;
    this.options = options? options : {};
    this.mimeTypes = this.serverless.service.custom.apigwBinary.types;

    this.provider = this.serverless.getProvider(this.serverless.service.provider.name);

    const sdk = this.provider.sdk;
    sdk.config.update({region: this.serverless.service.provider.region});
    this.apiGWSdk = new sdk.APIGateway();

    this.hooks = {
      'after:deploy:deploy': this.afterDeploy.bind(this)
    };
  }

  afterDeploy() {
    const apiName = this.provider.naming.getApiGatewayName();

    const swaggerInput = JSON.stringify({
      "swagger": "2.0",
      "info": {
        "title": apiName
      },
      "x-amazon-apigateway-binary-media-types": this.mimeTypes
    });

    return new Promise((resolve, reject) => {
      var interval = setInterval(()=> {
        this.apiGWSdk.getRestApis(null, (err, data) => {
          if (err) {
            clearInterval(interval);
            reject(new Error(err.stack));
          } else {
            var api = data.items.filter(entry => entry.name == apiName)[0]
            if (api != undefined) {
              resolve(api.id);
              clearInterval(interval);
            }
          }
        })
      }, this.interval);
    }).then(apiId => {
          this.apiGWSdk.putRestApi({
            restApiId: apiId,
            mode: 'merge',
            body: swaggerInput
          }, (err, data) => {
            if (err) throw new Error(err.stack);
          });

        });
  }
}

module.exports = BinarySupport;
