/*
This file is a profile change-detection utility. Its job is to answer one question: did the user actually edit anything?

these need to match the right variables for company named in data.ts
*/


// src/features/profile/edit/profileEdit.compare.ts
import type { Profile} from "@/src/features/profile/profile.types";

//altered to fit company needs and pass ins
export type DraftProfile = Profile & {
  company_name?: string;
  industry?: string;
  valuesSummary?: { key?: string; label?: string; value?: string }[];
};


export function normalizeForCompare(p: DraftProfile) {

  return {
    preferredName: (p.preferredName ?? "").trim(),
    legalFirstName: (p.legalFirstName ?? "").trim(),
    legalMiddleName: (p.legalMiddleName ?? "").trim(),
    legalLastName: (p.legalLastName ?? "").trim(),
    bio: (p.bio ?? "").trim(),
    workType: String((p as any).workType ?? "").trim(),
    workPreference: String((p as any).workPreference ?? "").trim(),
    residencyStatus: (p.residencyStatus ?? "").trim(),
    industryExperience: (p.industryExperience ?? "").trim(),
    geographicLocation: (p.geographicLocation ?? "").trim(),
    additionalDetails: (p.additionalDetails ?? "").trim(),
    avatarImageUri: (p.avatarImageUri ?? "").trim(),
    industryInterests: (p.industryInterests ?? []).map((s) => s.trim()).filter(Boolean).sort(),
    valuesSummary: Array.isArray((p as any).valuesSummary)
      ? (p as any).valuesSummary
          .map((item: any, idx: number) => ({
            key: String(item?.key ?? `value_${idx + 1}`).trim(),
            label: String(item?.label ?? "").trim(),
            value: String(item?.value ?? "").trim(),
          }))
          .filter((item: any) => item.label || item.value)
      : [],
  };
}

export function hasProfileChanged(a: DraftProfile, b: DraftProfile) {
  return JSON.stringify(normalizeForCompare(a)) !== JSON.stringify(normalizeForCompare(b));
}
