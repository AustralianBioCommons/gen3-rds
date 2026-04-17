import * as cdk from "aws-cdk-lib";

export interface EnvironmentTarget {
  name: string;
  account: string;
  region: string;
}

export interface AppConfig {
  project: string;
  application: string;
  owner?: string;
  tags?: Record<string, string>;
  naming: NamingConfig;
  environments: Record<string, EnvironmentTarget>;
  stages: StageConfig[];
}

export interface NamingConfig {
  namePrefix: string;
  ssmPrefix: string;
  secretPrefix: string;
}

export interface StageConfig {
  id: string;
  stageName: string;
  envKey: string;
  networkLookup: NetworkLookupConfig;
  rds: RdsStageConfig;
}

export interface NetworkLookupConfig {
  vpcIdSsmPath: string;
  subnetIdsSsmPath: string;
}

export interface RdsStageConfig {
  clusters: ClusterConfig[];
}

export interface ClusterConfig {
  name: string;
  databaseName: string;
  port?: number;
  engineVersion?: "16.4" | "15.8" | "14.13";
  serverlessV2MinCapacity?: number;
  serverlessV2MaxCapacity?: number;
  backupRetentionDays?: number;
  removalPolicy?: "DESTROY" | "RETAIN" | "SNAPSHOT";
  ingressCidrs?: string[];
  ingressSecurityGroupIds?: string[];
  parameterGroupFamily?: "aurora-postgresql14" | "aurora-postgresql15" | "aurora-postgresql16";
}

export interface ResolvedStageConfig {
  id: string;
  stageName: string;
  envTarget: EnvironmentTarget;
  networkLookup: NetworkLookupConfig;
  rds: {
    clusters: RequiredClusterConfig[];
  };
}

export interface RequiredClusterConfig {
  name: string;
  databaseName: string;
  port: number;
  engineVersion: "16.4" | "15.8" | "14.13";
  serverlessV2MinCapacity: number;
  serverlessV2MaxCapacity: number;
  backupRetentionDays: number;
  removalPolicy: cdk.RemovalPolicy;
  ingressCidrs: string[];
  ingressSecurityGroupIds: string[];
  parameterGroupFamily: "aurora-postgresql14" | "aurora-postgresql15" | "aurora-postgresql16";
  forceSSL?: boolean; // defaults to true in stack if omitted
}

export interface BaseNamingProps {
  project: string;
  application: string;
  namePrefix: string;
  ssmPrefix: string;
  secretPrefix: string;
}

export interface RdsStackProps extends cdk.StackProps, BaseNamingProps {
  envTarget: EnvironmentTarget;
  networkLookup: NetworkLookupConfig;
  cluster: RequiredClusterConfig;
}
