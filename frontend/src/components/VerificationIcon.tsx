import { Camera, Smartphone, IdCard, ShieldCheck, GraduationCap, BriefcaseBusiness, FileText, House, UsersRound, Flame, PenLine } from "lucide-react";
const ICONS = { phone: Smartphone, photo: Camera, selfie: Camera, id: IdCard, government_id: IdCard, education: GraduationCap, employment: BriefcaseBusiness, basic: FileText, career: GraduationCap, family: UsersRound, horoscope: Flame, about: PenLine, "📱": Smartphone, "📷": Camera, "📸": Camera, "🤳": Camera, "🪪": IdCard, "🧾": FileText, "🎓": GraduationCap, "💼": BriefcaseBusiness, "🏡": House, "🪔": Flame, "✍️": PenLine };
export function VerificationIcon({ name, className = "mr-1 inline-block h-4 w-4 shrink-0 align-text-bottom" }: { name: string; className?: string }) {
  const Icon = Object.prototype.hasOwnProperty.call(ICONS, name) ? ICONS[name as keyof typeof ICONS] : ShieldCheck;
  return <Icon className={className} aria-hidden="true" focusable="false" />;
}
export function verificationLabel(text: string) {
  return text.replace(/^(?:📱|📷|📸|🤳|🪪|🧾|🎓|💼|🏡|🪔|✍️)\s*/u, "");
}
