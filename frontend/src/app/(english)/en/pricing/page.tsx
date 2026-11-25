import Page from "@/app/(telugu)/pricing/page";
export const dynamic = "force-dynamic";
import {translateMetadata} from "@/lib/locale-metadata";
import {metadata as originalMetadata} from "@/app/(telugu)/pricing/page";
export const metadata=translateMetadata(originalMetadata,"/pricing","en");
export default Page;
