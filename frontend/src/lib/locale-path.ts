import routes from "./locale-routes.json";
export type RouteLocale = "te" | "en";
export const LOCALE_ROUTES: readonly string[] = routes;
export function baseLocalePath(path:string){return path==="/en"?"/":path.startsWith("/en/")?path.slice(3):path;}
export function hasEnglishRoute(path:string){const base=baseLocalePath(path.split(/[?#]/)[0]);return LOCALE_ROUTES.some(route=>new RegExp("^"+route.split("/").map(x=>x.startsWith("[")?"[^/]+":x.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("/")+"/?$").test(base));}
export function localeHref(path:string,lang:RouteLocale){if(!path.startsWith("/")||path.startsWith("//"))return path;const match=path.match(/^([^?#]*)(.*)$/)!;const base=baseLocalePath(match[1]);return (lang==="en"&&hasEnglishRoute(base)?base==="/"?"/en":`/en${base}`:base)+match[2];}

/** These pages hold consumed tokens or view-counted state. Language changes stay in place. */
export function usesInPlaceLanguage(path:string){const base=baseLocalePath(path.split(/[?#]/)[0]);return /^\/review\/[^/]+\/?$/.test(base)||base==="/contact/resolve"||/^\/r\/[^/]+\/?$/.test(base);}
