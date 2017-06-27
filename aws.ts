import 'common-types';
import * as AWS from 'aws-sdk';

interface IDictionary<T = any> {
  [key: string]: T;
}

export interface ILambdaContext {
    // Properties
    functionName: string;
    functionVersion: string;
    invokedFunctionArn: string;
    memoryLimitInMB: number;
    awsRequestId: string;
    logGroupName: string;
    logStreamName: string;
    identity?: ICognitoIdentity;
    clientContext?: IClientContext;
    callbackWaitsForEmptyEventLoop: boolean;
    
    // Functions
    succeed(result?: object): void;
    fail(error?: Error): void;
    done(error?: Error, result?: IDictionary<any>): void; // result must be JSON.stringifyable
    getRemainingTimeInMillis(): number;
}

export type LambdaCallback = (error: any, response: any) => void;

export interface IGatewayEvent {
  resource: string;
  path: string;
  httpMethod: string;
  headers: IDictionary<string>;
  queryStringParameters: IDictionary<string>;
  pathParameters: IDictionary<string>;
  stageVariables: IDictionary<string>;
  requestContext: IDictionary<string>;
  resourcePath: IDictionary<string>;
  body: string;
  error?: string;
  isBase64Encoded: boolean;
}

export interface ICognitoIdentity {
    cognito_identity_id: string;
    cognito_identity_pool_id: string;
}

export interface IClientContext {
    client: IClientDetails;
    Custom?: any;
    env: IClientEnv;
}

export interface IClientDetails {
    installation_id: string;
    app_title: string;
    app_version_name: string;
    app_version_code: string;
    app_package_name: string;
}

export interface IClientEnv {
    platform_version: string;
    platform: string;
    make: string;
    model: string;
    locale: string;
}

export type Region = 'us-east' | 'us-west' |'eu-west' | 'eu-central' |'ap-south' | 'ap-northeast' | 'ap-southeast' | 'ca-central' | 'cn-north';
export type Stage = 'dev' | 'stage' | 'prod';

/**
 * Invokes another Lambda function asynchronously
 */
export function invokeLambda(
    fn: string,
    data: IDictionary<any>,
    region: Region,
    stage: Stage,
    context: ILambdaContext
): Promise<any> {

  const lambda = new AWS.Lambda({region});

  data['meta'] = {
    stage,
    parentRequestId: context.awsRequestId,
    parentFunction: context.invokedFunctionArn
  };

  return new Promise( (resolve, reject) => {

    lambda.invoke({
      InvocationType: 'Event',
      FunctionName: `universal-services-${stage}-${fn}`,
      LogType: 'None',
      Payload: JSON.stringify(data),
      ClientContext: JSON.stringify({
        stage,
        parentRequestId: context.awsRequestId
      }),
    }, (err: any, response: any) => {
      if (err) {
        reject({
          statusCode: 500,
          body: `Problem invoking lambda function "${fn}": ` + err.message,
          error: err.code,
        });
      } else {
        console.log(`Invoked function: "${fn}"\n`, JSON.stringify(data, null , 2));
        resolve(response);
      }
    });

  });

};
