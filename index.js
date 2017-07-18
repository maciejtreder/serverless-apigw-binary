'use strict';

const util = require('util')

class BinarySupport {
  constructor(serverless, options) {
    this.serverless = serverless;

    this.hooks = {
      'after:deploy:deploy': this.afterDeploy.bind(this)
    };
  }

  afterDeploy() {

    const provider = this.serverless.getProvider(this.serverless.service.provider.name);

    const apiName = this.serverless.getProvider(this.serverless.service.provider.name).naming.getApiGatewayName();
    const sdk = provider.sdk;
    sdk.config.update({region: this.serverless.service.provider.region});

    const apiGWSdk = new sdk.APIGateway();

    const swaggerInput = JSON.stringify({
      "swagger": "2.0",
      "info": {
        "title": apiName
      },
      "x-amazon-apigateway-binary-media-types": this.serverless.service.custom.apigwBinary.types
    });

    const deployMyAPI = restApiId => {
      apiGWSdk.createDeployment({ restApiId }, (err, data) => {
        if (err) throw new Error(err.stack);
      });
    };

    new Promise((resolve) => {
      var interval = setInterval(()=> {
        apiGWSdk.getRestApis(null, (err, data) => {
          if (err) throw new Error(err.stack);

          var api = data.items.filter(entry => entry.name == apiName)[0]
          apiGWSdk.getStages({ api.id }, (err, data) => {
            if (err) throw new Error(err.stack);
            var stage = data.items.filter(
              if(api != undefined) {
                resolve(api.id);
                resolve(api.id, stage.stageName);
                clearInterval(interval);
              }
            })
          })
      }, 1000);
    }).then(apiId => {
          apiGWSdk.putRestApi({
            restApiId: apiId,
            mode: 'merge',
            body: swaggerInput
          }, (err, data) => {
            if (err) throw new Exception(err.stack);
            deployMyAPI(apiId);
          });
    }).then(apiId, stageStageName) => {
          apiGWSdk.updateStage({
            restApiId: apiId,
            stageName: stageStageName
          }, (err, data) => {
            if (err) throw new Error(err.stack);
          });
    };
  }
}

module.exports = BinarySupport;
