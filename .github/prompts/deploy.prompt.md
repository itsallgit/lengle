# Copilot Prompt: Deploy to Production

Use this prompt to deploy the current state of Lengle to production.

## Pre-deploy checks (run these first)

1. `cd app && npm run typecheck` — must pass with zero errors
2. `cd app && npm run lint` — must pass with zero errors
3. Confirm `app/.env.local` exists with all three `VITE_` variables set
4. Confirm shell env has `BUCKET_NAME` and `DISTRIBUTION_ID` set

## Deploy

5. Run `bash scripts/deploy.sh`
6. Confirm the CloudFront invalidation was created successfully
7. Report the live URL: `https://$CLOUDFRONT_DOMAIN`

## Post-deploy

8. Open the live URL and confirm the app loads correctly
9. Report any errors encountered
