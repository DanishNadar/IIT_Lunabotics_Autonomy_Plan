import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn, initials } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "xs" | "sm" | "md" | "icon";

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:brightness-110 hover:shadow-[0_6px_20px_-6px_var(--accent)] border border-transparent",
  secondary: "bg-panel-3 text-fg border border-line hover:border-line-strong hover:bg-panel-2",
  outline: "bg-transparent text-fg border border-line hover:bg-panel-2",
  ghost: "bg-transparent text-fg-2 hover:bg-panel-3 hover:text-fg border border-transparent",
  danger: "bg-danger-soft text-danger border border-danger/30 hover:bg-danger/20",
};
const BUTTON_SIZE: Record<ButtonSize, string> = {
  xs: "h-7 px-2.5 text-[13px] gap-1.5",
  sm: "h-9 px-3.5 text-[14px] gap-2",
  md: "h-11 px-5 text-[15px] gap-2",
  icon: "h-9 w-9 justify-center",
};

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }>(
  ({ className, variant = "secondary", size = "sm", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center rounded-md font-medium whitespace-nowrap transition-all duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
        BUTTON_VARIANT[variant],
        BUTTON_SIZE[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export type Tone = "neutral" | "accent" | "info" | "ok" | "warn" | "danger" | "violet";
const TONE: Record<Tone, string> = {
  neutral: "bg-panel-3 text-fg-2 border-line",
  accent: "bg-accent-soft text-accent border-accent/30",
  info: "bg-info-soft text-info border-info/30",
  ok: "bg-ok-soft text-ok border-ok/30",
  warn: "bg-warn-soft text-warn border-warn/30",
  danger: "bg-danger-soft text-danger border-danger/30",
  violet: "bg-violet/10 text-violet border-violet/30",
};

export function Badge({ tone = "neutral", className, children, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[13px] font-medium whitespace-nowrap [&_svg]:size-3.5", TONE[tone], className)} {...props}>
      {children}
    </span>
  );
}

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-line bg-panel/90 shadow-[var(--shadow)] backdrop-blur-sm", className)} {...props} />;
}

export function PanelHeader({ title, icon, actions, className, subtitle }: { title: ReactNode; icon?: ReactNode; actions?: ReactNode; className?: string; subtitle?: ReactNode }) {
  return (
    <div className={cn("flex items-center gap-3 border-b border-line px-5 py-4", className)}>
      {icon && <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent [&_svg]:size-[18px]">{icon}</span>}
      <div className="min-w-0 flex-1">
        <h2 className="text-[17px] font-semibold text-fg">{title}</h2>
        {subtitle && <p className="text-[14px] text-muted">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

const fieldBase = "w-full rounded-md border border-line bg-panel-2 px-3.5 text-[15px] text-fg transition-colors placeholder:text-faint focus:border-info/60 focus:ring-4 focus:ring-info/10 focus:outline-none disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(fieldBase, "h-11", className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldBase, "min-h-[96px] py-3 leading-relaxed", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn(fieldBase, "h-11 pr-8", className)} {...props}>
    {children}
  </select>
));
Select.displayName = "Select";

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-[14px] font-medium text-fg-2">{label}</span>
      {children}
      {hint && <span className="block text-[13px] text-faint">{hint}</span>}
    </label>
  );
}

export function Progress({ value, tone = "info", className, label }: { value: number; tone?: "info" | "ok" | "warn" | "accent" | "danger"; className?: string; label?: string }) {
  const color = { info: "bg-info", ok: "bg-ok", warn: "bg-warn", accent: "bg-accent", danger: "bg-danger" }[tone];
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-panel-3", className)} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cn("h-full rounded-full transition-[width] duration-700 ease-out", color)} style={{ width: `${v}%` }} />
    </div>
  );
}

export function Avatar({ name, color, size = 22, className, title }: { name: string; color?: string; size?: number; className?: string; title?: string }) {
  return (
    <span
      title={title ?? name}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-panel select-none", className)}
      style={{ width: size, height: size, background: color ?? "#475569", fontSize: Math.max(9, size * 0.4) }}
    >
      {initials(name)}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-line bg-panel-3 px-1 font-mono text-xs text-muted">{children}</kbd>;
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {icon && <div className="flex size-14 animate-float items-center justify-center rounded-full bg-panel-3 text-muted [&_svg]:size-7">{icon}</div>}
      <p className="text-[17px] font-semibold text-fg">{title}</p>
      {children && <div className="max-w-md text-[15px] text-muted">{children}</div>}
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-panel-3", className)} />;
}

export function Stat({ label, value, sub, tone, icon }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone; icon?: ReactNode }) {
  const color = tone ? { neutral: "text-fg", accent: "text-accent", info: "text-info", ok: "text-ok", warn: "text-warn", danger: "text-danger", violet: "text-violet" }[tone] : "text-fg";
  return (
    <div className="lift rounded-lg border border-line bg-panel/90 px-5 py-4 shadow-[var(--shadow)]">
      <div className="flex items-center gap-2 text-[14px] font-medium text-muted [&_svg]:size-4">
        {icon}
        {label}
      </div>
      <div className={cn("mt-2 text-[32px] leading-none font-bold tabular-nums", color)}>{value}</div>
      {sub && <div className="mt-2 text-[13px] text-muted">{sub}</div>}
    </div>
  );
}

export function SectionTitle({ children, id, className }: { children: ReactNode; id?: string; className?: string }) {
  return (
    <h3 id={id} className={cn("scroll-mt-24 text-[14px] font-semibold tracking-wide text-muted uppercase", className)}>
      {children}
    </h3>
  );
}
