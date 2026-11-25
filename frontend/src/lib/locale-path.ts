import routes from "./locale-routes.json";
export type RouteLocale = "te" | "en";
export const LOCALE_ROUTES: readonly string[] = routes;
export function baseLocalePath(path:string){return path==="/en"?"/":path.startsWith("/en/")?path.slice(3):path;}
export function hasEnglishRoute(path:string){const base=baseLocalePath(path.split(/[?#]/)[0]);return LOCALE_ROUTES.some(route=>new RegExp("^"+route.split("/").map(x=>x.startsWith("[")?"[^/]+":x.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("/")+"/?$").test(base));}
export function localeHref(path:string,lang:RouteLocale){if(!path.startsWith("/")||path.startsWith("//"))return path;const match=path.match(/^([^?#]*)(.*)$/)!;const base=baseLocalePath(match[1]);return (lang==="en"&&hasEnglishRoute(base)?base==="/"?"/en":`/en${base}`:base)+match[2];}

/** Stateful workflows retain their document, typed values, Files and request/result state.
 * The URL still determines a fresh load; an explicit toggle changes only this document.
 * No secret or photo serialization is needed. Keep both locale variants here.
 */
const IN_PLACE_ROUTES = new Set([
  "/", "/register", "/login", "/me", "/verify", "/bureau", "/pricing", "/matches",
  "/requests", "/referral", "/referral/register", "/vendors/register", "/vendors/campaign",
  "/vendors/kit", "/vendors", "/biodata", "/muhurtham", "/porutham", "/events",
  "/channels", "/castes", "/districts", "/search", "/second-marriage", "/spotlight",
  "/stories", "/safety", "/admin", "/admin/photos", "/control", "/control/login",
  "/control/workspace", "/owner", "/growth", "/contact/resolve",
]);
export function usesInPlaceLanguage(path:string){
  const base=baseLocalePath(path.split(/[?#]/)[0]).replace(/\/$/, "") || "/";
  return IN_PLACE_ROUTES.has(base) || /^\/(review|r|search|vendors|org|p)\/[^/]+$/.test(base);
}
