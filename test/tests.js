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
        }
        serverless = new Serverless(options);
        mimeTypes = ['text/html', 'image/jpeg'];
        serverless.setProvider('aws', new AwsProvider(serverless, options));
        serverless.service.custom = {apigwBinary: {types: mimeTypes }};
        serverless.service.provider = {name: 'aws', stage: 'production'}
        serverless.service.service = 'test';
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
    });

    describe("initialization of serverless with plugin", () => {
        beforeEach(() => {
           serverless.pluginManager.addPlugin(ApiGWPlugin);
        });
        it('should contain apiGW', () => {
            expect(serverless.pluginManager.plugins[0]).to.be.instanceof(ApiGWPlugin);
        });
    });

    describe("hook", () => {
        let apiGW;
        let getRestApisStub;
        let putRestApiStub;
        let createDeploymentStub;

        beforeEach(() => {
            apiGW = new ApiGWPlugin(serverless, options);
            apiGW.interval = 1;
            getRestApisStub = sandbox.stub(apiGW.apiGWSdk, 'getRestApis');
            getRestApisStub.callsFake((params, callback) => {
                callback(null, {items: [
                    {id: 123, name: 'dont-match-me', createDate: '2017-07-02T17:52:59.000Z'},
                    {id: 321, name: 'production-test', createDate: '2017-07-02T17:52:59.000Z'}
                ]});
            });
            putRestApiStub = sandbox.stub(apiGW.apiGWSdk, 'putRestApi').callsFake((params, callback) => {
                callback(null, "some data");
            });
            createDeploymentStub = sandbox.stub(apiGW.apiGWSdk, 'createDeployment').callsFake((params, callback) => {
                callback(null, "congratz!")
            });
        });

        it('Should expose after:deploy:deploy hook', () => {
            expect(apiGW.hooks).to.be.an('object');
            expect(apiGW.hooks['after:deploy:deploy']).to.be.a('function');
        });

        it('Should call aws-sdk.getRestApis when hook is invoked', () => {
            return apiGW.hooks['after:deploy:deploy']().then(()  => {
                expect(getRestApisStub.calledOnce).to.be.equal(true);
                expect(getRestApisStub.getCall(0).args[1]).to.be.a('function');
            });
        });

        it('Should call aws-sdk.putRestApi when hook is invoked', () => {
            return apiGW.hooks['after:deploy:deploy']().then(() => {
                expect(putRestApiStub.calledOnce).to.be.equal(true);
                expect(putRestApiStub.getCall(0).args[0]).to.be.a('object');
                expect(putRestApiStub.getCall(0).args[0]).to.be.deep.equal({
                    restApiId: 321,
                    mode: 'merge',
                    body: JSON.stringify({
                        "swagger": "2.0",
                        "info": {"title": "production-test"},
                        "x-amazon-apigateway-binary-media-types": mimeTypes
                    })
                });
            });
        });

        it('Should call aws-sdk.createDeployment when hook is invoked', () => {
            return apiGW.hooks['after:deploy:deploy']().then(() => {
                expect(createDeploymentStub.calledOnce).to.be.equal(true);
                expect(createDeploymentStub.getCall(0).args[1]).to.be.a('function')
                expect(createDeploymentStub.getCall(0).args[0]).to.deep.equal({restApiId: 321, stageName: 'production'});
            });
        });

        it('Should retry createDeployment after first fail', () => {
            createDeploymentStub.callsFake((params, callback) => {
                callback({code: 'TooManyRequestsException', retryDelay: 0.147293665179372})
            });
            return apiGW.hooks['after:deploy:deploy']().then(() => {
                expect(createDeploymentStub.calledTwice).to.be.equal(true);
                expect(createDeploymentStub.getCall(1).args[1]).to.be.a('function')
                expect(createDeploymentStub.getCall(1).args[0]).to.deep.equal({restApiId: 321, stageName: 'production'});
            });
        })

        it('Should rethrow AWS SDK errors in getRestApis', () => {
            getRestApisStub.callsFake((params, callback) => {
                callback(new Error("can't get apis error"), null);
            });
            return apiGW.hooks['after:deploy:deploy']().should.be.rejectedWith(Error, "can't get apis error");
        });

        it('Should rethrow AWS SDK errors in putRestApi', () => {
            putRestApiStub.callsFake((params, callback) => {
                callback(new Error("can't update api error"), null);
            });
            return apiGW.hooks['after:deploy:deploy']().should.be.rejectedWith(Error, "can't update api error");
        });

    });
});