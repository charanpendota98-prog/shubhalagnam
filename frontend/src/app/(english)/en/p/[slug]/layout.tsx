import {generateMetadata as originalMetadata} from "@/app/(telugu)/p/[slug]/layout";import {translateMetadata} from "@/lib/locale-metadata";
export async function generateMetadata(props:{params:Promise<{slug:string}>}) {const p=await props.params;return translateMetadata(await originalMetadata(props),"/p/"+encodeURIComponent(p.slug),"en");}
export default function Layout({children}:{children:React.ReactNode}){return <>{children}</>}
