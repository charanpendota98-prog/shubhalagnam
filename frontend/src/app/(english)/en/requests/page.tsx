import Page from "@/app/(telugu)/requests/page";
import {translateMetadata} from "@/lib/locale-metadata";
import {metadata as originalMetadata} from "@/app/(telugu)/requests/page";
export const metadata=translateMetadata(originalMetadata,"/requests","en");
export default Page;
