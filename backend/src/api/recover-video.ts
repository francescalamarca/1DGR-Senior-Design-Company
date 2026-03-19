/**
 * Recover deleted videos for the authenticated company.
 * Sets is_deleted = false and clears deleted_at.
 */

import { APIGatewayProxyHandler } from "aws-lambda";
import { getDbClient } from "../utils/db-client.js";

export const handler: APIGatewayProxyHandler = async (event) => {
  const companyId = event.requestContext.authorizer?.claims.sub;

  if (!companyId) {
    return {
      statusCode: 401,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Unauthorized" }),
    };
  }

  const body = JSON.parse(event.body || "{}");
  const videoIds: string[] = body.video_ids;

  if (!Array.isArray(videoIds) || videoIds.length === 0) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Missing video_ids" }),
    };
  }

  const client = await getDbClient();

  try {
    const result = await client.query(
      `
      UPDATE company_videos
      SET
        is_deleted = false,
        deleted_at = NULL
      WHERE
        company_id = $1
        AND id = ANY($2)
        AND is_deleted = true
      RETURNING id;
      `,
      [companyId, videoIds]
    );

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        success: true,
        recovered_count: result.rowCount,
        recovered_ids: result.rows.map((r: { id: string }) => r.id),
      }),
    };
  } catch (error) {
    console.error("[recover-company-videos] error:", error);

    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Server error" }),
    };
  } finally {
    await client.end();
  }
};
