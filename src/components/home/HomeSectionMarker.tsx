type HomeSectionMarkerProps = {
  number: string;
  label: string;
  tone?: "light" | "dark";
  align?: "left" | "center";
};

export function HomeSectionMarker({ number, label, tone = "light", align = "left" }: HomeSectionMarkerProps) {
  return (
    <div
      className={`flex items-center gap-3 ${align === "center" ? "justify-center" : "justify-start"} ${tone === "dark" ? "text-ochre-400" : "text-ochre-600"}`}
    >
      <span className="text-base font-extrabold tabular-nums sm:text-lg">{number}</span>
      <span className={`h-px w-9 ${tone === "dark" ? "bg-ochre-400" : "bg-ochre-500"}`} aria-hidden="true" />
      <span className="text-xs font-extrabold uppercase tracking-[0.14em] sm:text-sm">{label}</span>
    </div>
  );
}
