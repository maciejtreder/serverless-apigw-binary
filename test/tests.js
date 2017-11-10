const Serverless = require('serverless');
const ApiGWPlugin = require('../src/index');
const chai = require('chai');
const AwsProvider = require('serverless/lib/plugins/aws/provider/awsProvider');
const sinon = require('sinon');

chai.use(require('chai-as-promised'))
const expect = chai.expect;
const should = chai.should();

describe('', () => {
    let serverless;
    let options;
    let mimeTypes;
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
        options = {
            stage: 'production',
            region: 'eu-central-1'
        };
        serverless = new Serverless(options);
        mimeTypes = ['text/html', 'image/jpeg'];
        serverless.setProvider('aws', new AwsProvider(serverless, options));
        serverless.service.custom = {apigwBinary: {types: mimeTypes }};
        serverless.service.provider = {name: 'aws', stage: 'production'}
        serverless.service.service = 'test';
        serverless.processedInput= {options: {}};
        serverless.cli =  {log: (msg) => {}};
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("initialization of plugin", () => {
        it('should initialize plugin without options', () => {
            const apiGW = new ApiGWPlugin(serverless);

            expect(apiGW.serverless).to.be.instanceof(Serverless);
            expect(apiGW.options).to.be.deep.equal({});
        });

        it('should initialize plugin with empty options', () => {
            const apiGW = new ApiGWPlugin(serverless, {});

            expect(apiGW.serverless).to.be.instanceof(Serverless);
            expect(apiGW.options).to.be.deep.equal({});
        });

        it('should initialize plugin with custom options', () => {
            const apiGW = new ApiGWPlugin(serverless, options);

            expect(apiGW.serverless).to.be.instanceof(Serverless);
            expect(apiGW.options).to.be.deep.equal(options);
        });

        it('should initialize plugin without custom options', () => {
          const noCustom = new Serverless(options);
          const apiGW = new ApiGWPlugin(noCustom);

          expect(apiGW.options).to.be.deep.equal({});
        });
    });

    describe("initialization of serverless with plugin", () => {
        beforeEach(() => {
           serverless.pluginManager.addPlugin(ApiGWPlugin);
        });
        it('should contain apiGW', () => {
            expect(serverless.pluginManager.plugins[0]).to.be.instanceof(ApiGWPlugin);
        });
    });

    //describe("hook", () => {
    //    let mockApiId = '29wg93ppgb'
    //    let apiGW;
    //    let cloudFormationStub;
    //    let putRestApiStub;
    //    let createDeploymentStub;
    //
    //    beforeEach(() => {
    //        apiGW = new ApiGWPlugin(serverless, options);
    //        apiGW.intervalMultiplexer = 1;
    //        cloudFormationStub = sandbox.stub(apiGW.cloudFormation, 'describeStacks');
    //        cloudFormationStub.callsFake((params, callback) => {
    //            callback(null, {
    //                ResponseMetadata: { RequestId: 'ecadfd49-985f-11e7-b4d3-fffe16f525da' },
    //                Stacks:
    //                    [ { StackId: 'arn:aws:cloudformation:eu-central-1:548199570266:stack/my-awesome-app-production/bd1c19e0-985f-11e7-9408-50fafb4f9cae',
    //                        StackName: 'my-awesome-app-production',
    //                        Description: 'The AWS CloudFormation template for this Serverless application',
    //                        Parameters: [],
    //                        CreationTime: '2017-09-13T08:44:22.021Z',
    //                        LastUpdatedTime: '2017-09-13T08:44:57.500Z',
    //                        RollbackConfiguration: {},
    //                        StackStatus: 'UPDATE_COMPLETE',
    //                        DisableRollback: false,
    //                        NotificationARNs: [],
    //                        Capabilities: [Array],
    //                        Outputs: [ { OutputKey: 'ApiLambdaFunctionQualifiedArn',
    //                            OutputValue: 'arn:aws:lambda:eu-central-1:548199570266:function:my-awesome-app-production-api:23',
    //                            Description: 'Current Lambda function version' },
    //                            { OutputKey: 'ServiceEndpoint',
    //                                OutputValue: 'https://'+mockApiId+'.execute-api.eu-central-1.amazonaws.com/production',
    //                                Description: 'URL of the service endpoint' },
    //                            { OutputKey: 'ServerlessDeploymentBucketName',
    //                                OutputValue: 'my-awesome-app-productio-serverlessdeploymentbuck-1ahqqn47ovfvx' } ],
    //                        Tags: [Array] }
    //                    ]
    //            })
    //        });
    //        putRestApiStub = sandbox.stub(apiGW.apiGWSdk, 'putRestApi').callsFake((params, callback) => {
    //            callback(null, "some data");
    //        });
    //        createDeploymentStub = sandbox.stub(apiGW.apiGWSdk, 'createDeployment').callsFake((params, callback) => {
    //            callback(null, "congratz!")
    //        });
    //    });
    //
    //    it('Should expose after:deploy:deploy hook', () => {
    //        expect(apiGW.hooks).to.be.an('object');
    //        expect(apiGW.hooks['after:deploy:deploy']).to.be.a('function');
    //    });
    //
    //    it('Should call aws-sdk.cloudFormation when hook is invoked', () => {
    //        return apiGW.hooks['after:deploy:deploy']().then(()  => {
    //            expect(cloudFormationStub.calledOnce).to.be.equal(true);
    //            expect(cloudFormationStub.getCall(0).args[1]).to.be.a('function');
    //        });
    //    });
    //
    //    it('Should retrieve apiId', () => {
    //        return apiGW.getApiId().then((apiId) => {
    //            expect(apiId).to.be.equal(mockApiId)
    //        });
    //    });
    //
    //    it('Should call aws-sdk.putRestApi when hook is invoked', () => {
    //        return apiGW.hooks['after:deploy:deploy']().then(() => {
    //            expect(putRestApiStub.calledOnce).to.be.equal(true);
    //            expect(putRestApiStub.getCall(0).args[0]).to.be.a('object');
    //            expect(putRestApiStub.getCall(0).args[0]).to.be.deep.equal({
    //                restApiId: mockApiId,
    //                mode: 'merge',
    //                body: JSON.stringify({
    //                    "swagger": "2.0",
    //                    "info": {"title": "production-test"},
    //                    "x-amazon-apigateway-binary-media-types": mimeTypes
    //                })
    //            });
    //        });
    //    });
    //
    //    it('Should call aws-sdk.createDeployment when hook is invoked', () => {
    //        return apiGW.hooks['after:deploy:deploy']().then(() => {
    //            expect(createDeploymentStub.calledOnce).to.be.equal(true);
    //            expect(createDeploymentStub.getCall(0).args[1]).to.be.a('function')
    //            expect(createDeploymentStub.getCall(0).args[0]).to.deep.equal({restApiId: mockApiId, stageName: 'production'});
    //        });
    //    });
    //
    //    it('Should retry createDeployment after first fail', () => {
    //        createDeploymentStub.callsFake((params, callback) => {
    //            callback({code: 'TooManyRequestsException', retryDelay: 0.147293665179372})
    //        });
    //        return apiGW.hooks['after:deploy:deploy']().then(() => {
    //            expect(createDeploymentStub.calledTwice).to.be.equal(true);
    //            expect(createDeploymentStub.getCall(1).args[1]).to.be.a('function')
    //            expect(createDeploymentStub.getCall(1).args[0]).to.deep.equal({restApiId: mockApiId, stageName: 'production'});
    //        });
    //    })
    //
    //    it('Should rethrow AWS SDK errors in cloudFormation', () => {
    //        cloudFormationStub.callsFake((params, callback) => {
    //            callback(new Error("can't get stacks error"), null);
    //        });
    //        return apiGW.hooks['after:deploy:deploy']().should.be.rejectedWith(Error, "can't get stacks error");
    //    });
    //
    //    it('Should rethrow AWS SDK errors in putRestApi', () => {
    //        putRestApiStub.callsFake((params, callback) => {
    //            callback(new Error("can't update api error"), null);
    //        });
    //        return apiGW.hooks['after:deploy:deploy']().should.be.rejectedWith(Error, "can't update api error");
    //    });
    //});
});