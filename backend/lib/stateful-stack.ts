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
  public readonly bucket: s3.IBucket; // changed from s3.Bucket to s3.IBucket for imported bucket
  public readonly cfDomain: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC
    const vpc = new ec2.Vpc(this, "rdsVpc", { maxAzs: 2, natGateways: 0 });
    this.vpc = vpc;

    // Add VPC endpoint for Secrets Manager
    vpc.addInterfaceEndpoint("SecretsManagerEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
    });

    // Security group for Lambdas to access RDS
    const lambdaSg = new ec2.SecurityGroup(this, "LambdaSecurityGroup", {
      vpc,
      allowAllOutbound: true,
      description: "Security Group for Lambdas to access RDS",
    });
    this.lambdaSg = lambdaSg;

    // DB credentials — master username matches existing RDS instance
    const dbCredentials = new secretsmanager.Secret(this, "DbCredentials", {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: "SeniorDesign" }),
        generateStringKey: "password",
        excludePunctuation: true,
      },
    });

    // RDS instance — synced to existing db-1dgr-company instance config
    // ARN: arn:aws:rds:us-east-2:206470328151:db:db-1dgr-company
    // Instance class: db.t4g.micro (Graviton), PostgreSQL 17.6, 20 GiB gp2
    const db = new rds.DatabaseInstance(this, "PostgresDb", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_17,
      }),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      credentials: rds.Credentials.fromSecret(dbCredentials),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MICRO,
      ),
      allocatedStorage: 20,
      databaseName: "db_1dgr",
      publiclyAccessible: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    this.db = db;

    // Allow connections to RDS on port 5432
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

    // Post-confirmation Lambda trigger (creates user record in DB)
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

    // Cognito User Pool
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

    this.userPool.addClient("AppClient", {
      authFlows: {
        userPassword: true,
      },
    });

    // Import existing S3 bucket created manually in console
    // Bucket name: 1dgr-company-videos, region: us-east-2
    this.bucket = s3.Bucket.fromBucketName(
      this,
      "VideoBucket",
      "1dgr-company-videos",
    );

    // CloudFront origin access identity for private S3 bucket
    const oai = new cloudfront.OriginAccessIdentity(this, "VideoOAI");
    this.bucket.grantRead(oai);

    // CloudFront distribution for video delivery
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
          originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
      },
    );

    // Expose CloudFront domain for use in Lambda environment variables
    this.cfDomain = distribution.domainName;
  }
}
