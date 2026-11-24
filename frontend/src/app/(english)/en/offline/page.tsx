import Page from "@/app/(telugu)/offline/page";
import {translateMetadata} from "@/lib/locale-metadata";
import {metadata as originalMetadata} from "@/app/(telugu)/offline/page";
export const metadata=translateMetadata(originalMetadata,"/offline","en");
export default Page;
