// utils/degreeMapping.ts

export const DEGREE_ENUM_MAP: Record<string, string> = {
  "Associates": "ASSOCIATES",
  "Bachelors": "BACHELORS",
  "Masters": "MASTERS",
  "PHD": "PHD",
  "Professional Doctorate (MD/JD/etc.)": "PROFESSIONAL_DOCTORATE",
  "Certificate": "CERTIFICATE",
  "Other": "OTHER",
};

export const DEGREE_PRIORITY: Record<string, number> = {
  PHD: 6,
  PROFESSIONAL_DOCTORATE: 5,
  MASTERS: 4,
  BACHELORS: 3,
  ASSOCIATES: 2,
  CERTIFICATE: 1,
  OTHER: 0,
};

/**
 * Sorts higher education entries so the highest level appears first.
 */
type HasDegrees = {
  degrees: string[];
};

export function sortHigherEducation<T extends HasDegrees>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aMax = Math.max(
      ...a.degrees.map(d => {
        const enumKey = DEGREE_ENUM_MAP[d] ?? d;
        return DEGREE_PRIORITY[enumKey] ?? 0;
      })
    );

    const bMax = Math.max(
      ...b.degrees.map(d => {
        const enumKey = DEGREE_ENUM_MAP[d] ?? d;
        return DEGREE_PRIORITY[enumKey] ?? 0;
      })
    );

    return bMax - aMax;
  });
}
