export type RouteLocale = "te" | "en";
export const PROTOTYPE_LOCALE_PATHS = ["/", "/safety"] as const;
export function baseLocalePath(path: string) { return path === "/en" ? "/" : path.startsWith("/en/") ? path.slice(3) : path; }
export function localeHref(path: string, lang: RouteLocale) {
 const match=path.match(/^([^?#]*)(.*)$/); const base=baseLocalePath(match?.[1] || "/");
 return (lang === "en" && (PROTOTYPE_LOCALE_PATHS as readonly string[]).includes(base) ? base === "/" ? "/en" : `/en${base}` : base)+(match?.[2] || "");
}
