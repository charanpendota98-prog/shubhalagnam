const object = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const count = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const id = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]+$/.test(v);
const scalar = (v: unknown) => v == null || typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v));
const strings = (v: unknown) => Array.isArray(v) && v.every(x => typeof x === 'string');
function profile(v: unknown): v is Record<string, any> {
  return object(v) && ['full_name','caste','district','education','job','state'].every(k => v[k] == null || typeof v[k] === 'string') && scalar(v.age);
}
export type SecondaryPanel = 'credits' | 'saved' | 'views' | 'consent' | 'quality';
export function validRequestSecondary(kind: SecondaryPanel, value: unknown, owner: string): value is Record<string, any> {
  if (!object(value) || value.success === false || value.tsap_id !== owner) return false;
  if (kind === 'credits') return count(value.credits);
  if (kind === 'saved') {
    if (!count(value.count) || !Array.isArray(value.saved) || value.count !== value.saved.length) return false;
    const ids = new Set<string>();
    return value.saved.every((v: unknown) => {
      if (!object(v) || !profile(v.profile) || !id(v.profile.tsap_id) || v.profile.tsap_id === owner || ids.has(v.profile.tsap_id) || (v.saved_at != null && typeof v.saved_at !== 'string')) return false;
      ids.add(v.profile.tsap_id); return true;
    });
  }
  if (kind === 'views') {
    if (!['total_views','unique_viewers','today'].every(k => count(value[k])) || value.unique_viewers > value.total_views || value.today > value.total_views || typeof value.whoviewed_unlocked !== 'boolean' || !Array.isArray(value.viewers) || !Array.isArray(value.viewers_masked)) return false;
    const list = value.whoviewed_unlocked ? value.viewers : value.viewers_masked;
    const hidden = value.whoviewed_unlocked ? value.viewers_masked : value.viewers;
    if (hidden.length || list.length > Math.min(20, value.unique_viewers)) return false;
    const ids = new Set<string>();
    return list.every((v: unknown) => {
      if (!profile(v)) return false;
      if (value.whoviewed_unlocked) {
        if (!id(v.tsap_id) || v.tsap_id === owner || ids.has(v.tsap_id)) return false;
        ids.add(v.tsap_id);
      } else if (v.full_name != null || v.tsap_id != null || v.phone != null) return false;
      return true;
    });
  }
  if (kind === 'consent') return count(value.count) && Array.isArray(value.consents) && value.count === value.consents.length && value.consents.every((e: unknown) => object(e) && typeof e.contact_access_granted === 'boolean' && ['at','action','with','request_id'].every(k => e[k] == null || typeof e[k] === 'string'));
  return object(value.completeness) && count(value.completeness.percent) && value.completeness.percent <= 100 && ['important_en','important_telugu'].every(k => value.completeness[k] == null || strings(value.completeness[k])) && ['photo_tip_en','photo_tip_telugu'].every(k => value[k] == null || typeof value[k] === 'string');
}
