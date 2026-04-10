import { AppConfig } from "../types";

export function validateConfig(config: AppConfig): void {
  if (!config.project) throw new Error("project is required");
  if (!config.application) throw new Error("application is required");
  if (!config.naming?.namePrefix) throw new Error("naming.namePrefix is required");
  if (!config.naming?.ssmPrefix) throw new Error("naming.ssmPrefix is required");
  if (!config.naming?.secretPrefix) throw new Error("naming.secretPrefix is required");

  if (!config.environments || Object.keys(config.environments).length === 0) {
    throw new Error("environments is required");
  }

  for (const [key, env] of Object.entries(config.environments)) {
    if (!env.name) throw new Error(`environments.${key}.name is required`);
    if (!env.account) throw new Error(`environments.${key}.account is required`);
    if (!env.region) throw new Error(`environments.${key}.region is required`);
  }

  if (!Array.isArray(config.stages) || config.stages.length === 0) {
    throw new Error("at least one stage is required");
  }

  for (const stage of config.stages) {
    if (!stage.id) throw new Error("each stage requires id");
    if (!stage.stageName) throw new Error(`stage ${stage.id}: stageName is required`);
    if (!stage.envKey) throw new Error(`stage ${stage.id}: envKey is required`);
    if (!config.environments[stage.envKey]) {
      throw new Error(`stage ${stage.id}: envKey '${stage.envKey}' not found in environments`);
    }
    if (!stage.networkLookup?.vpcIdSsmPath) {
      throw new Error(`stage ${stage.id}: networkLookup.vpcIdSsmPath is required`);
    }
    if (!stage.networkLookup?.subnetIdsSsmPath) {
      throw new Error(`stage ${stage.id}: networkLookup.subnetIdsSsmPath is required`);
    }
    if (!stage.rds?.clusters?.length) {
      throw new Error(`stage ${stage.id}: at least one rds.clusters item is required`);
    }
    for (const cluster of stage.rds.clusters) {
      if (!cluster.name) throw new Error(`stage ${stage.id}: cluster.name is required`);
      if (!cluster.databaseName) throw new Error(`stage ${stage.id}: cluster.databaseName is required`);
      if (cluster.serverlessV2MinCapacity && cluster.serverlessV2MaxCapacity && cluster.serverlessV2MinCapacity > cluster.serverlessV2MaxCapacity) {
        throw new Error(`stage ${stage.id}: cluster ${cluster.name} min capacity cannot exceed max capacity`);
      }
    }
  }
}
