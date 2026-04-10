#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { loadAppConfig, resolveStageConfig } from "../lib/config/loader";
import { AuroraPostgresStack } from "../lib/stacks/aurora-stack";

const app = new cdk.App();
const configPath = app.node.tryGetContext("config");

if (!configPath) {
  throw new Error("Missing CDK context key: config");
}

const config = loadAppConfig(configPath);

cdk.Tags.of(app).add("Project", config.project);
cdk.Tags.of(app).add("Application", config.application);
if (config.owner) {
  cdk.Tags.of(app).add("Owner", config.owner);
}
for (const [key, value] of Object.entries(config.tags ?? {})) {
  cdk.Tags.of(app).add(key, value);
}

for (const stage of config.stages) {
  const resolved = resolveStageConfig(config, stage);

  for (const cluster of resolved.rds.clusters) {
    const stack = new AuroraPostgresStack(app, `${stage.id}-${cluster.name}`, {
      env: {
        account: resolved.envTarget.account,
        region: resolved.envTarget.region,
      },
      project: config.project,
      application: config.application,
      namePrefix: config.naming.namePrefix,
      ssmPrefix: config.naming.ssmPrefix,
      secretPrefix: config.naming.secretPrefix,
      envTarget: resolved.envTarget,
      networkLookup: resolved.networkLookup,
      cluster,
    });

    cdk.Tags.of(stack).add("Environment", resolved.envTarget.name);
    cdk.Tags.of(stack).add("Cluster", cluster.name);
  }
}
