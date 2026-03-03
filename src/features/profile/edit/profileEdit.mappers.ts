import type { CityRow } from "./profileEdit.ui";
import {
  buildUniversitySearchIndex,
  makeAcronymFromTokens,
  normalizeSearchText,
  scoreUniversityMatch,
  tokenize,
  type UniversityRow,
} from "./profileEdit.search";

export function mapCitiesFromJson(raw: unknown): CityRow[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((c: any, idx: number) => {
      const city = String(c.city ?? "").trim();
      const state = String(c.state_name ?? "").trim();
      const label = city && state ? `${city}, ${state}, USA` : city || state || "";

      return {
        id: String(c.id ?? `${city}-${state}-${idx}`),
        city,
        state,
        population: Number(c.population ?? 0),
        label,
        labelLower: label.toLowerCase(),
        cityLower: city.toLowerCase(),
      } as CityRow;
    })
    .filter((x) => x.label);
}

export function filterCitiesByQuery(cities: CityRow[], citySearch: string, limit = 300): CityRow[] {
  const q = citySearch.trim().toLowerCase();
  if (!q) return cities.slice(0, limit);
  return cities.filter((c) => c.labelLower.includes(q)).slice(0, limit);
}

export function mapUniversitiesFromJson(raw: unknown): UniversityRow[] {
  if (!Array.isArray(raw)) return [];

  const mapped: UniversityRow[] = raw.map((u: any, idx: number) => {
    const label = String(u.label ?? "").trim();
    const name = String(u.name ?? "").trim();
    const city = String(u.city ?? "").trim();
    const state = String(u.state ?? "").trim();
    const unitid = String(u.unitid ?? u.id ?? `${idx}`);

    const labelSearch = normalizeSearchText(label);
    const nameSearch = normalizeSearchText(name);
    const citySearch = normalizeSearchText(city);
    const stateSearch = normalizeSearchText(state);

    const searchIndex = buildUniversitySearchIndex({ label, name, city, state });
    const tokens = tokenize(searchIndex);

    const acronymBaseTokens = tokenize(label || name);
    const acronym = makeAcronymFromTokens(acronymBaseTokens);

    return {
      id: String(u.id ?? `${idx}`),
      unitid,
      name,
      city,
      state,
      country: String(u.country ?? "USA").trim(),
      label,
      labelLower: label.toLowerCase(),
      nameLower: name.toLowerCase(),
      cityLower: city.toLowerCase(),
      stateLower: state.toLowerCase(),
      labelSearch,
      nameSearch,
      citySearch,
      stateSearch,
      searchIndex,
      tokens,
      acronym,
    };
  });

  return mapped.filter((u) => u.label && u.unitid && u.name).sort((a, b) => a.label.localeCompare(b.label));
}

export function filterUniversitiesByQuery(universities: UniversityRow[], higherEdSearch: string, limit = 120): UniversityRow[] {
  const qRaw = higherEdSearch.trim();
  const qNorm = normalizeSearchText(qRaw);
  if (qNorm.length < 2) return [];

  const qTokens = tokenize(qNorm);
  const qNoSpace = qTokens.join("");

  const scored: { u: UniversityRow; score: number }[] = [];
  for (const u of universities) {
    const score = scoreUniversityMatch({ qRaw, qNorm, qTokens, qNoSpace, u });
    if (score > 0) scored.push({ u, score });
  }

  scored.sort((a, b) => {
    const d = b.score - a.score;
    if (d !== 0) return d;
    return a.u.label.localeCompare(b.u.label);
  });

  return scored.slice(0, limit).map((x) => x.u);
}
