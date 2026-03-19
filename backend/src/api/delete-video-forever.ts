import { APIGatewayProxyHandler } from "aws-lambda";
import { getDbClient } from "../utils/db-client.js";
import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({});

export const handler: APIGatewayProxyHandler = async (event) => {
  const companyId = event.requestContext.authorizer?.claims.sub;

  if (!companyId) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: "Unauthorized" }),
    };
  }

  const body = JSON.parse(event.body || "{}");
  const s3Keys: string[] = body.s3_keys;

  if (!Array.isArray(s3Keys) || s3Keys.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing s3_keys" }),
    };
  }

  const client = await getDbClient();

  try {
    // First get only valid soft-deleted videos
    const { rows } = await client.query(
      `
      SELECT s3_key
      FROM company_videos
      WHERE company_id = $1
      AND s3_key = ANY($2)
      AND is_deleted = true
      `,
      [companyId, s3Keys]
    );

    if (rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "No matching deleted videos found" }),
      };
    }

    // Delete from S3
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: process.env.BUCKET_NAME,
        Delete: {
          Objects: rows.map((r) => ({ Key: r.s3_key })),
        },
      })
    );

    // Delete from DB
    const result = await client.query(
      `
      DELETE FROM company_videos
      WHERE company_id = $1
      AND s3_key = ANY($2)
      AND is_deleted = true
      `,
      [companyId, rows.map((r) => r.s3_key)]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        deleted_count: result.rowCount,
      }),
    };
  } catch (error) {
    console.error("[delete-video-forever] error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Server error" }),
    };
  } finally {
    await client.end();
  }
};