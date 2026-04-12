import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const outputsPath = path.join(rootDir, 'cdk-outputs.json')
const appDir = path.join(rootDir, 'app')

if (!fs.existsSync(outputsPath)) {
  console.error(`Missing ${outputsPath}. Run the CDK deploy first.`)
  process.exit(1)
}

const outputs = JSON.parse(fs.readFileSync(outputsPath, 'utf8'))
const stack = outputs[Object.keys(outputs)[0]]

if (!stack) {
  console.error('No stack outputs were found in cdk-outputs.json.')
  process.exit(1)
}

const requiredKeys = [
  'BucketName',
  'WebsiteUrl',
  'NonProdBucketName',
  'NonProdWebsiteUrl',
  'IdentityPoolId',
]

for (const key of requiredKeys) {
  if (!stack[key]) {
    console.error(`Missing CDK output: ${key}`)
    process.exit(1)
  }
}

const buildEnvFile = (bucketName, websiteUrl) => [
  `VITE_S3_BUCKET_NAME=${bucketName}`,
  `VITE_S3_WEBSITE_URL=${websiteUrl}`,
  `VITE_COGNITO_IDENTITY_POOL_ID=${stack.IdentityPoolId}`,
  '',
].join('\n')

const filesToWrite = [
  {
    fileName: '.env.prod',
    content: buildEnvFile(stack.BucketName, stack.WebsiteUrl),
  },
  {
    fileName: '.env.nonprod',
    content: buildEnvFile(stack.NonProdBucketName, stack.NonProdWebsiteUrl),
  },
]

for (const file of filesToWrite) {
  const destination = path.join(appDir, file.fileName)
  fs.writeFileSync(destination, file.content, 'utf8')
  console.log(`Wrote ${destination}`)
}