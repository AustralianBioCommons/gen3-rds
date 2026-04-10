# gen3-rds

Reusable CDK app for Aurora PostgreSQL on AWS.

This repo contains only implementation code and a reusable GitHub Actions workflow.
Project-specific desired state belongs in a separate deployment repo, for example `bpsyc-gen3-deployment`.

## Deploy

```bash
npm ci
npx cdk synth -c config=./config/example.public.json
npx cdk deploy --all -c config=./config/example.public.json
```

## Config model

- `environments`: deploy-time AWS account/region mapping
- `networkLookup`: where to find VPC and subnet IDs, typically from the network module via SSM
- `clusters`: one or more Aurora clusters per stage
