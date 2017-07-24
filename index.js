'use strict';

const util = require('util');

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

    // should use async.waterfall to solve this kind of callback hell
    const updateStage = ({ restApiId, deploymentId, stageName }) => {
      setTimeout(() => {
        const req = {
          restApiId: restApiId,
          stageName: stageName,
          patchOperations: [{
            op: "replace",
            path: "/deploymentId",
            value: deploymentId
          }],
        }
        console.log('request: ' + JSON.stringify(req));
        apiGWSdk.updateStage(req, (err, data) => {
          if(err) throw new Error(err, err.stack);
          else console.log(data);
        });
      }, 2000);
    };

    const retrieveLatestDeploymentId = ({ restApiId, stageName }) => {
      setTimeout(() => {
        apiGWSdk.getDeployments({ restApiId }, (err, data) => {
          if(err) {
            throw new Error(err, err.stack);
          } else {
            const deploymentId = data.items.sort((e1, e2) => {
              if(e1.createdDate > e2.createdDate) {
                return 1;
              } else if(e1.createdDate === e2.createdDate) {
                return 0;
              } else {
                return -1;
              }
            }).pop().id;
            console.log('deploymentId: ' + deploymentId);
            updateStage({ restApiId, deploymentId, stageName });
          }
        });
      }, 2000);
    };

    const retrieveStageName = restApiId => {
      setTimeout(() => {
        apiGWSdk.getStages({ restApiId }, (err, data) => {
          if(err) {
            throw new Error(err, err.stack);
          } else {
            const stageName = data.item.sort((e1, e2) => {
                if(e1.lastUpdatedDate > e2.lastUpdatedDate) {
                  return 1;
                } else if(e1.lastUpdatedDate === e2.lastUpdatedDate) {
                  return 0;
                } else {
                  return -1;
                }
              }).map(en => en.stageName).pop();
            console.log('stageName: ' + stageName);
            retrieveLatestDeploymentId({ restApiId, stageName });
          }
        });
      }, 2000);
    };

    const deploy = restApiId => {
      setTimeout(() => {
        apiGWSdk.createDeployment({ restApiId }, (err, data) => {
          if (err) throw new Error(err.stack);
          else retrieveStageName(restApiId);
        });
      }, 2000);
    };

    new Promise((resolve) => {
      var interval = setInterval(()=> {
        apiGWSdk.getRestApis(null, (err, data) => {
          if (err) throw new Error(err.stack);

          var api = data.items.filter(entry => entry.name == apiName)[0]
          if(api != undefined) {
            resolve(api.id);
            clearInterval(interval);
          }
        })
      }, 2000);
    }).then(apiId => {
      setTimeout(() => {
          apiGWSdk.putRestApi({
            restApiId: apiId,
            mode: 'merge',
            body: swaggerInput
          }, (err, data) => {
            if (err) throw new Exception(err.stack);
            deploy(apiId);
          });
      }, 2000);
    });

  }
}

module.exports = BinarySupport;
