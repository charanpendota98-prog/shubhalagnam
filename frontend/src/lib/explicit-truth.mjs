/** Match the accepted true spellings of profile boolean writes, not JS truthiness.
 * @param {unknown} value
 */
export function isExplicitTrue(value){
 if(value===true||value===1)return true;
 return typeof value==='string'&&['1','true','yes','on','y'].includes(value.trim().toLowerCase());
}
