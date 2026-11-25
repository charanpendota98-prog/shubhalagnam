import Page from "@/app/(telugu)/vendors/page";
import {translateMetadata} from "@/lib/locale-metadata";
import {metadata as originalMetadata} from "@/app/(telugu)/vendors/page";
export const metadata=translateMetadata(originalMetadata,"/vendors","en");
export default Page;
