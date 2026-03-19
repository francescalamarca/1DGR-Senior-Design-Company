/**
 * Recover deleted videos for the authenticated user.
 * Sets `is_deleted` to false for the provided S3 keys and clears `deleted_at`.
 */
import { APIGatewayProxyHandler } from "aws-lambda";
import { getDbClient } from "../utils/db-client";

export const handler: APIGatewayProxyHandler = async (event) => {
  // Get authenticated user ID
  const userId = event.requestContext.authorizer?.claims.sub;

  if (!userId) {
    return {
      statusCode: 401,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Unauthorized" }),
    };
  }
   // Parse list of S3 keys from request body
  const body = JSON.parse(event.body || "{}");
  const s3Keys: string[] = body.s3_keys;

  if (!Array.isArray(s3Keys) || s3Keys.length === 0) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Missing s3_keys" }),
    };
  }

  const client = await getDbClient();

  try {
    // Mark videos as not deleted in the database
    const result = await client.query(
      `
      UPDATE company_videos
      SET
        is_deleted = false,
        deleted_at = NULL
      WHERE
        company_id = $1
        AND s3_key = ANY($2)
        AND is_deleted = true
      RETURNING id;
      `,
      [userId, s3Keys]
    );

    return {
      // Return count of recovered videos
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        success: true,
        recovered_count: result.rowCount,
      }),
    };
  } catch (error) {
    console.error("[recover-videos] error:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Server error" }),
    };
  } finally {
    await client.end(); // Close DB connection
  }
};
