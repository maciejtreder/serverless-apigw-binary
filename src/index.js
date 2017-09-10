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

  delay(t) {
    return new Promise(resolve => {
      setTimeout(resolve, t);
    });
  }

  putSwagger(apiId, swagger) {
    return new Promise(resolve => {
      this.apiGWSdk.putRestApi({
        restApiId: apiId,
        mode: 'merge',
        body: swagger
      }, (err, data) => {
        if (err)
          throw new Error(err.stack);
        this.serverless.cli.log("Uploaded swagger with mime types");
        resolve();
      })
    });
  }

  createDeployment(apiId) {
    return new Promise((resolve) => {
      this.apiGWSdk.createDeployment({restApiId: apiId, stageName: this.serverless.service.provider.stage}, (error, data) => {
        if (error && error.code == 'TooManyRequestsException') {
          resolve(Math.round(parseFloat(error.retryDelay)) + 1)
        } else {
          this.serverless.cli.log("Your custom mime types are now supported!");
          resolve();
        }
      })
    });
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

          return this.putSwagger(apiId, swaggerInput).then(() => {
            return this.createDeployment(apiId).then((delay) => {
              if(delay) {
                this.serverless.cli.log("First redeployment was not succesfull. Retry in " + delay + " seconds.");
                return this.delay(delay * 1000).then(()=> {
                  return this.createDeployment(apiId);
                });
              }
            });
          });
        });
  }
}

module.exports = BinarySupport;
