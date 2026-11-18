export function Card({ children, className = "", as: As = "section", ...rest }: { children: React.ReactNode; className?: string; as?: "section" | "div" | "article" } & React.HTMLAttributes<HTMLElement>) {
  return (
    <As className={`rounded-4xl bg-panel p-5 ${className}`} {...rest}>
      {children}
    </As>
  );
}

export function SectionHeading({ title, description, id, actions }: { title: string; description?: React.ReactNode; id?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="max-w-3xl">
        <h2 id={id} className="text-lg font-semibold tracking-tight text-ink">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
