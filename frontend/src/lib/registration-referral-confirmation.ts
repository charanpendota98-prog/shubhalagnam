export type RegistrationReferral = {ok:true;referrer_name:string;bonus_credits:number};
export type ReferralCheck = {state:'valid';info:RegistrationReferral}|{state:'invalid'|'unconfirmed'};
export function registrationReferralCheck(status:number,value:unknown,code:string,kind:'click'|'validate'):ReferralCheck {
 const fail:ReferralCheck={state:'unconfirmed'};
 if(status!==200 || !value || typeof value!=='object' || Array.isArray(value))return fail;
 const d=value as Record<string,unknown>;
 if(d.success!==true || d.error || d.detail || typeof d.valid_code!=='boolean')return fail;
 if(d.valid_code===false)return d.ok===true?fail:{state:'invalid'};
 if(d.ok!==true || typeof d.code!=='string' || (d.code.toUpperCase()!==code && (kind!=='validate'||typeof d.alias!=='string'||d.alias.toUpperCase()!==code)))return fail;
 if(typeof d.referrer_name!=='string'||!d.referrer_name.trim()||d.referrer_name.length>200)return fail;
 if(typeof d.bonus_credits!=='number'||!Number.isSafeInteger(d.bonus_credits)||d.bonus_credits<0)return fail;
 return {state:'valid',info:{ok:true,referrer_name:d.referrer_name.trim(),bonus_credits:d.bonus_credits}};
}
