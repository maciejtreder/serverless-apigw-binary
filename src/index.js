'use strict';

const deepEqual = require('deep-equal');
const clone = require('clone');
const genOptionsBlock = require('./gen-options');
const METHODS = [
  'GET',
  'HEAD',
  'DELETE',
  'POST',
  'PUT',
  'PATCH'
]

class BinarySupport {
  constructor(serverless, options) {
    this.options = options || {};
    this.serverless = serverless;
    this.provider = this.serverless.getProvider(this.serverless.service.provider.name);
    this.stage = null;
    this.apiId = null;

    this.hooks = {
      'after:deploy:deploy': this.afterDeploy.bind(this),
      'apigw-binary:update:end': this.updateRestApi.bind(this)
    };

    this.commands = {
      'apigw-binary': {
        commands: {
          'update': {
            lifecycleEvents: [
              'end'
            ]
          }
        }
      }
    }
  }

  ensureStage() {
    this.stage = this.options.stage || this.serverless.service.provider.stage;
    return this.stage;
  }

  ensureApiId() {
    this.ensureStage();
    return new Promise(resolve => {
      this.provider.request('CloudFormation', 'describeStacks', { StackName: this.provider.naming.getStackName(this.stage) }).then(resp => {
        const output = resp.Stacks[0].Outputs;
        let apiUrl;
        output.filter(entry => entry.OutputKey.match('ServiceEndpoint')).forEach(entry => apiUrl = entry.OutputValue);
        this.apiId = apiUrl.match('https:\/\/(.*)\\.execute-api')[1];
        resolve();
      });
    });
  }

  getCurrentSwagger() {
    return this.provider.request('APIGateway', 'getExport', {
      restApiId: this.apiId,
      exportType: 'swagger',
      accepts: 'application/json',
      parameters: {
        extensions: 'integrations'
      },
      stageName: this.stage
    })
    .then(({ body }) => JSON.parse(body));
  }

  updateRestApi() {
    // See:
    //   https://github.com/serverless/serverless/issues/2797#issuecomment-331698109
    //
    //    and
    //
    //   https://github.com/awslabs/aws-serverless-express/issues/58
    //     https://github.com/awslabs/aws-serverless-express/issues/58#issuecomment-303193847
    //     https://github.com/awslabs/aws-serverless-express/issues/58#issuecomment-322263402
    return this.ensureApiId()
      .then(() => this.getCurrentSwagger())
      .then(swaggerInput => this.updateSwagger(swaggerInput));
  }

  updateSwagger(swaggerInput) {
    const original = clone(swaggerInput);
    this.log('setting binary mime types')
    swaggerInput["x-amazon-apigateway-binary-media-types"] = this.serverless.service.custom.apigwBinary.types;
    for (let path in swaggerInput.paths) {
      let pathConf = swaggerInput.paths[path]
      // TODO: check methods against serveress.yml
      let methods = METHODS
      if (pathConf.options) {
        this.log(`updating existing OPTIONS integration for path: ${path}`);
        let integrationOpts = pathConf.options['x-amazon-apigateway-integration']
        if (integrationOpts) {
          if (!integrationOpts.contentHandling) {
            // THE SKELETON KEY
            integrationOpts.contentHandling = 'CONVERT_TO_TEXT'
          }
        } else {
          pathConf.options['x-amazon-apigateway-integration'] = genOptionsBlock({ methods })['x-amazon-apigateway-integration']
        }
      } else {
        this.log(`setting default OPTIONS integration for path ${path}`)
        pathConf.options = genOptionsBlock({ methods })
      }
    }

    if (deepEqual(original, swaggerInput)) {
      this.log('skipping update, remote swagger is already up to date')
      return Promise.resolve();
    }

    return this.pushUpdate(swaggerInput);
  }

  pushUpdate(swaggerInput) {
    return this.putSwagger(swaggerInput)
      .then(() => this.createDeployment());
  }

  putSwagger(swagger) {
    return this.provider.request('APIGateway', 'putRestApi', { restApiId: this.apiId, mode: 'merge', body: JSON.stringify(swagger) });
  }

  createDeployment() {
    return this.provider.request('APIGateway', 'createDeployment', { restApiId: this.apiId, stageName: this.stage });
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
    return this.updateRestApi();
  }

  log(message) {
    this.serverless.cli.log(`apigw-binary: ${message}`);
  }
}

module.exports = BinarySupport;
