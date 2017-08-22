'use strict';

const util = require('util')

class BinarySupport {
  constructor(serverless, options) {
    this.serverless = serverless;

    this.hooks = {
      'after:deploy:deploy': this.afterDeploy.bind(this)
    };
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
    return this.serverless.getProvider(this.serverless.service.provider.name).naming.getApiGatewayName();
  }
  afterDeploy() {

    const provider = this.serverless.getProvider(this.serverless.service.provider.name);

    const apiName = this.getApiGatewayName();
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
      }, 1000);
    }).then(apiId => {

          apiGWSdk.putRestApi({
            restApiId: apiId,
            mode: 'merge',
            body: swaggerInput
          }, (err, data) => {
            if (err) throw new Exception(err.stack);
          });

        });
  }
}

module.exports = BinarySupport;
