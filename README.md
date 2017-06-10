# serverless-apigw-binary

This Serverless plugin automates the process of adding binary files support in API Gateway.

### Installation

```bash
npm install --save serverless-apig-s3
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
serverless deploy    # Plugin runs withing serverless deploy hook
```


Something missing? More documentation? All PRs welcome at https://github.com/maciejtreder/serverless-apigw-binary