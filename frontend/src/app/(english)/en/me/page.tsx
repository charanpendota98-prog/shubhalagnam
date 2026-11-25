import Page from "@/app/(telugu)/me/page";
import {translateMetadata} from "@/lib/locale-metadata";
import {metadata as originalMetadata} from "@/app/(telugu)/me/page";
export const metadata=translateMetadata(originalMetadata,"/me","en");
export default Page;
