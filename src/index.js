class BinarySupport {
  constructor(serverless, options) {
    this.options = options || {};
    this.serverless = serverless;
    this.mimeTypes = this.serverless.service.custom.apigwBinary.types;
    this.provider = this.serverless.getProvider(this.serverless.service.provider.name);
    this.stage = this.options.stage || this.serverless.service.provider.stage;

    this.hooks = {
      'after:deploy:deploy': this.afterDeploy.bind(this)
    };
  }

  getApiId() {
    return new Promise(resolve => {
      this.provider.request('CloudFormation', 'describeStacks', {StackName: this.provider.naming.getStackName(this.stage)}).then(resp => {
        const output = resp.Stacks[0].Outputs;
        let apiUrl;
        output.filter(entry => entry.OutputKey.match('ServiceEndpoint')).forEach(entry => apiUrl = entry.OutputValue);
        const apiId = apiUrl.match('https:\/\/(.*)\\.execute-api')[1];
        resolve(apiId);
      });
    });
  }

  putSwagger(apiId, swagger) {
      return this.provider.request('APIGateway', 'putRestApi', {restApiId: apiId, mode: 'merge', body: swagger});
  }

  createDeployment(apiId) {
      return this.provider.request('APIGateway', 'createDeployment', {restApiId: apiId, stageName: this.stage});
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
        return this.createDeployment(apiId);
      });
    });
  }
}

module.exports = BinarySupport;
