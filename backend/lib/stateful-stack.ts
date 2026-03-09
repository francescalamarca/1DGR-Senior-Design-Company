import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as rds from "aws-cdk-lib/aws-rds";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import * as path from "node:path";
/**
 * Stack for stateful resources and constructs (Auth, DBs, S3 buckets, etc)
 */
export class StatefulStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly vpc: ec2.Vpc;
  public readonly db: rds.DatabaseInstance;
  public readonly lambdaSg: ec2.SecurityGroup;
  public readonly bucket: s3.Bucket; //expose to other stacks
  public readonly cfDomain: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //vpc
    const vpc = new ec2.Vpc(this, "rdsVpc", { maxAzs: 2, natGateways: 0 });
    this.vpc = vpc;

    //add vpc endpoint
    vpc.addInterfaceEndpoint("SecretsManagerEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
    });

    //Security group
    const lambdaSg = new ec2.SecurityGroup(this, "LambdaSecurityGroup", {
      vpc,
      allowAllOutbound: true,
      description: "Security Group for Lambdas to access RDS",
    });
    this.lambdaSg = lambdaSg;

    //DB credentials
    const dbCredentials = new secretsmanager.Secret(this, "DbCredentials", {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: "SeniorDesign" }),
        generateStringKey: "password",
        excludePunctuation: true,
      },
    });

    const db = new rds.DatabaseInstance(this, "PostgresDb", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      credentials: rds.Credentials.fromSecret(dbCredentials),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO,
      ),
      allocatedStorage: 20,
      databaseName: "db-1dgr-company",
      publiclyAccessible: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN, //testing
    });
    this.db = db;

    // Allow Lambda security group to connect to RDS on port 5432
    db.connections.allowFrom(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5432),
      "Allow Lambda to connect to RDS",
    );

    // Pre-signup Lambda trigger (validates DOB and auto-confirms email)
    const preSignUpLambda = new lambda.NodejsFunction(
      this,
      "PreSignUpHandler",
      {
        entry: path.join(__dirname, "../src/api/pre-signup.ts"),
        handler: "handler",
      },
    );

    // Post-confirmation Lambda trigger
    const postConfirmationLambda = new lambda.NodejsFunction(
      this,
      "PostConfirmationHandler",
      {
        entry: path.join(__dirname, "../src/api/post-confirmation.ts"),
        handler: "handler",
        vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        securityGroups: [lambdaSg],
        environment: {
          DB_SECRET_ARN: db.secret?.secretArn || "",
          RDS_HOST: db.instanceEndpoint.hostname,
        },
      },
    );

    db.secret?.grantRead(postConfirmationLambda);

    // Create User Pool with post-confirmation trigger
    this.userPool = new cognito.UserPool(this, "UserPool", {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        phoneNumber: {
          required: true,
          mutable: true,
        },
      },
      customAttributes: {
        full_name: new cognito.StringAttribute({ mutable: true }),
        preferred_name: new cognito.StringAttribute({ mutable: true }),
        legal_first_name: new cognito.StringAttribute({ mutable: true }),
        legal_last_name: new cognito.StringAttribute({ mutable: true }),
        user_type: new cognito.StringAttribute({ mutable: true }),
        company_pin: new cognito.StringAttribute({ mutable: true }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireSymbols: true,
      },
      lambdaTriggers: {
        preSignUp: preSignUpLambda,
        postConfirmation: postConfirmationLambda,
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    new cognito.CfnUserPoolGroup(this, "CandidatesGroup", {
      userPoolId: this.userPool.userPoolId,
      groupName: "Candidate",
    });

    const userPoolClient = this.userPool.addClient("AppClient", {
      authFlows: {
        userPassword: true,
      },
    });

    // S3 Bucket for file storage
    // Add this to your StatefulStack constructor where you create the S3 bucket

    this.bucket = new s3.Bucket(this, "VideoBucket", {
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,

      // Add lifecycle rules to optimize storage
      lifecycleRules: [
        {
          // Clean up incomplete multipart uploads after 7 days
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
        },
      ],

      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.HEAD,
            s3.HttpMethods.POST, // Add POST for better compatibility
          ],
          allowedOrigins: ["*"],
          allowedHeaders: [
            "*",
            "Content-Type",
            "Content-Length",
            "Content-Range",
            "Range",
          ],
          exposedHeaders: [
            "ETag",
            "Content-Range",
            "Accept-Ranges",
            "Content-Length",
            "Content-Type",
            "Last-Modified",
            "Cache-Control",
          ],
          maxAge: 3000, // Cache preflight requests for 50 minutes
        },
      ],
    });

    //create access identity for cloudfront to read private bucket
    const oai = new cloudfront.OriginAccessIdentity(this, "VideoOAI");
    this.bucket.grantRead(oai); // give it permission

    //create cloudfront distribution
    const distribution = new cloudfront.Distribution(
      this,
      "VideoDistribution",
      {
        defaultBehavior: {
          origin: new origins.S3Origin(this.bucket, {
            originAccessIdentity: oai,
          }),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
          compress: true,
          //forward CORS headers
          originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
      },
    );
    //output the distribution domain name so it can be used in the lambda
    this.cfDomain = distribution.domainName;
  }
}
