import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import { Construct } from 'constructs'

// ─── LengleStack ───────────────────────────────────────────────────────────────

export class LengleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // ── S3 Bucket ─────────────────────────────────────────────────────────────
    // Single bucket for both app files (root) and game data (data/ prefix).
    // Static website hosting enabled — serves the React app and all game data reads.
    // The error document is also index.html to support React Router client-side routing.
    // AllowedOrigins is ['*'] on first deploy; update to the specific website URL
    // after deploy and redeploy (see README — "Update CORS after first deploy").
    const bucket = new s3.Bucket(this, 'LengleBucket', {
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

    // Bucket policy: allow public s3:GetObject — required for static website hosting.
    bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [`arn:aws:s3:::${bucket.bucketName}/*`],
        principals: [new iam.StarPrincipal()],
      }),
    )

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

    // s3:GetObject and s3:PutObject on data/ prefix
    // Used by: all S3 reads (game data) and writes (guesses, words, status, results)
    unauthRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject', 's3:PutObject'],
        resources: [`arn:aws:s3:::${bucket.bucketName}/data/*`],
      }),
    )

    // s3:ListBucket on the bucket, restricted to the data/ prefix via condition.
    // Required for ListObjectsV2 used by Word History (list past day folders)
    // and results finalisation (check for existing results.json).
    // Without this permission those features fail with 403.
    unauthRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['s3:ListBucket'],
        resources: [`arn:aws:s3:::${bucket.bucketName}`],
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
      description: 'S3 static website endpoint — set as VITE_S3_WEBSITE_URL',
    })

    new cdk.CfnOutput(this, 'IdentityPoolId', {
      value: identityPool.ref,
      description: 'Cognito Identity Pool ID — set as VITE_COGNITO_IDENTITY_POOL_ID',
    })
  }
}
