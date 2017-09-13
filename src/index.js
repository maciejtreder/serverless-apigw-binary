class BinarySupport {
  constructor(serverless, options) {
    this.intervalMultiplexer = 1000;
    this.options = options || {};
    this.serverless = serverless;
    this.mimeTypes = this.serverless.service.custom.apigwBinary.types;
    this.provider = this.serverless.getProvider(this.serverless.service.provider.name);
    this.stage = this.options.stage || this.serverless.service.provider.stage;
    this.profile = this.options.profile || this.serverless.processedInput.options['aws-profile'] || this.serverless.service.provider.profile;
    this.region = this.options.region || this.serverless.service.provider.region;

    const sdk = this.provider.sdk;
    const credentials = new sdk.SharedIniFileCredentials({profile: this.profile});
    sdk.config.update({region: this.region, credentials: credentials});
    this.apiGWSdk = new sdk.APIGateway();

    this.cloudFormation = new sdk.CloudFormation();

    this.hooks = {
      'after:deploy:deploy': this.afterDeploy.bind(this)
    };
  }

  delay(t) {
    return new Promise(resolve => {
      setTimeout(resolve, t * this.intervalMultiplexer);
    });
  }

  putSwagger(apiId, swagger) {
    return new Promise(resolve => {
      this.apiGWSdk.putRestApi({
        restApiId: apiId,
        mode: 'merge',
        body: swagger
      }, (error, data) => {
        if (error)
          throw new Error(error.stack);
        this.serverless.cli.log("Uploaded swagger with mime types");
        resolve();
      })
    });
  }

  createDeployment(apiId) {
    return new Promise((resolve) => {
      this.apiGWSdk.createDeployment({restApiId: apiId, stageName: this.stage}, (error, data) => {
        if (error && error.code == 'TooManyRequestsException') {
          resolve(Math.round(parseFloat(error.retryDelay)) + 1)
        } else {
          this.serverless.cli.log("Your custom mime types are now supported!");
          resolve();
        }
      })
    });
  }

  getApiId() {
    return new Promise(resolve => {
      this.cloudFormation.describeStacks({StackName: this.provider.naming.getStackName(this.stage)}, (error, data) => {
        if (error) {
          throw new Error(error.stack);
        }
        const output = data.Stacks[0].Outputs;
        let apiUrl;
        output.filter(entry => entry.OutputKey.match('ServiceEndpoint')).forEach(entry => apiUrl = entry.OutputValue);
        const apiId = apiUrl.match('https:\/\/(.*)\\.execute-api')[1];
        resolve(apiId);
      });
    });
  }

  getApiGatewayName(){
    if(this.serverless.service.resources && this.serverless.service.resources.Resources){
      const Resources =  this.serverless.service.resources.Resources;
      for(let key in Resources){
        if(Resources.hasOwnProperty(key)){
          if(Resources[key].Type==='AWS::ApiGateway::RestApi'
              && Resources[key].Properties.Name){
            return  Resources[key].Properties.Name;
          }
        }
      }
    }
    return this.provider.naming.getApiGatewayName();
  }

  afterDeploy() {
    const swaggerInput = JSON.stringify({
      "swagger": "2.0",
      "info": {
        "title": this.getApiGatewayName()
      },
      "x-amazon-apigateway-binary-media-types": this.mimeTypes
    });

    return this.getApiId().then(apiId => {
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
