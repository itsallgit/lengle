#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib'
import { LengleStack } from '../lib/lengle-stack'

const app = new cdk.App()

new LengleStack(app, 'LengleStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'ap-southeast-2',
  },
})
