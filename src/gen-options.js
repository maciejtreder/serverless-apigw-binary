module.exports = ({ methods }) => ({
  "consumes": [
    "application/json"
  ],
  "produces": [
    "application/json"
  ],
  "responses": {
    "204": {
      "description": "204 response",
      "headers": {
        "Access-Control-Allow-Origin": {
          "type": "string"
        },
        "Access-Control-Allow-Methods": {
          "type": "string"
        },
        "Access-Control-Allow-Headers": {
          "type": "string"
        }
      }
    }
  },
  "x-amazon-apigateway-integration": {
    "contentHandling": "CONVERT_TO_TEXT",
    "responses": {
      "default": {
        "statusCode": 204,
        "responseParameters": {
          "method.response.header.Access-Control-Allow-Methods": `'${methods}'`,
          "method.response.header.Access-Control-Allow-Headers": "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent,cache'",
          "method.response.header.Access-Control-Allow-Origin": "'*'"
        }
      }
    },
    "passthroughBehavior": "when_no_match",
    "requestTemplates": {
      "application/json": "{\"statusCode\": 204}"
    },
    "type": "mock"
  }
})
