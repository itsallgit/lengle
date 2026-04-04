# Copilot Prompt: Deploy to Production

Use this prompt to deploy the current state of Lengle to production.

## Pre-deploy checks (run these first)

1. `cd app && npm run typecheck` — must pass with zero errors
2. `cd app && npm run lint` — must pass with zero errors
3. Confirm `app/.env.local` exists with all three `VITE_` variables set
4. Confirm shell env has `BUCKET_NAME` set — run `echo $BUCKET_NAME`

## Deploy

5. Run `bash scripts/deploy.sh`
6. Confirm the script completed with exit code 0

## Post-deploy

7. Open the live URL (check `cdk-outputs.json` for `WebsiteUrl`) and confirm the app loads correctly
8. Report any errors encountered
