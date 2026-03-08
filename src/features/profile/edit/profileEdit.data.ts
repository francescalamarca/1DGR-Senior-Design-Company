/*
The .data.ts file's job is to be the translator between your app's internal form state and what the API expects. It takes your draft object (what the user has been editing in the form) and shapes it into the exact payload structure your backend wants when you hit save.
So the pattern is always:
form state (DraftProfile) → mapDraftToApiPayload() → API payload

*/



export function mapDraftToApiPayload(draft: DraftProfile) {

  return {
    company_name: draft.legalFirstName ?? "",
    industry: draft.industry ?? "",
    business_age: draft.business_age ?? "",
    work_type: draft.work_type ?? "",
    mission_statement: draft.missionStatement ?? "",
    core_values: Array.isArray(draft.coreValues) ? draft.coreValues: [], //this is an array bc list of values (up to 5)
    benefits_summary: draft.benefitsSummary ?? "",
    custom_background_color: draft.customBackgroundColor ?? "",
    logo_image_key: String(draft.logoImageUri ?? "").includes("://") ? null : (draft.logoImageUri ?? ""), //unsure if this still works for companuy logo, will hold here for now
  };
}
