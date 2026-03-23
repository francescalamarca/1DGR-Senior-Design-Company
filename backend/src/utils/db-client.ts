import * as AWS from "@aws-sdk/client-secrets-manager";
import { Client } from "pg";
// Define the shape of your DB credentials stored in AWS Secrets Manager
interface DbCredentials {
  username: string;
  password: string;
  dbname: string;
}
/**
 * Returns a connected PostgreSQL client using credentials stored in AWS Secrets Manager
 */
export async function getDbClient(): Promise<Client> {
  const secretArn = process.env.DB_SECRET_ARN || "";
  const rdsHost = process.env.RDS_HOST || "";
  // Fetch secret from Secrets Manager
  const secretManager = new AWS.SecretsManager();
  const secretValue = (
    await secretManager.getSecretValue({ SecretId: secretArn })
  ).SecretString!;
  const dbCredentials: DbCredentials = JSON.parse(secretValue);
  // Create PostgreSQL client
  const client = new Client({
    host: rdsHost,
    port: 5432,
    user: dbCredentials.username,
    password: dbCredentials.password,
    database: dbCredentials.dbname,
    ssl: { rejectUnauthorized: false }, // Required for AWS RDS SSL connections
  });

  await client.connect();
  return client;
}
