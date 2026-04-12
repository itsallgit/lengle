import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import { Construct } from 'constructs'

// ─── LengleStack ───────────────────────────────────────────────────────────────

export class LengleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const createWebsiteBucket = (resourceId: string) =>
      new s3.Bucket(this, resourceId, {
        websiteIndexDocument: 'index.html',
        websiteErrorDocument: 'index.html',
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
        versioned: true,
        cors: [
          {
            allowedOrigins: ['*'],
            allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
            allowedHeaders: ['*'],
            exposedHeaders: ['ETag'],
          },
        ],
      })

    const addPublicReadPolicy = (websiteBucket: s3.Bucket) => {
      websiteBucket.addToResourcePolicy(
        new iam.PolicyStatement({
          actions: ['s3:GetObject'],
          resources: [`arn:aws:s3:::${websiteBucket.bucketName}/*`],
          principals: [new iam.StarPrincipal()],
        }),
      )
    }

    // ── S3 Buckets ────────────────────────────────────────────────────────────
    // Both buckets host the static app and store JSON game data. Production and
    // non-production share the same Cognito identity pool, but deploy and data
    // management scripts target them independently.
    const bucket = createWebsiteBucket('LengleBucket')
    const nonProdBucket = createWebsiteBucket('LengleBucketNonProd')

    addPublicReadPolicy(bucket)
    addPublicReadPolicy(nonProdBucket)

    // Legacy note retained for the first deploy flow:
    // AllowedOrigins is ['*'] on first deploy; update to the specific website URL
    // after deploy and redeploy if tighter CORS is desired.

    // ── Cognito Identity Pool (L1 constructs) ─────────────────────────────────
    // L1 (CfnIdentityPool) is used instead of the L2 IdentityPool construct
    // because the L2 construct is in alpha and unstable.
    const identityPool = new cognito.CfnIdentityPool(this, 'LengleIdentityPool', {
      identityPoolName: 'LengleIdentityPool',
      allowUnauthenticatedIdentities: true,
    })

    // ── Unauthenticated IAM Role ───────────────────────────────────────────────
    // Trust policy: allows Cognito unauthenticated identities to assume this role.
    const unauthRole = new iam.Role(this, 'LengleUnauthRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'unauthenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity',
      ),
    })

    // s3:GetObject and s3:PutObject on both data/ prefixes.
    // Used by: all S3 reads (game data) and writes (guesses, words, status, results)
    unauthRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject', 's3:PutObject'],
        resources: [
          `arn:aws:s3:::${bucket.bucketName}/data/*`,
          `arn:aws:s3:::${nonProdBucket.bucketName}/data/*`,
        ],
      }),
    )

    // s3:ListBucket on both buckets, restricted to the data/ prefix via condition.
    // Required for ListObjectsV2 used by Word History (list past day folders)
    // and results finalisation (check for existing results.json).
    // Without this permission those features fail with 403.
    unauthRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['s3:ListBucket'],
        resources: [`arn:aws:s3:::${bucket.bucketName}`, `arn:aws:s3:::${nonProdBucket.bucketName}`],
        conditions: {
          StringLike: {
            's3:prefix': ['data/', 'data/*'],
          },
        },
      }),
    )

    // Attach the role to the identity pool
    new cognito.CfnIdentityPoolRoleAttachment(this, 'LengleIdentityPoolRoleAttachment', {
      identityPoolId: identityPool.ref,
      roles: {
        unauthenticated: unauthRole.roleArn,
      },
    })

    // ── CDK Outputs ───────────────────────────────────────────────────────────
    // These values are written to cdk-outputs.json on `cdk deploy --outputs-file`.
    // Use them to populate app/.env.local and shell vars for scripts/deploy.sh.

    new cdk.CfnOutput(this, 'BucketName', {
      value: bucket.bucketName,
      description: 'S3 bucket name — set as VITE_S3_BUCKET_NAME and BUCKET_NAME',
    })

    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: bucket.bucketWebsiteUrl,
      description: 'Production S3 static website endpoint — set as VITE_S3_WEBSITE_URL for prod',
    })

    new cdk.CfnOutput(this, 'NonProdBucketName', {
      value: nonProdBucket.bucketName,
      description: 'Non-production S3 bucket name — set as VITE_S3_BUCKET_NAME for nonprod',
    })

    new cdk.CfnOutput(this, 'NonProdWebsiteUrl', {
      value: nonProdBucket.bucketWebsiteUrl,
      description: 'Non-production S3 website endpoint — set as VITE_S3_WEBSITE_URL for nonprod',
    })

    new cdk.CfnOutput(this, 'IdentityPoolId', {
      value: identityPool.ref,
      description: 'Cognito Identity Pool ID — set as VITE_COGNITO_IDENTITY_POOL_ID',
    })
  }
}
