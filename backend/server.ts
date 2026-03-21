import cors from "cors";
import * as dotenv from "dotenv";
import express from "express";
import { getDbClient } from "./src/utils/db-client"; //the real utility client

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (_req: any, res: any) => {
  res.json({ status: "ok", message: "Backend is running!" });
});

// GET /profile - matches aws_config.apiBaseUrl + "/profile" used in profile.tsx
// NOTE: getDbClient() requires DB_SECRET_ARN and RDS_HOST env vars (AWS Secrets Manager + RDS)
app.get("/profile", async (_req: any, res: any) => {
  const client = await getDbClient();
  try {
    // TODO: derive userId from Authorization token (Cognito JWT) in production
    const userId = process.env.DEV_USER_ID ?? "";

    const profileResult = await client.query(
      `SELECT * FROM company_profiles WHERE user_id = $1`,
      [userId],
    );
    const profile = profileResult.rows[0] ?? {};

    const cfDomain = process.env.CLOUDFRONT_DOMAIN ?? "";

    const videosResult = await client.query(
      `SELECT id, title, s3_key, thumbnail_url, slot, is_deleted, created_at
       FROM company_videos WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
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

    const videoLibrary = videosResult.rows
      .filter((v: any) => !v.is_deleted)
      .map(mapVideo);
    const deletedVideoLibrary = videosResult.rows
      .filter((v: any) => v.is_deleted)
      .map(mapVideo);

    const logoKey = profile.logo_image_key ?? "";
    const avatarImageUrl = logoKey
      ? (logoKey.includes("://") ? logoKey : (cfDomain ? `https://${cfDomain}/${logoKey}` : ""))
      : "";

    res.json({
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
    });
  } catch (error: any) {
    console.error("[GET /profile] error:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  } finally {
    await client.end();
  }
});

// PUT /update-profile - matches aws_config.apiBaseUrl + "/update-profile" used in update_api.ts
// Payload shape comes from mapDraftToApiPayload in profileEdit.data.ts
app.put("/update-profile", async (req: any, res: any) => {
  const client = await getDbClient();
  try {
    // TODO: derive userId from Authorization token (Cognito JWT) in production
    const userId = process.env.DEV_USER_ID ?? "";

    const {
      company_name,
      industry,
      business_age,
      work_type,
      locations,
      mission_statement,
      core_values,
      benefits_summary,
      custom_background_color,
      logo_image_key,
    } = req.body;

    await client.query(
      `INSERT INTO company_profiles (
        user_id, company_name, industry, business_age, work_type,
        locations, mission_statement, core_values, benefits_summary,
        custom_background_color, logo_image_key
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (user_id) DO UPDATE SET
        company_name            = EXCLUDED.company_name,
        industry                = EXCLUDED.industry,
        business_age            = EXCLUDED.business_age,
        work_type               = EXCLUDED.work_type,
        locations               = EXCLUDED.locations,
        mission_statement       = EXCLUDED.mission_statement,
        core_values             = EXCLUDED.core_values,
        benefits_summary        = EXCLUDED.benefits_summary,
        custom_background_color = EXCLUDED.custom_background_color,
        logo_image_key          = EXCLUDED.logo_image_key`,
      [
        userId,
        company_name ?? "",
        industry ?? "",
        business_age ?? "",
        work_type ?? "",
        JSON.stringify(Array.isArray(locations) ? locations : []),
        mission_statement ?? "",
        JSON.stringify(Array.isArray(core_values) ? core_values : []),
        benefits_summary ?? "",
        custom_background_color ?? "",
        logo_image_key ?? "",
      ],
    );

    res.json({ success: true, message: "Profile updated" });
  } catch (error: any) {
    console.error("[PUT /update-profile] error:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  } finally {
    await client.end();
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
