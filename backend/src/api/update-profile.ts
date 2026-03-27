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
      email,
      phoneNumber,
      urls,
      contactDisplaySettings,
    } = body;

    const url1 = Array.isArray(urls) && urls[0] ? (urls[0].url ?? "") : (urls !== undefined ? "" : undefined);
    const url1Label = Array.isArray(urls) && urls[0] ? (urls[0].title ?? "") : (urls !== undefined ? "" : undefined);
    const url2 = Array.isArray(urls) && urls[1] ? (urls[1].url ?? "") : (urls !== undefined ? "" : undefined);
    const url2Label = Array.isArray(urls) && urls[1] ? (urls[1].title ?? "") : (urls !== undefined ? "" : undefined);

    // For each param: pass the value if field was in the request, otherwise null (so COALESCE keeps existing)
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
        p(company_name ?? "", "company_name" in body),
        p(industry ?? "", "industry" in body),
        p(business_age ?? "", "business_age" in body),
        p(work_type ?? "", "work_type" in body),
        p(JSON.stringify(Array.isArray(locations) ? locations : []), "locations" in body),
        p(mission_statement ?? "", "mission_statement" in body),
        p(JSON.stringify(Array.isArray(core_values) ? core_values : []), "core_values" in body),
        p(benefits_summary ?? "", "benefits_summary" in body),
        p(custom_background_color ?? "", "custom_background_color" in body),
        p(logo_image_key ?? "", "logo_image_key" in body),
        p(email ?? "", "email" in body),
        p(phoneNumber ?? "", "phoneNumber" in body),
        p(url1 ?? "", "urls" in body),
        p(url2 ?? "", "urls" in body),
        p(url1Label ?? "", "urls" in body),
        p(url2Label ?? "", "urls" in body),
        p(JSON.stringify(contactDisplaySettings), "contactDisplaySettings" in body),
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
