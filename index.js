'use strict';

class BinarySupport {
  constructor(serverless, options) {
    this.serverless = serverless;

    this.hooks = {
      'before:deploy:deploy': this.beforeDeploy.bind(this),
    };
  }

  beforeDeploy() {
    this.serverless.service.provider.compiledCloudFormationTemplate.Resources.ApiGatewayRestApi.Properties.Body = {
      "swagger": "2.0",
      "x-amazon-apigateway-binary-media-types": this.serverless.service.custom.binarySupport.types
    };
  }
}

module.exports = BinarySupport;
