/**
 * Build-time directory load.
 *
 * The CSV is inlined by Vite at build time, so the published site is static HTML with no
 * data fetch and no runtime dependency on anything.
 */

import csv from '../../../../data/resources.seed.csv?raw';
import { parseDirectoryOrThrow } from './parse';
import type { ResourceField, ResourceRecord } from './types';

/** Throws during build if the CSV is malformed, so a bad row cannot ship. */
export function loadDirectory(): ResourceRecord[] {
  return parseDirectoryOrThrow(csv).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Human labels. Written from the reader's side of the screen — someone deciding whether a
 * place will take the person in front of them, not someone reading a schema.
 */
export const FIELD_LABELS: Partial<Record<ResourceField, string>> = {
  accepts: 'Who they take',
  pets: 'Pets',
  sobriety: 'Using',
  id_required: 'ID needed',
  referral_required: 'Referral needed',
  sex_offender_ok: 'Registry restrictions',
  curfew: 'Curfew',
  max_stay: 'Max stay',
  belongings: 'Belongings',
  accessibility: 'Access',
  languages: 'Languages',
  cost: 'Cost',
  hours: 'Open',
  intake_hours: 'Intake',
  seasonal: 'Season',
  capacity_signal: 'Usually',
  address: 'Address',
  phone: 'Phone'
};

/** The fields that answer "will they actually take this person, tonight?" */
export const INTAKE_FIELDS: ResourceField[] = [
  'accepts', 'pets', 'sobriety', 'id_required', 'referral_required',
  'sex_offender_ok', 'curfew', 'max_stay', 'belongings', 'accessibility',
  'languages', 'cost'
];

export const AVAILABILITY_FIELDS: ResourceField[] = [
  'hours', 'intake_hours', 'seasonal', 'capacity_signal'
];

/** Readable labels for enum values, so the page never shows a snake_case token. */
export const VALUE_LABELS: Record<string, string> = {
  single_men: 'single men',
  single_women: 'single women',
  couples: 'couples',
  families: 'families',
  minors: 'minors',
  trans_inclusive: 'trans inclusive',

  service_only: 'service animals only',
  kennel_onsite: 'kennel on site',

  sober_required: 'sobriety required',
  harm_reduction_ok: 'harm reduction OK',
  no_questions: 'no questions asked',

  helps_but_not_required: 'helps, but not required',

  storage_provided: 'storage provided',
  carry_on_only: 'what you can carry',
  size_limit: 'size limit',

  wheelchair: 'wheelchair accessible',
  ground_floor: 'ground floor',

  sliding: 'sliding scale',

  year_round: 'year round',
  winter_only: 'winter only',
  summer_only: 'summer only',
  weather_activated: 'weather activated',

  usually_available: 'usually has space',
  often_full: 'often full',
  call_first: 'call first',

  shelter: 'Shelter', meal: 'Meals', hygiene: 'Showers & laundry', medical: 'Medical',
  harm_reduction: 'Harm reduction', warming: 'Warming centre', cooling: 'Cooling centre',
  storage: 'Storage', legal: 'Legal', id_docs: 'ID & documents', mail: 'Mail',
  charging: 'Charging', veterinary: 'Veterinary', youth: 'Youth', dv: 'Domestic violence',
  detox: 'Detox', daytime: 'Drop-in'
};

/** Formats a single value. Never pass it an already-joined string. */
export function labelValue(raw: string): string {
  return VALUE_LABELS[raw] ?? raw.replace(/_/g, ' ');
}

/** Formats each value, then joins. */
export function labelValues(values: string[]): string {
  return values.map(labelValue).join(', ');
}
