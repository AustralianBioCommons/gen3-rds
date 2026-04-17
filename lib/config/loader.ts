import * as fs from "fs";
import * as path from "path";
import * as cdk from "aws-cdk-lib";
import {
  AppConfig,
  ClusterConfig,
  EnvironmentTarget,
  RequiredClusterConfig,
  ResolvedStageConfig,
  StageConfig,
} from "../types";
import { validateConfig } from "./schema";

export function loadAppConfig(configPath: string): AppConfig {
  const absolutePath = path.resolve(configPath);
  const raw = fs.readFileSync(absolutePath, "utf8");
  const config = JSON.parse(raw) as AppConfig;
  validateConfig(config);
  return config;
}

function resolveEnvironmentTarget(
  environments: Record<string, EnvironmentTarget>,
  envKey: string,
): EnvironmentTarget {
  const resolved = environments[envKey];
  if (!resolved) {
    throw new Error(`Unknown envKey: ${envKey}`);
  }
  return resolved;
}

function resolveRemovalPolicy(value?: string): cdk.RemovalPolicy {
  switch ((value ?? "RETAIN").toUpperCase()) {
    case "DESTROY":
      return cdk.RemovalPolicy.DESTROY;
    case "SNAPSHOT":
      return cdk.RemovalPolicy.SNAPSHOT;
    default:
      return cdk.RemovalPolicy.RETAIN;
  }
}

function resolveCluster(cluster: ClusterConfig): RequiredClusterConfig {
  const engineVersion = cluster.engineVersion ?? "16.4";
  const parameterGroupFamily = cluster.parameterGroupFamily ?? (
    engineVersion.startsWith("16") ? "aurora-postgresql16" :
      engineVersion.startsWith("15") ? "aurora-postgresql15" :
        "aurora-postgresql14"
  );

  return {
    name: cluster.name,
    databaseName: cluster.databaseName,
    port: cluster.port ?? 5432,
    engineVersion,
    serverlessV2MinCapacity: cluster.serverlessV2MinCapacity ?? 0.5,
    serverlessV2MaxCapacity: cluster.serverlessV2MaxCapacity ?? 4,
    backupRetentionDays: cluster.backupRetentionDays ?? 30,
    removalPolicy: resolveRemovalPolicy(cluster.removalPolicy),
    ingressCidrs: cluster.ingressCidrs ?? [],
    ingressSecurityGroupIds: cluster.ingressSecurityGroupIds ?? [],
    parameterGroupFamily,
    forceSSL: cluster.forceSSL ?? true

  };
}

export function resolveStageConfig(appConfig: AppConfig, stage: StageConfig): ResolvedStageConfig {
  return {
    id: stage.id,
    stageName: stage.stageName,
    envTarget: resolveEnvironmentTarget(appConfig.environments, stage.envKey),
    networkLookup: stage.networkLookup,
    rds: {
      clusters: stage.rds.clusters.map(resolveCluster),
    },
  };
}
