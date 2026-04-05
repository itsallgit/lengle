import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers'
import { CONFIG } from './config'

// SECURITY: Word files for the active puzzle date must NEVER be fetched unless
// the calling code has verified that the player has a recorded correct guess
// (is_correct: true) in their own guess file for that puzzle. This prevents
// accidental cheating. Word files for past dates are freely readable.
// See spec Section 5.2. This discipline must never be bypassed.

let _s3Client: S3Client | null = null

function getS3Client(): S3Client {
  if (!_s3Client) {
    _s3Client = new S3Client({
      region: CONFIG.aws.region,
      credentials: fromCognitoIdentityPool({
        clientConfig: { region: CONFIG.aws.region },
        identityPoolId: CONFIG.aws.cognitoIdentityPoolId,
      }),
    })
  }
  return _s3Client
}

/**
 * Reads a JSON file from the S3 static website endpoint (HTTP GET). Returns null
 * if the file does not exist or if the response Content-Type is not application/json.
 *
 * The Content-Type check handles the case where S3 static website hosting returns
 * index.html (HTTP 200, text/html) for missing keys instead of a real 404, which
 * occurs because the error document is set to index.html.
 */
export async function readJson<T>(key: string): Promise<T | null> {
  const url = `${CONFIG.aws.s3WebsiteUrl}/${key}`
  try {
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) return null
    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}

/**
 * Writes a JSON file directly to S3 via the AWS SDK using Cognito unauthenticated
 * credentials (HTTPS PUT directly to S3 — the S3 website endpoint only supports GET).
 */
export async function writeToS3(key: string, data: unknown): Promise<void> {
  const client = getS3Client()
  await client.send(
    new PutObjectCommand({
      Bucket: CONFIG.aws.bucketName,
      Key: key,
      Body: JSON.stringify(data),
      ContentType: 'application/json',
    }),
  )
}

/**
 * Lists all S3 keys under the given prefix using ListObjectsV2 directly via
 * the AWS SDK (the S3 website endpoint does not support list operations).
 *
 * Handles pagination automatically. Requires s3:ListBucket IAM permission with
 * a prefix condition on the bucket (see spec Section 4.1).
 *
 * Returns full key strings, e.g. 'data/days/2026-04-01/status.json'.
 */
export async function listS3Keys(prefix: string): Promise<string[]> {
  const client = getS3Client()
  const keys: string[] = []
  let continuationToken: string | undefined

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: CONFIG.aws.bucketName,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    )
    for (const object of response.Contents ?? []) {
      if (object.Key) keys.push(object.Key)
    }
    continuationToken = response.NextContinuationToken
  } while (continuationToken)

  return keys
}
