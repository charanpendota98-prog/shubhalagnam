import Page, {metadata as originalMetadata} from "@/app/(telugu)/review/[token]/page";import {translateMetadata} from "@/lib/locale-metadata";
export async function generateMetadata({params}:{params:Promise<{token:string}>}){const {token}=await params;return translateMetadata(originalMetadata,"/review/"+encodeURIComponent(token),"en");}
export default Page;
