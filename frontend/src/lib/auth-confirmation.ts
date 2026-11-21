// Endpoint acknowledgements are narrower than HTTP success. Cookie sessions
// deliberately return an empty auth_token, so a bearer token is not required.
type Row = Record<string, unknown>;
const record = (x: unknown): x is Row => !!x && typeof x === "object" && !Array.isArray(x);
export const confirmedAuthAck = (x: unknown): x is Row => record(x) && x.success === true;
export type ConfirmedSession = Row & {tsap_id: string; auth_token: string};
export function confirmedAuthSession(x: unknown): x is ConfirmedSession {
  return confirmedAuthAck(x) && typeof x.tsap_id === "string" && !!x.tsap_id.trim() &&
    x.tsap_id === x.tsap_id.trim() && !/\s|[\u0000-\u001f\u007f]/.test(x.tsap_id) &&
    typeof x.auth_token === "string" && x.auth_token === x.auth_token.trim() &&
    !/[\u0000-\u001f\u007f]/.test(x.auth_token) &&
    (x.has_account === undefined || x.has_account === true);
}
export type ConfirmedPhone = Row & {has_account: boolean; tsap_id: string; auth_token: string};
export function confirmedPhoneVerification(x: unknown): x is ConfirmedPhone {
  if (!confirmedAuthAck(x) || x.phone_verified !== true || typeof x.has_account !== "boolean") return false;
  if (x.has_account) return confirmedAuthSession(x);
  return x.tsap_id === "" && x.auth_token === "";
}
