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
    company_name: draft.companyName ?? "",
    industry: draft.industry ?? "",
    headquarters: draft.headquarters ?? "",
    business_age: draft.businessAge ?? "",
    work_type: draft.workType ?? "",
    locations: Array.isArray(draft.locations) ? draft.locations: [], //an array of all locations the company is based out of
    mission_statement: draft.missionStatement ?? "",
    company_culture: draft.companyCulture ?? "",
    core_values: Array.isArray(draft.coreValues) ? draft.coreValues: [], //this is an array bc list of values (up to 5)
    current_employees: Array.isArray(draft.currentEmployees) ? draft.currentEmployees: [],
    benefits_summary: draft.benefitsSummary ?? "",
    custom_background_color: draft.customBackgroundColor ?? "",
    open_roles: Array.isArray(draft.openRoles) ? draft.openRoles : [],
    logo_image_key: draft.avatarImageUri ?? draft.logoImageURI ?? "",
    company_email: draft.companyEmail ?? "",
    company_phone: draft.companyPhone ?? "",
    show_industry: draft.showIndustry,
    show_work_type: draft.showWorkType,
    show_locations: draft.showLocations,
    show_core_values: draft.showCoreValues,
    show_age: draft.showAge,
    show_HQ: draft.showHQ,
    show_culture: draft.showCulture,
    show_current_employees: draft.showCurrentEmployees,
    show_open_roles: draft.showOpenRoles,
    show_benefit_Summary: draft.showBenefitsSummary,
    show_email: draft.showEmail,
    show_phone: draft.showPhone,
  }
};