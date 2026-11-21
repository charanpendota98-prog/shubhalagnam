export type PartnerRegistration = {partner_id:string;link?:string;already:boolean};
// The backend returns HTTP 200 for both a new ID and the existing phone's ID.
export function partnerRegistrationResult(status:number,value:unknown,origin:string):PartnerRegistration|null {
 if(status!==200||!value||typeof value!=='object'||Array.isArray(value))return null;
 const d=value as Record<string,unknown>;
 if(d.success!==true||d.error||d.detail||typeof d.partner_id!=='string'||!/^\w[\w-]{0,79}$/.test(d.partner_id))return null;
 if(d.already!==undefined&&typeof d.already!=='boolean')return null;
 let link:string|undefined;
 if(typeof d.link==='string'&&d.link){try{const u=new URL(d.link,origin);if(u.origin===origin&&u.pathname===`/r/${d.partner_id}`&&!u.search&&!u.hash&&!u.username&&!u.password)link=u.href;}catch{/* Preserve the confirmed ID, not an unsafe link. */}}
 return {partner_id:d.partner_id,link,already:d.already===true};
}
export function partnerDashboardResult(status:number,value:unknown,id:string):boolean {
 if(status!==200||!value||typeof value!=='object'||Array.isArray(value))return false;
 const d=value as Record<string,unknown>;
 return d.success===true&&!d.error&&!d.detail&&d.partner_id===id&&['clicks','registrations','paid_count'].every(k=>typeof d[k]==='number'&&Number.isSafeInteger(d[k])&&(d[k] as number)>=0);
}
