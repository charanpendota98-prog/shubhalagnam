import {generateMetadata as originalMetadata} from "@/app/(telugu)/r/[code]/layout";import {translateMetadata} from "@/lib/locale-metadata";
export async function generateMetadata(props:{params:Promise<{code:string}>}) {const p=await props.params;return translateMetadata(await originalMetadata({params:Promise.resolve(p)}),"/r/"+encodeURIComponent(p.code),"en");}
export default function Layout({children}:{children:React.ReactNode}){return <>{children}</>}
