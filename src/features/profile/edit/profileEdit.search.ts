// src/features/profile/edit/profileEdit.search.ts

export const STOP_WORDS = new Set(["of", "the", "and", "at", "for", "in", "on", "a", "an", "to", "with", "&"]);

export function normalizeSearchText(input: string) {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(input: string) {
  const base = normalizeSearchText(input);
  if (!base) return [];
  return base.split(" ").map((t) => t.trim()).filter(Boolean);
}

export function makeAcronymFromTokens(tokens: string[]) {
  const letters = tokens
    .filter((t) => t && !STOP_WORDS.has(t))
    .map((t) => t[0])
    .filter(Boolean);
  return letters.join("");
}

export function cityAliases(city: string) {
  const c = normalizeSearchText(city);
  const out: string[] = [];
  if (!c) return out;
  if (c === "los angeles") out.push("la");
  if (c === "new york") out.push("nyc");
  if (c === "saint louis") out.push("st louis", "stl");
  if (c === "saint paul") out.push("st paul");
  return out;
}

export function buildUniversitySearchIndex(u: { label: string; name?: string; city?: string; state?: string }) {
  const parts = [u.label, u.name ?? "", u.city ?? "", u.state ?? "", ...cityAliases(u.city ?? "")];
  return normalizeSearchText(parts.filter(Boolean).join(" "));
}

export type UniversityRow = {
  id: string;
  unitid: string;
  name: string;
  city: string;
  state: string;
  country: string;
  label: string;

  labelLower: string;
  nameLower?: string;
  cityLower?: string;
  stateLower?: string;

  labelSearch: string;
  nameSearch: string;
  citySearch: string;
  stateSearch: string;
  searchIndex: string;
  tokens: string[];
  acronym: string;
};

export function scoreUniversityMatch(args: {
  qRaw: string;
  qNorm: string;
  qTokens: string[];
  qNoSpace: string;
  u: UniversityRow;
}) {
  const { qNorm, qTokens, qNoSpace, u } = args;
  if (qNorm.length < 2) return 0;

  let score = 0;

  if (u.acronym && qNoSpace.length >= 2) {
    if (u.acronym === qNoSpace) score += 300;
    else if (u.acronym.startsWith(qNoSpace)) score += 220;
  }

  if (u.labelSearch.includes(qNorm)) score += 180;
  if (u.nameSearch && u.nameSearch.includes(qNorm)) score += 120;
  if (u.citySearch && u.citySearch.includes(qNorm)) score += 80;
  if (u.stateSearch && u.stateSearch.includes(qNorm)) score += 60;

  if (qTokens.length > 0) {
    let matchedTokens = 0;
    for (const qt of qTokens) {
      if (STOP_WORDS.has(qt)) continue;
      if (qt.length < 2) continue;
      const hit = u.tokens.some((t) => t.startsWith(qt));
      if (hit) matchedTokens += 1;
      else return 0;
    }
    score += matchedTokens * 40;
  }

  return score;
}