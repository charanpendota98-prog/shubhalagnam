import {notFound} from "next/navigation";
import MissingPage from "@/app/(telugu)/not-found";
export default async function MissingRoute({params}:{params:Promise<{missing:string[]}>}){
 const {missing}=await params;
 // Only genuinely missing resource URLs arrive here. Existing assets and backend
 // rewrites resolve before this catch-all. Ordinary pages keep their localized SSR.
 if(/^(?:api|_next|cards|photos|voice|docs|openapi|metrics|promo|icons|editorial|\.well-known)$/.test(missing[0]||""))notFound();
 return <MissingPage/>;
}
export const metadata={title:"Page not found",robots:{index:false,follow:false},alternates:{canonical:null}};
