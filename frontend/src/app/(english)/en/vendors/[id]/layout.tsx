import {generateMetadata as originalMetadata} from "@/app/(telugu)/vendors/[id]/layout";import {translateMetadata} from "@/lib/locale-metadata";
export async function generateMetadata(props:{params:Promise<{id:string}>}) {const p=await props.params;return translateMetadata(await originalMetadata(props),"/vendors/"+encodeURIComponent(p.id),"en");}
export default function Layout({children}:{children:React.ReactNode}){return <>{children}</>}
