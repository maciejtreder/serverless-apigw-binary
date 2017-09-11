'use strict';

const util = require('util')

class BinarySupport {
  constructor(serverless, options) {
    this.interval = 1000;
    this.serverless = serverless;
    this.options = options? options : {};
    this.mimeTypes = this.serverless.service.custom.apigwBinary.types;
    this.provider = this.serverless.getProvider(this.serverless.service.provider.name);
    this.stage = this.serverless.processedInput.options.stage || this.serverless.service.provider.stage;
    this.profile = this.serverless.processedInput.options.profile || this.serverless.processedInput.options['aws-profile'] || this.serverless.service.provider.profile;
    this.region = this.serverless.processedInput.options.region || this.serverless.service.provider.region;

    const sdk = this.provider.sdk;
    const credentials = new sdk.SharedIniFileCredentials({profile: this.profile});
    sdk.config.update({region: this.region, credentials: credentials});
    this.apiGWSdk = new sdk.APIGateway();

    this.hooks = {
      'after:deploy:deploy': this.afterDeploy.bind(this)
    };
  }


  delay(t) {
    return new Promise(resolve => {
      setTimeout(resolve, t * 1000);
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

  getApiId(apiName, tryCount, delay) {
    return new Promise((resolve) => {
      if (tryCount <= 0) {
        throw new Error("Exceed try counts");
      }
      this.apiGWSdk.getRestApis(null, (err, data) => {
        if(err) {
          throw new Error(err.stack);
        }
        var api = data.items.filter(entry => entry.name == apiName)[0]
        if(api != undefined) {
          resolve(api.id);
        } else {
          return this.delay(delay).then(() => this.getApiId(apiName, tryCount-1, delay))
        }
      });
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

    return this.getApiId(apiName, 3, 3).then(apiId => {
      return this.putSwagger(apiId, swaggerInput).then(() => {
        return this.createDeployment(apiId).then((delay) => {
          if(delay) {
            this.serverless.cli.log("First redeployment was not succesfull. Retry in " + delay + " seconds.");
            return this.delay(delay).then(()=> {
              return this.createDeployment(apiId);
            });
          }
        });
      });
    });
  }
}

module.exports = BinarySupport;
