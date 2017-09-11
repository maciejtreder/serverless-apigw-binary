[![npm version](https://badge.fury.io/js/serverless-apigw-binary.svg)](https://badge.fury.io/js/serverless-apigw-binary)
[![Build Status](https://travis-ci.org/maciejtreder/serverless-apigw-binary.svg?branch=master)](https://travis-ci.org/maciejtreder/serverless-apigw-binary)
# serverless-apigw-binary

This Serverless plugin automates the process of adding binary files support in API Gateway.
![AWS API gateway binary support](https://raw.githubusercontent.com/maciejtreder/serverless-apigw-binary/master/binarySupport.png)

### Installation

```bash
npm install --save-dev serverless-apigw-binary
```

### Configuration

serverless.yml:

```yaml
plugins:
 - serverless-apigw-binary

custom:
  apigwBinary:
    types:           #list of mime-types
      - 'image/jpeg'
      - 'text/html'
```

### Usage

```bash
serverless deploy    # Plugin runs within serverless deploy hook
```

### Examples

* [Angular Universal + AWS Lambda + API Gateway - binary support example](https://github.com/maciejtreder/angular-universal-serverless) : [ AWS Lambda + API Gateway - live demo](https://www.angular-universal-serverless.maciejtreder.com)
* [Node.js + AWS Lambda + API Gateway - binary support example](https://github.com/maciejtreder/serverless-apigw-binary/tree/master/examples/express) : [Node.js + AWS Lambda + API Gateway - binary support live demo](https://serverless-apigw.maciejtreder.com)


Something missing? More documentation? All PRs welcome at https://github.com/maciejtreder/serverless-apigw-binary
