import Page from "@/app/(telugu)/biodata/page";
import {translateMetadata} from "@/lib/locale-metadata";
import {metadata as originalMetadata} from "@/app/(telugu)/biodata/page";
export const metadata=translateMetadata(originalMetadata,"/biodata","en");
export default Page;
