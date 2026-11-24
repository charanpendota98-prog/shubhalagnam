import Link from "@/components/LocaleLink";

type Props = {
  eyebrow?: string;      // small uppercase label
  title: string;
  subtitle?: string;
  telugu?: boolean;      // subtitle ki Telugu font
  align?: "left" | "center";
  action?: { href: string; label: string };
};

export default function SectionHeading({
  eyebrow,
  title,
  subtitle,
  telugu = false,
  align = "left",
  action,
}: Props) {
  const centered = align === "center";
  return (
    <div className={`flex flex-col ${centered ? "items-center text-center" : "md:flex-row md:items-end md:justify-between"} gap-3`}>
      <div className={centered ? "max-w-2xl" : ""}>
        {eyebrow && (
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-gold-deep">
            <span className="w-6 h-px bg-gold" />
            {eyebrow}
          </div>
        )}
        <h2 className="mt-2 text-xl md:text-[26px] font-bold text-maroon leading-snug">{title}</h2>
        {subtitle && (
          <p className={`mt-1.5 text-xs md:text-[13px] text-gray-600 ${telugu ? "telugu" : ""}`}>
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-1.5 self-start px-4 py-2 rounded-full border border-maroon/30 text-maroon text-xs font-bold hover:bg-maroon-soft transition whitespace-nowrap"
        >
          {action.label} <span aria-hidden>→</span>
        </Link>
      )}
    </div>
  );
}
