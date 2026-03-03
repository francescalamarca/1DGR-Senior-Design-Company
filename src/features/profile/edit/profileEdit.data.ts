import { type DraftProfile, normalizeFieldOfStudy } from "./profileEdit.compare";
import type { DegreeDetail } from "./profileEdit.higherEd";

export function mapDraftToApiPayload(draft: DraftProfile) {
  const he = Array.isArray(draft.higherEducation) ? (draft.higherEducation as any[]) : [];
  const valuesSummary = Array.isArray((draft as any).valuesSummary) ? (draft as any).valuesSummary : [];

  const higher_education = he
    .map((e) => {
      const unitid = String(e?.unitid ?? "").trim();
      const label = String(e?.label ?? "").trim();
      if (!unitid || !label) return null;

      const rawDegrees = Array.isArray(e?.degrees) ? e.degrees : [];
      const degrees: string[] = Array.from(
        new Set(
          rawDegrees
            .map((d: any) => (typeof d === "string" ? d.trim() : String(d ?? "").trim()))
            .filter((d: string) => d.length > 0)
        )
      );

      let degreeDetails: DegreeDetail[] =
        Array.isArray(e?.degreeDetails)
          ? e.degreeDetails
              .map((d: any) => ({
                degree: String(d?.degree ?? "").trim(),
                fieldOfStudy: normalizeFieldOfStudy(String(d?.fieldOfStudy ?? "")) || undefined,
              }))
              .filter((d: any) => d.degree && degrees.includes(d.degree))
          : [];

      if (!degreeDetails.length && e?.fieldOfStudy) {
        const legacy = normalizeFieldOfStudy(String(e.fieldOfStudy));
        if (legacy) degreeDetails = degrees.map((deg) => ({ degree: deg, fieldOfStudy: legacy }));
      }

      return {
        unitid,
        label,
        degrees,
        estimatedGraduation: String(e?.estimatedGraduation ?? "").trim(),
        degreeDetails,
      };
    })
    .filter(Boolean);

  return {
    legal_first_name: draft.legalFirstName ?? "",
    legal_middle_name: (draft as any).legalMiddleName ?? "",
    legal_last_name: draft.legalLastName ?? "",
    preferred_name: draft.preferredName ?? "",
    bio: draft.bio ?? "",
    work_type: String((draft as any).workType ?? "").trim(),
    work_preference: String((draft as any).workPreference ?? "").trim(),
    work_location_preference: String((draft as any).workPreference ?? "").trim(),
    residency: draft.residencyStatus ?? "",
    location: draft.geographicLocation ?? "",
    experience: draft.industryExperience ?? "",
    industry_interests: Array.isArray(draft.industryInterests) ? draft.industryInterests : [],
    values_summary: valuesSummary
      .map((item: any, idx: number) => {
        const label = String(item?.label ?? "").trim();
        const value = String(item?.value ?? "").trim();
        if (!label && !value) return null;
        return {
          key: String(item?.key ?? `value_${idx + 1}`).trim() || `value_${idx + 1}`,
          label,
          value: value || label,
        };
      })
      .filter(Boolean),
    higher_education,
    avatar_image_key: String(draft.avatarImageUri ?? "").includes("://") ? null : (draft.avatarImageUri ?? ""),
  };
}
