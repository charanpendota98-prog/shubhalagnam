import Page from "@/app/(telugu)/castes/[slug]/page";
import {generateMetadata as originalMetadata} from "@/app/(telugu)/castes/[slug]/page";
import {translateMetadata} from "@/lib/locale-metadata";
export async function generateMetadata(props:Parameters<typeof originalMetadata>[0]) {const p=await props.params;const original=await originalMetadata(props);const localized=translateMetadata(original,"/castes/[slug]".replace(/\[([^\]]+)\]/g,(_,k)=>encodeURIComponent(String(p[k as keyof typeof p]))),"en");return {...localized,title:original.title,description:original.description,openGraph:{...localized.openGraph,...original.openGraph,url:localized.openGraph?.url},twitter:original.twitter};}
export default Page;
