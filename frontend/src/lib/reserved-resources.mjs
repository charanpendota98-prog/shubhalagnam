// Shared exact first-segment inventory, never a member-facing page namespace.
export const RESERVED_RESOURCE_PREFIXES=['api','_next','cards','photos','voice','docs','openapi','metrics','promo','icons','editorial','.well-known'];
const EXACT_ONLY_PREFIXES=['docs','openapi','metrics'];
export const EXACT_SERVICE_PATHS=['/docs','/openapi.json','/metrics'];
const escaped=RESERVED_RESOURCE_PREFIXES.map(value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
export const RESERVED_RESOURCE_SEGMENT=new RegExp('^(?:'+escaped.join('|')+')$');
/** @param {string} segment */
export function isReservedResourceSegment(segment){return RESERVED_RESOURCE_SEGMENT.test(segment);}
/** @param {string} path */
export function isServiceResourcePath(path){
 const segment=path.split('/')[1]||'';
 return EXACT_SERVICE_PATHS.includes(path)||(RESERVED_RESOURCE_PREFIXES.includes(segment)&&!EXACT_ONLY_PREFIXES.includes(segment));
}
