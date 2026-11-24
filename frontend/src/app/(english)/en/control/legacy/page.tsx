import Page from "@/app/(telugu)/control/legacy/page";import {translateMetadata} from "@/lib/locale-metadata";
export const metadata=translateMetadata({robots:{index:false,follow:false}},"/control/legacy","en");
import {redirect} from "next/navigation";export default function Legacy(){redirect("/en/control/login")}
