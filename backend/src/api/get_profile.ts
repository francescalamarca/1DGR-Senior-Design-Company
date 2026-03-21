import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getDbClient } from "../utils/db-client";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const client = await getDbClient();
  try {
    const userId = event.requestContext.authorizer?.claims?.sub;
    if (!userId) {
      return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
    }

    const profileResult = await client.query(
      `SELECT * FROM company_profiles WHERE user_id = $1`,
      [userId]
    );
    const profile = profileResult.rows[0] ?? {};

    const cfDomain = process.env.CLOUDFRONT_DOMAIN ?? "";

    const videosResult = await client.query(
      `SELECT id, title, s3_key, thumbnail_url, slot, is_deleted, created_at
       FROM company_videos WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    const mapVideo = (v: any) => ({
      id: v.id,
      url: cfDomain ? `https://${cfDomain}/${v.s3_key}` : "",
      s3Key: v.s3_key,
      thumbnailUrl: v.thumbnail_url ?? "",
      caption: v.title ?? "",
      slot: v.slot ?? null,
      source: "camera-roll",
      createdAt: v.created_at ? new Date(v.created_at).getTime() : Date.now(),
    });

    const videoLibrary = videosResult.rows.filter((v: any) => !v.is_deleted).map(mapVideo);
    const deletedVideoLibrary = videosResult.rows.filter((v: any) => v.is_deleted).map(mapVideo);

    const logoKey = profile.logo_image_key ?? "";
    //so a full URL stored as logo_image_key doesn't get double-prefixed with the CDN domain:
    const avatarImageUrl = logoKey
      ? (logoKey.includes("://") ? logoKey : (cfDomain ? `https://${cfDomain}/${logoKey}` : ""))
      : "";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user: {
          company_name: profile.company_name ?? "",
          industry: profile.industry ?? "",
          business_age: profile.business_age ?? "",
          work_type: profile.work_type ?? "",
          locations: profile.locations ?? [],
          mission_statement: profile.mission_statement ?? "",
          core_values: profile.core_values ?? [],
          benefits_summary: profile.benefits_summary ?? "",
          custom_background_color: profile.custom_background_color ?? "",
          logo_image_key: logoKey,
          avatar_image_url: avatarImageUrl,
          avatar_image_key: logoKey,
        },
        videoLibrary,
        deletedVideoLibrary,
      }),
    };
  } catch (err: any) {
    console.error("[get_profile] error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  } finally {
    await client.end();
  }
};
