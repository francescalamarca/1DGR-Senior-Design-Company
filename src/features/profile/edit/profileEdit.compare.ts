/*
This file is a profile change-detection utility. Its job is to answer one question: did the user actually edit anything?


*/


// src/features/profile/edit/profileEdit.compare.ts
import type { Profile, HigherEdEntry } from "@/src/features/profile/profile.types";

export type DegreeDetail = { degree: string; fieldOfStudy?: string };

export type HigherEdEntryDraft = HigherEdEntry & {
  estimatedGraduation?: string;
  degreeDetails?: DegreeDetail[];
  fieldOfStudy?: string; // back-compat
};

export type DraftProfile = Profile & {
  legalMiddleName?: string;
  higherEducation?: HigherEdEntryDraft[];
  valuesSummary?: { key?: string; label?: string; value?: string }[];
};

export function normalizeFieldOfStudy(input: string) {
  return input.replace(/\s+/g, " ").trim().slice(0, 60);
}

export function normalizeForCompare(p: DraftProfile) {
  const higherEducation = ((p.higherEducation ?? []) as HigherEdEntryDraft[])
    .map((e) => ({
      unitid: String(e.unitid ?? "").trim(),
      label: String(e.label ?? "").trim(),
      degrees: Array.isArray(e.degrees) ? e.degrees.map((d) => String(d).trim()).filter(Boolean).sort() : [],
      estimatedGraduation: String(e.estimatedGraduation ?? "").trim(),
      degreeDetails: Array.isArray(e.degreeDetails)
        ? e.degreeDetails
            .map((d) => ({
              degree: String(d.degree ?? "").trim(),
              fieldOfStudy: String(d.fieldOfStudy ?? "").trim(),
            }))
            .filter((d) => d.degree)
            .sort((a, b) => a.degree.localeCompare(b.degree))
        : [],
    }))
    .filter((e) => e.unitid && e.label)
    .sort((a, b) => a.unitid.localeCompare(b.unitid));

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
    higherEducation,
  };
}

export function hasProfileChanged(a: DraftProfile, b: DraftProfile) {
  return JSON.stringify(normalizeForCompare(a)) !== JSON.stringify(normalizeForCompare(b));
}
