/**
 * Save a video for the authenticated company.
 * Creates a new feed-style video entry.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getDbClient } from "../utils/db-client";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {

  const companyId = event.requestContext.authorizer?.claims.sub;

  if (!companyId) {
    return {
      statusCode: 401,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Unauthorized" }),
    };
  }

  const body = JSON.parse(event.body || "{}");

  // Accept snake_case OR camelCase
  const s3_key = body.s3_key || body.s3Key || body.key;
  const thumbnail_key =
    body.thumbnail_key || body.thumbnailKey || body.thumbnail;
  const title = body.title || "";
  const description = body.description || "";

  if (!s3_key) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Missing s3_key" }),
    };
  }

  const client = await getDbClient();
  const cfDomain = process.env.CLOUDFRONT_DOMAIN;

  try {
    const insertQuery = `
      INSERT INTO company_videos
        (company_id, s3_key, thumbnail_key, title, description)
      VALUES
        ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const params = [
      companyId,
      s3_key,
      thumbnail_key || null,
      title || null,
      description || null,
    ];

    const result = await client.query(insertQuery, params);
    const video = result.rows[0];

    const response = {
      id: video.id,
      s3_key: video.s3_key,
      thumbnail_key: video.thumbnail_key,
      title: video.title,
      description: video.description,
      url: `https://${cfDomain}/${video.s3_key}`,
      thumbnailUrl: video.thumbnail_key
        ? `https://${cfDomain}/${video.thumbnail_key}`
        : null,
      created_at: video.created_at,
    };

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ video: response }),
    };
  } catch (error) {
    console.error("SAVE COMPANY VIDEO ERROR:", error);

    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Server error" }),
    };
  } finally {
    await client.end();
  }
};