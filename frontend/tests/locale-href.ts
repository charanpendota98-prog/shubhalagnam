import {localeHref as routeHref} from '../src/lib/locale-path';
/** Existing table-driven suites infer string, so validate their locale instead of widening runtime types. */
export function localeHref(path:string,lang:string){if(lang!=='en'&&lang!=='te')throw new Error(`Invalid fixture locale ${lang}`);return routeHref(path,lang)}
