import Page from "@/app/(telugu)/search/[id]/page";
import {generateMetadata as originalMetadata} from "@/app/(telugu)/search/[id]/page";
import {translateMetadata} from "@/lib/locale-metadata";
export async function generateMetadata(props:Parameters<typeof originalMetadata>[0]) {const p=await props.params;return translateMetadata(await originalMetadata(props),"/search/[id]".replace(/\[([^\]]+)\]/g,(_,k)=>encodeURIComponent(String(p[k as keyof typeof p]))),"en");}
export default Page;
