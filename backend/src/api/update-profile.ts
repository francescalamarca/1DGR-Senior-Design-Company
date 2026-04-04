import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getDbClient } from "../utils/db-client";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const client = await getDbClient();
  try {
    const userId = event.requestContext.authorizer?.claims?.sub;
    if (!userId) {
      return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
    }

    const body = JSON.parse(event.body ?? "{}");
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
      company_email,
      company_phone,
    } = body;

    await client.query(
      `INSERT INTO company_profiles (
        user_id, company_name, industry, business_age, work_type,
        locations, mission_statement, core_values, benefits_summary,
        custom_background_color, logo_image_key, company_email, company_phone
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (user_id) DO UPDATE SET
        company_name          = EXCLUDED.company_name,
        industry              = EXCLUDED.industry,
        business_age          = EXCLUDED.business_age,
        work_type             = EXCLUDED.work_type,
        locations             = EXCLUDED.locations,
        mission_statement     = EXCLUDED.mission_statement,
        core_values           = EXCLUDED.core_values,
        benefits_summary      = EXCLUDED.benefits_summary,
        custom_background_color = EXCLUDED.custom_background_color,
        logo_image_key        = EXCLUDED.logo_image_key,
        company_email         = EXCLUDED.company_email,
        company_phone         = EXCLUDED.company_phone`,
      [
        userId,
        company_name ?? "",
        industry ?? "",
        business_age ?? "",
        work_type ?? "",
        JSON.stringify(locations ?? []),
        mission_statement ?? "",
        JSON.stringify(core_values ?? []),
        benefits_summary ?? "",
        custom_background_color ?? "",
        logo_image_key ?? "",
        company_email ?? "",
        company_phone ?? "",
      ]
    );

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true }),
    };
  } catch (err: any) {
    console.error("[update-profile] error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  } finally {
    await client.end();
  }
};
