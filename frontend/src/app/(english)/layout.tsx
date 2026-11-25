import SiteShell from "@/components/StaticLocaleShell";
export {metadata,viewport} from "@/components/StaticLocaleShell";
export default function Layout({children}:{children:React.ReactNode}) {return <SiteShell initialLang="en">{children}</SiteShell>}
