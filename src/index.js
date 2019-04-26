'use strict';

class BinarySupport {
  constructor(serverless, options) {
    this.options = options || {};
    this.serverless = serverless;
    this.provider = this.serverless.getProvider(this.serverless.service.provider.name);
    this.hooks = {
      'after:deploy:deploy': this.afterDeploy.bind(this)
    };
  }

  getApiId(stage) {
    return new Promise((resolve, reject) => {
      this.provider.request('CloudFormation', 'describeStackResource', {
        LogicalResourceId: 'ApiGatewayRestApi',
        StackName: this.provider.naming.getStackName(stage)
      }).then(resp => resolve(resp.StackResourceDetail.PhysicalResourceId))
        .catch(err => {
          if (err.message.startsWith('Resource ApiGatewayRestApi does not exist for stack')) {
            resolve(false);
          } else {
            reject(err);
          }
        });
    });
  }

  putSwagger(apiId, swagger) {
    return this.provider.request('APIGateway', 'putRestApi', { restApiId: apiId, mode: 'merge', body: swagger });
  }

  createDeployment(apiId, stage) {
    return this.provider.request('APIGateway', 'createDeployment', { restApiId: apiId, stageName: stage });
  }

  getApiGatewayName() {
    if (this.serverless.service.resources && this.serverless.service.resources.Resources) {
      const Resources = this.serverless.service.resources.Resources;
      for (let key in Resources) {
        if (Resources.hasOwnProperty(key)) {
          if (Resources[key].Type === 'AWS::ApiGateway::RestApi'
            && Resources[key].Properties.Name) {
            return Resources[key].Properties.Name;
          }
        }
      }
    }
    return this.provider.naming.getApiGatewayName();
  }

  afterDeploy() {
    const mimeTypes = this.serverless.service.custom.apigwBinary.types;
    const swaggerInput = JSON.stringify({
      "swagger": "2.0",
      "info": {
        "title": this.getApiGatewayName()
      },
      "x-amazon-apigateway-binary-media-types": mimeTypes
    });
    const stage = this.options.stage || this.serverless.service.provider.stage;

    return this.getApiId(stage).then(apiId => {
      return apiId && this.putSwagger(apiId, swaggerInput).then(() => {
        return this.createDeployment(apiId, stage);
      });
    });
  }
}

module.exports = BinarySupport;
