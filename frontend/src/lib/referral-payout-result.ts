type Row=Record<string,unknown>;
const row=(x:unknown):x is Row=>!!x&&typeof x==='object'&&!Array.isArray(x);
const money=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=Number.MAX_SAFE_INTEGER;
const requestId=(x:unknown):x is string=>typeof x==='string'&&/^PAY-[A-Za-z0-9-]{1,80}$/.test(x);
export function referralPayoutResult(status:number,value:unknown,id:string,amount:number,upi:string):string|null{
 if(status!==200||!row(value)||value.success!==true||value.ok!==true||value.error||value.detail||!money(value.wallet)||!row(value.request))return null;
 const r=value.request;
 return requestId(r.id)&&r.tsap_id===id&&r.amount===amount&&r.method==='upi'&&r.upi_id===upi&&r.status==='requested'?r.id:null;
}
// Only an explicit, complete and internally consistent read can unlock a retry.
export function referralPayoutRecheck(dashboard:unknown,payouts:unknown,id:string):boolean{
 if(!row(dashboard)||dashboard.ok!==true||dashboard.error||dashboard.detail||!row(dashboard.stats)||!row(payouts)||payouts.success!==true||payouts.error||payouts.detail||!Array.isArray(payouts.payouts))return false;
 const s=dashboard.stats;
 return money(s.wallet)&&money(s.pending_payout)&&money(s.paid_out)&&money(payouts.wallet)&&money(payouts.pending)&&money(payouts.paid_out)&&s.wallet===payouts.wallet&&s.pending_payout===payouts.pending&&s.paid_out===payouts.paid_out&&payouts.payouts.every(r=>row(r)&&requestId(r.id)&&r.tsap_id===id&&money(r.amount)&&['requested','paid','rejected'].includes(String(r.status)));
}
