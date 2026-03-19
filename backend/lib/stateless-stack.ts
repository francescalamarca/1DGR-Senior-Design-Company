import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as rds from "aws-cdk-lib/aws-rds";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import * as path from "node:path";

/**
 * Stack for stateless resources and constructs (Lambda, API Gateway, etc)
 */
interface StatelessStackProps extends cdk.StackProps {
  userPool: cognito.UserPool;
  vpc: ec2.Vpc;
  db: rds.DatabaseInstance;
  lambdaSg: ec2.SecurityGroup;
  //accept the bucket
  videoBucket: s3.Bucket;
  //accept the cloudfront
  cfDomain: string;
}

export class StatelessStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StatelessStackProps) {
    super(scope, id, props);

    // Create a UserPoolClient for authentication
    const userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool: props.userPool,
      authFlows: {
        userPassword: true,
        adminUserPassword: true,
        custom: true,
      },
    });

    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      "ApiAuthorizer",
      {
        cognitoUserPools: [props.userPool],
      },
    );

    const healthCheckLambda = new lambda.NodejsFunction(
      this,
      "HealthCheckHandler",
      {
        entry: path.join(__dirname, "../src/api/health.ts"),
        handler: "handler",
        vpc: props.vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        securityGroups: [props.lambdaSg],
        environment: {
          DB_SECRET_ARN: props.db.secret?.secretArn || "",
          RDS_HOST: props.db.instanceEndpoint.hostname,
        },
      },
    );

    props.db.secret?.grantRead(healthCheckLambda);

    const authCheckLambda = new lambda.NodejsFunction(
      this,
      "AuthCheckHandler",
      {
        entry: path.join(__dirname, "../src/api/auth-check.ts"),
        handler: "handler",
        vpc: props.vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        securityGroups: [props.lambdaSg],
        environment: {
          DB_SECRET_ARN: props.db.secret?.secretArn || "",
          RDS_HOST: props.db.instanceEndpoint.hostname,
        },
      },
    );

    props.db.secret?.grantRead(authCheckLambda);

    const dbHealthLambda = new lambda.NodejsFunction(this, "DbHealthHandler", {
      entry: path.join(__dirname, "../src/api/db-health.ts"),
      handler: "handler",
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [props.lambdaSg],
      environment: {
        DB_SECRET_ARN: props.db.secret?.secretArn || "",
        RDS_HOST: props.db.instanceEndpoint.hostname,
      },
    });

    props.db.secret?.grantRead(dbHealthLambda);

    const api = new apigateway.LambdaRestApi(this, "MainApi", {
      handler: healthCheckLambda, // default handler
      proxy: false,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date",
          "Authorization",
          "X-Api-Key",
          "X-Amz-Security-Token",
        ],
        allowCredentials: true,
      },
    });

    const healthResource = api.root.addResource("health");
    healthResource.addMethod("GET"); // GET /health

    const authResource = api.root.addResource("auth-check");
    authResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(authCheckLambda),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      },
    ); // GET /auth-check

    const dbHealthResource = api.root.addResource("db-health");
    dbHealthResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(dbHealthLambda),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      },
    ); // GET /db-health

    //edit profile worker (PUT)
    const updateProfileLambda = new lambda.NodejsFunction(
      this,
      "UpdateProfileHandler",
      {
        entry: path.join(__dirname, "../src/api/update-profile.ts"),
        handler: "handler",
        vpc: props.vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        securityGroups: [props.lambdaSg],
        environment: {
          DB_SECRET_ARN: props.db.secret?.secretArn || "",
          RDS_HOST: props.db.instanceEndpoint.hostname,
        },
      },
    );

    //give the keys to the DB
    props.db.secret?.grantRead(updateProfileLambda);

    const updateProfileResource = api.root.addResource("update-profile");
    updateProfileResource.addMethod(
      "PUT",
      new apigateway.LambdaIntegration(updateProfileLambda),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      },
    );
    //get profile(GET)
    const getUserProfileLambda = new lambda.NodejsFunction(
      this,
      "GetUserProfileHandler",
      {
        entry: path.join(__dirname, "../src/api/get_profile.ts"),
        handler: "handler",
        vpc: props.vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
        environment: {
          DB_SECRET_ARN: props.db.secret?.secretArn || "",
          RDS_HOST: props.db.instanceEndpoint.hostname,
          BUCKET_NAME: props.videoBucket.bucketName,
          //cloudfront
          CLOUDFRONT_DOMAIN: props.cfDomain,
        },
      },
    );

    // Grant Permissions
    // Allow Lambda to read the DB password from Secrets Manager
    props.db.secret?.grantRead(getUserProfileLambda);
    // Allow Lambda to read from the S3 bucket
    props.videoBucket.grantRead(getUserProfileLambda);

    // Create the '/profile' resource
    const profileResource = api.root.addResource("profile");

    // Add the GET method protected by Cognito
    profileResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getUserProfileLambda),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      },
    );

    //upload video(GET)
    //create get upload URL lambda
    const getUploadUrlLambda = new lambda.NodejsFunction(
      this,
      "GetUploadUrlHandler",
      {
        entry: path.join(__dirname, "../src/api/get_upload_url.ts"),
        handler: "handler",
        vpc: props.vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
        environment: {
          BUCKET_NAME: props.videoBucket.bucketName,
        },
      },
    );

    props.videoBucket.grantPut(getUploadUrlLambda); //allow upload
    props.videoBucket.grantRead(getUploadUrlLambda); //allow read

    const uploadResource = api.root.addResource("upload-video");
    uploadResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getUploadUrlLambda),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      },
    );

    //save video metadata lambda
    const saveVideoLambda = new lambda.NodejsFunction(
      this,
      "SaveVideoMetadataHandler",
      {
        entry: path.join(__dirname, "../src/api/save-video-metadata.ts"),
        handler: "handler",
        vpc: props.vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        securityGroups: [props.lambdaSg],
        environment: {
          DB_SECRET_ARN: props.db.secret?.secretArn || "",
          RDS_HOST: props.db.instanceEndpoint.hostname,
          CLOUDFRONT_DOMAIN: props.cfDomain,
        },
      },
    );

    props.db.secret?.grantRead(saveVideoLambda);

    const saveVideoResource = api.root.addResource("save-video-metadata");
    saveVideoResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(saveVideoLambda),
      {
        authorizer, //require login
        authorizationType: apigateway.AuthorizationType.COGNITO,
      },
    );

    // Forgot Password Lambda (POST /forgot-password)
    const forgotPasswordLambda = new lambda.NodejsFunction(
      this,
      "ForgotPasswordHandler",
      {
        entry: path.join(__dirname, "../src/api/forgot-password.ts"),
        handler: "handler",
        environment: {
          USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        },
      },
    );

    const forgotPasswordResource = api.root.addResource("forgot-password");
    forgotPasswordResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(forgotPasswordLambda),
    );

    const forgotPasswordPhoneLambda = new lambda.NodejsFunction(
      this,
      "ForgotPasswordPhoneHandler",
      {
        entry: path.join(__dirname, "../src/api/forgot-password-phone.ts"),
        handler: "handler",
        environment: {
          USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
          USER_POOL_ID: props.userPool.userPoolId,
        },
      },
    );
    forgotPasswordPhoneLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["cognito-idp:ListUsers", "cognito-idp:ForgotPassword"],
        resources: [props.userPool.userPoolArn],
      }),
    );

    const forgotPasswordPhoneResource = api.root.addResource(
      "forgot-password-phone",
    );
    forgotPasswordPhoneResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(forgotPasswordPhoneLambda),
    );

    // Confirm Password Reset Lambda (POST /confirm-password)
    const confirmPasswordLambda = new lambda.NodejsFunction(
      this,
      "ConfirmPasswordHandler",
      {
        entry: path.join(__dirname, "../src/api/confirm-password.ts"),
        handler: "handler",
        environment: {
          USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        },
      },
    );

    const confirmPasswordResource = api.root.addResource("confirm-password");
    confirmPasswordResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(confirmPasswordLambda),
    );

    // Save Link Function
    const saveLinkLambda = new lambda.NodejsFunction(this, "SaveLinkHandler", {
      entry: path.join(__dirname, "../src/api/save-share-link.ts"),
      handler: "handler",
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [props.lambdaSg],
      environment: {
        DB_SECRET_ARN: props.db.secret?.secretArn || "",
        RDS_HOST: props.db.instanceEndpoint.hostname,
      },
    });
    props.db.secret?.grantRead(saveLinkLambda);

    const saveLinkResource = api.root.addResource("save-share-link");
    saveLinkResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(saveLinkLambda),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      },
    );

    // 2. View Link Function (PUBLIC / NO AUTH)
    const viewLinkLambda = new lambda.NodejsFunction(this, "ViewLinkHandler", {
      entry: path.join(__dirname, "../src/api/view-share-link.ts"),
      handler: "handler",
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [props.lambdaSg],
      environment: {
        DB_SECRET_ARN: props.db.secret?.secretArn || "",
        RDS_HOST: props.db.instanceEndpoint.hostname,
      },
    });
    props.db.secret?.grantRead(viewLinkLambda);

    const pResource = api.root.addResource("p"); // Creates /p path
    const idResource = pResource.addResource("{id}"); // Creates /p/{id}
    idResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(viewLinkLambda),
    ); // No Authorizer! Public!

    const deleteLinkLambda = new lambda.NodejsFunction(
      this,
      "DeleteLinkHandler",
      {
        entry: path.join(__dirname, "../src/api/delete-share-link.ts"),
        handler: "handler",
        vpc: props.vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        securityGroups: [props.lambdaSg],
        environment: {
          DB_SECRET_ARN: props.db.secret?.secretArn || "",
          RDS_HOST: props.db.instanceEndpoint.hostname,
        },
      },
    );
    props.db.secret?.grantRead(deleteLinkLambda);

    const deleteLinkResource = api.root.addResource("delete-share-link");
    const deleteLinkIdResource = deleteLinkResource.addResource("{id}"); // /delete-share-link/{id}
    deleteLinkIdResource.addMethod(
      "DELETE",
      new apigateway.LambdaIntegration(deleteLinkLambda),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      },
    );

    const updateLinkLambda = new lambda.NodejsFunction(
      this,
      "UpdateLinkHandler",
      {
        entry: path.join(__dirname, "../src/api/update-share-link.ts"),
        handler: "handler",
        vpc: props.vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        securityGroups: [props.lambdaSg],
        environment: {
          DB_SECRET_ARN: props.db.secret?.secretArn || "",
          RDS_HOST: props.db.instanceEndpoint.hostname,
        },
      },
    );
    props.db.secret?.grantRead(updateLinkLambda);

    const updateLinkResource = api.root.addResource("update-share-link");
    const updateLinkIdResource = updateLinkResource.addResource("{id}"); // /update-share-link/{id}
    updateLinkIdResource.addMethod(
      "PUT",
      new apigateway.LambdaIntegration(updateLinkLambda),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      },
    );

    const deleteVideoLambda = new lambda.NodejsFunction(
      this,
      "DeleteVideoHandler",
      {
        entry: path.join(__dirname, "../src/api/delete-video.ts"), // path to delete-video
        handler: "handler",
        vpc: props.vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        securityGroups: [props.lambdaSg],
        environment: {
          DB_SECRET_ARN: props.db.secret?.secretArn || "",
          RDS_HOST: props.db.instanceEndpoint.hostname,
        },
      },
    );

    // Grant Lambda read access to DB secret
    props.db.secret?.grantRead(deleteVideoLambda);

    // Add API Gateway resource
    const deleteVideoResource = api.root.addResource("delete-video"); // /delete-video
    deleteVideoResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(deleteVideoLambda),
      {
        authorizer, // Cognito auth
        authorizationType: apigateway.AuthorizationType.COGNITO,
      },
    );

    const deleteVideoForeverLambda = new lambda.NodejsFunction(
      this,
      "DeleteVideoForeverHandler",
      {
        entry: path.join(__dirname, "../src/api/delete-video-forever.ts"),
        handler: "handler",
        vpc: props.vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        securityGroups: [props.lambdaSg],
        environment: {
          DB_SECRET_ARN: props.db.secret?.secretArn || "",
          RDS_HOST: props.db.instanceEndpoint.hostname,
          BUCKET_NAME: props.videoBucket.bucketName,
        },
      },
    );
    props.db.secret?.grantRead(deleteVideoForeverLambda);
    props.videoBucket.grantDelete(deleteVideoForeverLambda);
    
    const deleteVideoForeverResource = api.root.addResource(
      "delete-video-forever",
    ); // /delete-video-forever
    deleteVideoForeverResource.addMethod(
      "DELETE",
      new apigateway.LambdaIntegration(deleteVideoForeverLambda),
      {
        authorizer, // Cognito auth
        authorizationType: apigateway.AuthorizationType.COGNITO,
      },
    );

    const recoverVideoLambda = new lambda.NodejsFunction(
      this,
      "RecoverVideoHandler",
      {
        entry: path.join(__dirname, "../src/api/recover-video.ts"),
        handler: "handler",
        vpc: props.vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        securityGroups: [props.lambdaSg],
        environment: {
          DB_SECRET_ARN: props.db.secret?.secretArn || "",
          RDS_HOST: props.db.instanceEndpoint.hostname,
        },
      },
    );
    props.db.secret?.grantRead(recoverVideoLambda);

    const recoverVideoResource = api.root.addResource("recover-video"); // /recover-video
    recoverVideoResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(recoverVideoLambda),
      {
        authorizer, // Cognito auth
        authorizationType: apigateway.AuthorizationType.COGNITO,
      },
    );
  }
}
