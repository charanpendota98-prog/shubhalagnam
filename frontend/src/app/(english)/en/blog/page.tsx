import Page from "@/app/(telugu)/blog/page";
import {translateMetadata} from "@/lib/locale-metadata";
import {metadata as originalMetadata} from "@/app/(telugu)/blog/page";
export const metadata=translateMetadata(originalMetadata,"/blog","en");
export default Page;
