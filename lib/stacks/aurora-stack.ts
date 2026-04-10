import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { RdsStackProps } from "../types";

function resolveAuroraPostgresVersion(version: string): rds.AuroraPostgresEngineVersion {
  switch (version) {
    case "14.13":
      return rds.AuroraPostgresEngineVersion.VER_14_13;
    case "15.8":
      return rds.AuroraPostgresEngineVersion.VER_15_8;
    case "16.4":
      return rds.AuroraPostgresEngineVersion.VER_16_4;
    default:
      throw new Error(`Unsupported Aurora PostgreSQL version: ${version}`);
  }
}

export class AuroraPostgresStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: RdsStackProps) {
    super(scope, id, props);

    const envName = props.envTarget.name;
    const clusterName = props.cluster.name;

    const vpcId = ssm.StringParameter.valueFromLookup(this, props.networkLookup.vpcIdSsmPath);
    const subnetIdsCsv = ssm.StringParameter.valueFromLookup(this, props.networkLookup.subnetIdsSsmPath);
    const subnetIds = subnetIdsCsv.split(",").map((value) => value.trim()).filter(Boolean);

    const vpc = ec2.Vpc.fromLookup(this, "Vpc", { vpcId });

    const importedSubnets = subnetIds.map((subnetId, index) =>
      ec2.Subnet.fromSubnetId(this, `ImportedSubnet${index + 1}`, subnetId),
    );

    const subnetGroup = new rds.SubnetGroup(this, "DbSubnetGroup", {
      description: `Subnet group for ${props.project}/${props.application}/${envName}/${clusterName}`,
      vpc,
      vpcSubnets: { subnets: importedSubnets },
      removalPolicy: props.cluster.removalPolicy,
    });

    const dbSecurityGroup = new ec2.SecurityGroup(this, "DbSecurityGroup", {
      vpc,
      description: `RDS access for ${props.project}/${props.application}/${envName}/${clusterName}`,
      allowAllOutbound: true,
    });

    for (const cidr of props.cluster.ingressCidrs) {
      dbSecurityGroup.addIngressRule(ec2.Peer.ipv4(cidr), ec2.Port.tcp(props.cluster.port), `Allow PostgreSQL from ${cidr}`);
    }

    for (const securityGroupId of props.cluster.ingressSecurityGroupIds) {
      dbSecurityGroup.addIngressRule(ec2.Peer.securityGroupId(securityGroupId), ec2.Port.tcp(props.cluster.port), `Allow PostgreSQL from security group ${securityGroupId}`);
    }

    const engineVersion = resolveAuroraPostgresVersion(props.cluster.engineVersion);
    const parameterGroup = new rds.ParameterGroup(this, "DbParameterGroup", {
      engine: rds.DatabaseClusterEngine.auroraPostgres({ version: engineVersion }),
      parameters: {
        "rds.force_ssl": "1",
      },
    });

    const excludeCharacters = "\"@/\\' ";

    const cluster = new rds.DatabaseCluster(this, "Cluster", {
      clusterIdentifier: `${props.namePrefix}-${envName}-${clusterName}`.toLowerCase(),
      engine: rds.DatabaseClusterEngine.auroraPostgres({ version: engineVersion }),
      writer: rds.ClusterInstance.serverlessV2("writer"),
      defaultDatabaseName: props.cluster.databaseName,
      credentials: rds.Credentials.fromGeneratedSecret("postgres", {
        secretName: `${props.secretPrefix}/${props.project}/${props.application}/${envName}/rds/${clusterName}/credentials`,
        excludeCharacters,
      }),
      vpc,
      subnetGroup,
      securityGroups: [dbSecurityGroup],
      port: props.cluster.port,
      backup: { retention: cdk.Duration.days(props.cluster.backupRetentionDays) },
      removalPolicy: props.cluster.removalPolicy,
      serverlessV2MinCapacity: props.cluster.serverlessV2MinCapacity,
      serverlessV2MaxCapacity: props.cluster.serverlessV2MaxCapacity,
      parameterGroup,
      storageEncrypted: true,
      copyTagsToSnapshot: true,
    });

    const prefix = `${props.ssmPrefix}/${props.project}/${props.application}/${envName}/rds/${clusterName}`;

    new ssm.StringParameter(this, "EndpointParam", {
      parameterName: `${prefix}/endpoint`,
      stringValue: cluster.clusterEndpoint.hostname,
    });

    new ssm.StringParameter(this, "PortParam", {
      parameterName: `${prefix}/port`,
      stringValue: String(props.cluster.port),
    });

    new ssm.StringParameter(this, "DatabaseNameParam", {
      parameterName: `${prefix}/database-name`,
      stringValue: props.cluster.databaseName,
    });

    new ssm.StringParameter(this, "SecurityGroupParam", {
      parameterName: `${prefix}/security-group-id`,
      stringValue: dbSecurityGroup.securityGroupId,
    });

    new ssm.StringParameter(this, "SecretArnParam", {
      parameterName: `${prefix}/secret-arn`,
      stringValue: cluster.secret!.secretArn,
    });

    new cdk.CfnOutput(this, "ClusterEndpoint", {
      value: cluster.clusterEndpoint.hostname,
      exportName: `${props.namePrefix}-${envName}-${clusterName}-endpoint`,
    });
  }
}
