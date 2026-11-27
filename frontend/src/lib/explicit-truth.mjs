/** Match backend read/write true spellings. APIs normalize stored numbers to booleans.
 * Python str.strip whitespace, explicitly shared instead of JS trim (which adds FEFF).
 * @param {unknown} value
 */
export function isExplicitTrue(value){
 if(value===true||value===1)return true;
 return typeof value==='string'&&['1','true','yes','on','y'].includes(value.replace(/^[\u0009-\u000d\u001c-\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009-\u000d\u001c-\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/g,'').toLowerCase());
}
