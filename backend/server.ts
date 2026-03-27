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
        email: profile.email ?? "",
        phone_number: profile.phone_number ?? "",
        contact_url_1: profile.contact_url_1 ?? "",
        contact_url_2: profile.contact_url_2 ?? "",
        contact_url_1_label: profile.contact_url_1_label ?? "",
        contact_url_2_label: profile.contact_url_2_label ?? "",
        contact_display_settings: profile.contact_display_settings ?? null,
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
      email,
      phoneNumber,
      urls,
      contactDisplaySettings,
    } = req.body;

    const url1 = Array.isArray(urls) && urls[0] ? (urls[0].url ?? "") : (urls !== undefined ? "" : undefined);
    const url1Label = Array.isArray(urls) && urls[0] ? (urls[0].title ?? "") : (urls !== undefined ? "" : undefined);
    const url2 = Array.isArray(urls) && urls[1] ? (urls[1].url ?? "") : (urls !== undefined ? "" : undefined);
    const url2Label = Array.isArray(urls) && urls[1] ? (urls[1].title ?? "") : (urls !== undefined ? "" : undefined);

    const p = (val: any, provided: boolean) => provided ? val : null;

    await client.query(
      `INSERT INTO company_profiles (
        user_id, company_name, industry, business_age, work_type,
        locations, mission_statement, core_values, benefits_summary,
        custom_background_color, logo_image_key,
        email, phone_number, contact_url_1, contact_url_2,
        contact_url_1_label, contact_url_2_label, contact_display_settings
      ) VALUES (
        $1,
        COALESCE($2, ''), COALESCE($3, ''), COALESCE($4, ''), COALESCE($5, ''),
        COALESCE($6::jsonb, '[]'::jsonb), COALESCE($7, ''),
        COALESCE($8::jsonb, '[]'::jsonb), COALESCE($9, ''),
        COALESCE($10, ''), COALESCE($11, ''),
        COALESCE($12, ''), COALESCE($13, ''),
        COALESCE($14, ''), COALESCE($15, ''),
        COALESCE($16, ''), COALESCE($17, ''),
        COALESCE($18::jsonb, '{"showEmail":false,"showPhoneNumber":false,"showUrl1":false,"showUrl2":false}'::jsonb)
      )
      ON CONFLICT (user_id) DO UPDATE SET
        company_name            = COALESCE($2, company_profiles.company_name),
        industry                = COALESCE($3, company_profiles.industry),
        business_age            = COALESCE($4, company_profiles.business_age),
        work_type               = COALESCE($5, company_profiles.work_type),
        locations               = COALESCE($6::jsonb, company_profiles.locations),
        mission_statement       = COALESCE($7, company_profiles.mission_statement),
        core_values             = COALESCE($8::jsonb, company_profiles.core_values),
        benefits_summary        = COALESCE($9, company_profiles.benefits_summary),
        custom_background_color = COALESCE($10, company_profiles.custom_background_color),
        logo_image_key          = COALESCE($11, company_profiles.logo_image_key),
        email                   = COALESCE($12, company_profiles.email),
        phone_number            = COALESCE($13, company_profiles.phone_number),
        contact_url_1           = COALESCE($14, company_profiles.contact_url_1),
        contact_url_2           = COALESCE($15, company_profiles.contact_url_2),
        contact_url_1_label     = COALESCE($16, company_profiles.contact_url_1_label),
        contact_url_2_label     = COALESCE($17, company_profiles.contact_url_2_label),
        contact_display_settings = COALESCE($18::jsonb, company_profiles.contact_display_settings)`,
      [
        userId,
        p(company_name ?? "", "company_name" in req.body),
        p(industry ?? "", "industry" in req.body),
        p(business_age ?? "", "business_age" in req.body),
        p(work_type ?? "", "work_type" in req.body),
        p(JSON.stringify(Array.isArray(locations) ? locations : []), "locations" in req.body),
        p(mission_statement ?? "", "mission_statement" in req.body),
        p(JSON.stringify(Array.isArray(core_values) ? core_values : []), "core_values" in req.body),
        p(benefits_summary ?? "", "benefits_summary" in req.body),
        p(custom_background_color ?? "", "custom_background_color" in req.body),
        p(logo_image_key ?? "", "logo_image_key" in req.body),
        p(email ?? "", "email" in req.body),
        p(phoneNumber ?? "", "phoneNumber" in req.body),
        p(url1 ?? "", "urls" in req.body),
        p(url2 ?? "", "urls" in req.body),
        p(url1Label ?? "", "urls" in req.body),
        p(url2Label ?? "", "urls" in req.body),
        p(JSON.stringify(contactDisplaySettings), "contactDisplaySettings" in req.body),
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
