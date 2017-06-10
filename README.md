[![npm version](https://badge.fury.io/js/serverless-apigw-binary.svg)](https://badge.fury.io/js/serverless-apigw-binary)
# serverless-apigw-binary

This Serverless plugin automates the process of adding binary files support in API Gateway.

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
  apigw-binary:    #list of mime-types
    - 'image/jpeg'
    - 'text/html'
```

### Usage

```bash
serverless deploy    # Plugin runs within serverless deploy hook
```

### Examples

* [AWS Lambda + API Gateway - binary support example][https://github.com/maciejtreder/angular-universal-serverless] ; [ AWS Lambda + API Gateway - live demo][https://www.angular-universal-serverless.maciejtreder.com]


Something missing? More documentation? All PRs welcome at https://github.com/maciejtreder/serverless-apigw-binary