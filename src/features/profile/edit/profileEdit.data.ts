/*
The .data.ts file's job is to be the translator between your app's internal form state and what the API expects. It takes your draft object (what the user has been editing in the form) and shapes it into the exact payload structure your backend wants when you hit save.
So the pattern is always:
form state (DraftProfile) → mapDraftToApiPayload() → API payload

*/

import type { DraftProfile } from "@/src/features/profile/edit/profileEdit.compare";

//the draft.__ values match the names in compare.ts, will pass to api call on backend

export function mapDraftToApiPayload(draft: DraftProfile) {

  //THESE KEYS BEFORE THE : HIT THE DATABASE, LETS MAKE SURE COLUMNS MATCH ON BOTH SIDES
  return {
    company_name: draft.legalFirstName ?? "",
    industry: draft.industry ?? "",
    business_age: draft.businessAge ?? "",
    work_type: draft.workType ?? "",
    locations: Array.isArray(draft.locations) ? draft.locations: [], //an array of all locations the company is based out of
    mission_statement: draft.missionStatement ?? "",
    core_values: Array.isArray(draft.coreValues) ? draft.coreValues: [], //this is an array bc list of values (up to 5)
    benefits_summary: draft.benefitsSummary ?? "",
    custom_background_color: draft.customBackgroundColor ?? "",
    logo_image_key: String(draft.logoImageURI ?? "").includes("://") ? null : (draft.logoImageURI ?? ""), //unsure if this still works for companuy logo, will hold here for now
  };
}
