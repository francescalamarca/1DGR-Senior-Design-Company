import type { CityRow } from "./profileEdit.ui";

/*

CityRow enables us to read the JSON file and turn it into something readable
sets us up so nothing is read that does not exist or does not want to be read

*/

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

//keeping this so as they search for a city to add, they don't have to scroll through thousands it will come up as they type
export function filterCitiesByQuery(cities: CityRow[], citySearch: string, limit = 300): CityRow[] {
  const q = citySearch.trim().toLowerCase();
  if (!q) return cities.slice(0, limit);
  return cities.filter((c) => c.labelLower.includes(q)).slice(0, limit);
}
