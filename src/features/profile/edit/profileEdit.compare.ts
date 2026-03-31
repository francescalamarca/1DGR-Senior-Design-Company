/*
This file is a profile change-detection utility. Its job is to answer one question: did the user actually edit anything?

these need to match the right variables for company named in data.ts
oompany name
logo
industry type
business
work type
mission statment
core values
benefits summary
custom background color
logo-image

for future: this is what is happening
The ?? (nullish coalescing) is just defensive — if companyName is null or undefined, use "" instead so .trim() doesn't crash.
Then hasProfileChanged is where the actual comparison happens:

a is the original saved profile, b is the current saved profile
flow: clean both - stringify both - are they different? - if yes user has made changes worth saving

.trim() gets rid of leading and trailing white space we know this, cleans
*/


// src/features/profile/edit/profileEdit.compare.ts
import type { Profile, OpenRole } from "@/src/features/profile/profile.types";

//altered to fit company needs and pass ins
//*****  NOTE THESE ARE IN CAMEL CASE
//these values will match the draft.___ variables in the profileEdit.data file
export type DraftProfile = Profile & {
  companyName?: string;
  industry?: string; //company should only be able to be in one industry at a time
  businessAge?: string;
  workType?: string;
  locations?: string[]; //this is an array of strings that will be populated by the companies choice of cities that they operate in
  missionStatement?: string;
  companyCulture?: string;
  coreValues?: string[];
  currentEmployees?: string[]; //added to keep track of current employees to display on profile
  openRoles?: OpenRole[];
  benefitsSummary?: string;
  customBackgroundColor?: string;
  logoImageURI?: string;
  companyEmail: string;
  companyPhone: string;
};


export function normalizeForCompare(p: DraftProfile) {

  return {
    companyName: (p.companyName ?? "").trim(),
    industry: (Array.isArray(p.industry) ? (p.industry[0] ?? "") : (p.industry ?? "")).trim(),
    businessAge:(p.businessAge ?? "").trim(),
    workType: (p.workType ?? "").trim(),
    locations: (p.locations ?? []).map((s) => s.trim()).filter(Boolean).sort(), //same as the coreValues array functionality for checking change
    missionStatement: (p.missionStatement ?? "").trim(),
    companyCulture: (p.companyCulture ?? "").trim(),
    coreValues: (p.coreValues ?? []).map((s) => s.trim()).filter(Boolean).sort(), //the sort is important bc will read as different wityh the same words in different order
    currentEmployees: (p.currentEmployees ?? []).map((s) => s.trim()).filter(Boolean).sort(),
    benefitsSummary: (p.benefitsSummary ?? "").trim(),
    openRoles: (p.openRoles ?? [])
      .map((r) => `${r.id}|${r.title.trim()}|${r.salary.trim()}|${r.postedAt.trim()}|${[...r.skills].sort().join(",")}`)
      .sort(),
    customBackgroundColor: (p.customBackgroundColor ?? "").trim(),
    logoImageURI: (p.avatarImageUri ?? p.logoImageURI ?? "").trim(),
    companyEmail: (p.companyEmail ?? "").trim(),
    companyPhone: (p.companyPhone ?? "").trim(),
  };
}

export function hasProfileChanged(a: DraftProfile, b: DraftProfile) {
  return JSON.stringify(normalizeForCompare(a)) !== JSON.stringify(normalizeForCompare(b));
}
