import { Pool } from "pg";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

let pool: Pool | undefined;

const secretsClient = new SecretsManagerClient({});

export async function getDbClient(): Promise<Pool> {
  if (pool) {
    return pool;
  }

  const secretArn = process.env.DB_SECRET_ARN!;
  const rdsHost = process.env.RDS_HOST!;

  const secretResponse = await secretsClient.send(
    new GetSecretValueCommand({
      SecretId: secretArn,
    })
  );

  const secret = JSON.parse(secretResponse.SecretString!);

  pool = new Pool({
    host: rdsHost,
    user: secret.username,
    password: secret.password,
    database: secret.dbname,
    port: 5432,
    ssl: { rejectUnauthorized: false },
  });

  return pool;
}