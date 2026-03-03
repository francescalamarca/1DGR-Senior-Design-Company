import { normalizeFieldOfStudy } from "./profileEdit.compare";

export type DegreeDetail = { degree: string; fieldOfStudy?: string };

export type HigherEdEntryDraftStrict = {
  unitid: string;
  label: string;
  degrees: string[];
  degreeDetails?: DegreeDetail[];
  estimatedGraduation?: string;
};

export function sanitizeHigherEdEntry(input: Partial<HigherEdEntryDraftStrict>): HigherEdEntryDraftStrict {
  const unitid = String(input.unitid ?? "").trim();
  const label = String(input.label ?? "").trim();

  const raw = Array.isArray(input.degrees) ? input.degrees : [];
  const degrees: string[] = Array.from(new Set(raw.map((d) => String(d ?? "").trim()).filter((x) => x.length > 0)));

  const degreeDetails =
    (input.degreeDetails ?? [])
      .map((d) => ({
        degree: String(d.degree ?? "").trim(),
        fieldOfStudy: normalizeFieldOfStudy(String(d.fieldOfStudy ?? "")) || undefined,
      }))
      .filter((d) => d.degree && degrees.includes(d.degree)) || [];

  const estimatedGraduation = String(input.estimatedGraduation ?? "").trim() || undefined;

  return {
    unitid,
    label,
    degrees,
    degreeDetails: degreeDetails.length ? degreeDetails : undefined,
    estimatedGraduation,
  };
}
