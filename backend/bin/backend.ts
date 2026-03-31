#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { StatefulStack } from "../lib/stateful-stack.js";
import { StatelessStack } from "../lib/stateless-stack.js";

const app = new cdk.App();

const statefulStack = new StatefulStack(app, "StatefulStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

new StatelessStack(app, "StatelessStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  userPool: statefulStack.userPool,
  vpc: statefulStack.vpc,
  db: statefulStack.db,
  lambdaSg: statefulStack.lambdaSg,
  videoBucket: statefulStack.bucket,
  cfDomain: statefulStack.cfDomain,
});