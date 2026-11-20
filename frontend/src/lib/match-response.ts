type Row = Record<string, any>;
const object = (v: unknown): v is Row => !!v && typeof v === 'object' && !Array.isArray(v);
const count = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const text = (v: unknown) => v == null || typeof v === 'string';
const strings = (v: unknown) => v == null || (Array.isArray(v) && v.every(x => typeof x === 'string'));

function validProfile(v: unknown): v is Row {
  if (!object(v) || typeof v.tsap_id !== 'string' || !/^[A-Za-z0-9_-]+$/.test(v.tsap_id)) return false;
  if (!['full_name','gender','caste','sub_caste','education','job','district','state','salary','marital_status','children','star','rasi','height','phone_masked','photo_url','verification','verification_level'].every(k => text(v[k]))) return false;
  if (!(v.age == null || typeof v.age === 'string' || (typeof v.age === 'number' && Number.isFinite(v.age)))) return false;
  if (!['is_verified','phone_verified','photo_verified','id_verified'].every(k => v[k] == null || typeof v[k] === 'boolean')) return false;
  if (!['photo_urls','observations','observations_te'].every(k => strings(v[k]))) return false;
  return v.preference_checks == null || (Array.isArray(v.preference_checks) && v.preference_checks.every((p: unknown) => object(p) && ['key','note','note_en','note_te'].every(k => text(p[k]))));
}

/** Reject unknown results instead of converting a malformed successful read to an empty search. */
export function readMatchPage(value: unknown, offset: number, limit: number): { rows: Row[]; total: number; nextOffset: number; personalFilterNote: string } {
  if (!object(value) || (value.success != null && value.success !== true) || !Array.isArray(value.results) || !count(value.total)) throw new Error('Invalid search response');
  const rows: Row[] = value.results;
  if (rows.length > limit || rows.length > Math.max(0, value.total - offset) || (!rows.length && offset < value.total)) throw new Error('Inconsistent search counts');
  if ((value.count != null && (!count(value.count) || value.count !== rows.length)) || (value.offset != null && value.offset !== offset) || (value.limit != null && value.limit !== limit)) throw new Error('Mismatched search page');
  const ids = new Set<string>();
  for (const row of rows) {
    if (!validProfile(row) || ids.has(row.tsap_id)) throw new Error('Invalid search profile');
    ids.add(row.tsap_id);
  }
  const gothram = value.gothram_exclusion;
  if (gothram != null && (!object(gothram) || typeof gothram.requested !== 'boolean' || typeof gothram.applied !== 'boolean' || !['','sign_in_required','own_gothram_missing'].includes(gothram.reason) || (gothram.applied && !gothram.requested) || (gothram.requested && !gothram.applied && !['sign_in_required','own_gothram_missing'].includes(gothram.reason)) || ((!gothram.requested || gothram.applied) && gothram.reason !== ''))) throw new Error('Invalid personal filter result');
  const missing = new Set(['', '—', '–', '-', 'none', 'not provided', 'na', 'n/a', 'unknown']);
  const displayRows = rows.map(row => {
    const next = { ...row };
    for (const key of ['caste','sub_caste','education','job','district','state','salary','marital_status','children','star','rasi','height','age']) {
      if (typeof next[key] === 'string' && missing.has(next[key].trim().toLowerCase())) next[key] = '';
    }
    return next;
  });
  return { rows: displayRows, total: value.total, nextOffset: rows.length ? offset + rows.length : value.total, personalFilterNote: gothram?.requested && !gothram.applied ? (gothram.reason === 'sign_in_required' ? 'sign_in' : 'own_gothram_missing') : '' };
}
