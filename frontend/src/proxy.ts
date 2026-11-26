import {NextResponse,type NextRequest} from "next/server";
import {isServiceResourcePath} from "@/lib/reserved-resources.mjs";
import {hasEnglishRoute} from "@/lib/locale-path";

// App Router's thrown notFound() can return an empty error shell before hydration
// with separate root layouts. Render our localized catch-all normally and set
// its real HTTP status here, without touching known pages or service resources.
export function proxy(request:NextRequest){
 const p=request.nextUrl.pathname;
 const service=isServiceResourcePath(p);
 const staticFile=new Set(["/favicon.ico","/favicon.png","/og-image.png","/logo.png","/dp-tsbride.png","/dp-tsgroom1.png","/vercel.svg","/next.svg","/sw.js","/manifest.webmanifest","/robots.txt","/sitemap.xml"]).has(p);
 if(!hasEnglishRoute(p) && !service && !staticFile)return NextResponse.next({status:404});
 return NextResponse.next();
}
export const config={matcher:["/((?!_next).*)"]};
