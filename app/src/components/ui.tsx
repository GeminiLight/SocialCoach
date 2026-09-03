"use client";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { create } from "zustand";
import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { hueColor } from "@/lib/format";
import { X } from "lucide-react";

/* ───────────── Button ───────────── */
type Variant = "primary" | "secondary" | "ghost" | "danger" | "ink";
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  block?: boolean;
}
export function Button({ variant = "primary", size = "md", loading, block, className, children, disabled, ...rest }: ButtonProps) {
  const base = "press inline-flex items-center justify-center gap-2 font-semibold rounded-full select-none whitespace-nowrap";
  const sizes = { sm: "h-9 px-4 text-[13px]", md: "h-12 px-5 text-[15px]", lg: "h-14 px-6 text-base" }[size];
  const variants: Record<Variant, string> = {
    primary: "bg-accent text-accent-ink hover:bg-accent-deep",
    ink: "bg-ink text-paper hover:opacity-90",
    secondary: "bg-card text-ink border border-line-strong hover:bg-inset",
    ghost: "bg-transparent text-ink-2 hover:bg-inset",
    danger: "bg-danger-soft text-danger hover:opacity-90",
  };
  return (
    <button className={clsx(base, sizes, variants[variant], block && "w-full", className)} disabled={disabled || loading} {...rest}>
      {loading ? <Spinner /> : children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1", className)} aria-label="loading">
      <span className="dot" /><span className="dot" /><span className="dot" />
    </span>
  );
}

export function IconButton({ className, children, label, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button aria-label={label} title={label} className={clsx("press h-10 w-10 inline-flex items-center justify-center rounded-full text-ink-2 hover:bg-inset", className)} {...rest}>
      {children}
    </button>
  );
}

/* ───────────── Chip ───────────── */
export function Chip({ active, children, onClick, className, style, small }: { active?: boolean; children: ReactNode; onClick?: () => void; className?: string; style?: React.CSSProperties; small?: boolean }) {
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      onClick={onClick}
      style={style}
      className={clsx(
        "press inline-flex items-center gap-1.5 rounded-full border whitespace-nowrap",
        small ? "h-7 px-2.5 text-[12px]" : "h-9 px-3.5 text-[13px] font-medium",
        active ? "bg-ink text-paper border-ink" : "bg-card border-line text-ink-2 hover:border-line-strong",
        className,
      )}
    >
      {children}
    </Comp>
  );
}

/* ───────────── Avatar ───────────── */
export function Avatar({ name, hue, size = 40, className }: { name: string; hue: number; size?: number; className?: string }) {
  const initial = Array.from(name.trim())[0] ?? "?";
  return (
    <span
      className={clsx("inline-flex items-center justify-center rounded-full shrink-0 font-semibold display", className)}
      style={{ width: size, height: size, background: hueColor(hue), color: `oklch(0.32 0.08 ${hue})`, fontSize: size * 0.42, border: `1px solid oklch(0.78 0.08 ${hue})` }}
      aria-hidden
    >
      {initial}
    </span>
  );
}

/* ───────────── Stars (objectives) ───────────── */
export function Stars({ n, of = 3, size = 18 }: { n: number; of?: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${n}/${of}`}>
      {Array.from({ length: of }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i < n ? "var(--gold)" : "none"} stroke={i < n ? "var(--gold)" : "var(--line-strong)"} strokeWidth={1.8} strokeLinejoin="round">
          <path d="M12 3.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 17l-5.4 3 1.2-6L3.3 9.8l6.1-.7z" />
        </svg>
      ))}
    </span>
  );
}

/* ───────────── Staged loader ───────────── */
export function Stages({ steps, title, intervalMs = 2600 }: { steps: string[]; title: string; intervalMs?: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => Math.min(x + 1, steps.length - 1)), intervalMs);
    return () => clearInterval(id);
  }, [steps.length, intervalMs]);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Spinner />
        <p className="text-[15px] font-medium text-ink">{title}</p>
      </div>
      <ol className="flex flex-col gap-2.5">
        {steps.map((s, k) => (
          <li key={s} className={clsx("flex items-center gap-3 text-[14px] transition-colors duration-300", k < i ? "text-ink-3" : k === i ? "text-ink" : "text-ink-4")}>
            <span className={clsx("h-5 w-5 rounded-full border inline-flex items-center justify-center text-[11px] shrink-0 transition-colors", k < i ? "bg-ink border-ink text-paper" : k === i ? "border-ink text-ink" : "border-line text-ink-4")}>
              {k < i ? "✓" : k + 1}
            </span>
            <span className={clsx(k === i && "relative overflow-hidden rounded px-1 -mx-1")}>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ───────────── Bottom sheet ───────────── */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-ink/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal
            className="fixed z-50 left-1/2 bottom-0 w-full max-w-[480px] -translate-x-1/2 bg-paper rounded-t-[24px] border-t border-line max-h-[88dvh] flex flex-col"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between px-5 pt-3 pb-2">
              <span className="h-1 w-10 rounded-full bg-line-strong absolute left-1/2 -translate-x-1/2 top-2" />
              <h3 className="display text-[18px] mt-3">{title}</h3>
              <IconButton label="close" onClick={onClose} className="mt-2 -mr-2"><X size={18} /></IconButton>
            </div>
            <div className="overflow-y-auto px-5 pb-safe pb-6">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ───────────── Toast ───────────── */
interface ToastState { msg: string | null; kind: "info" | "error"; show: (msg: string, kind?: "info" | "error") => void; hide: () => void }
export const useToast = create<ToastState>((set) => ({
  msg: null,
  kind: "info",
  show: (msg, kind = "info") => {
    set({ msg, kind });
    setTimeout(() => set({ msg: null }), 2800);
  },
  hide: () => set({ msg: null }),
}));
export function Toaster() {
  const { msg, kind } = useToast();
  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className={clsx("fixed left-1/2 -translate-x-1/2 bottom-24 z-[60] px-4 py-2.5 rounded-full text-[14px] shadow-lg border", kind === "error" ? "bg-danger-soft text-danger border-danger/20" : "bg-ink text-paper border-ink")}
        >
          {msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───────────── Empty state ───────────── */
export function Empty({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="py-14 px-6 text-center flex flex-col items-center gap-3">
      <div className="h-12 w-12 rounded-full border border-dashed border-line-strong" />
      <p className="display text-[18px]">{title}</p>
      {body && <p className="text-[14px] text-ink-3 max-w-[32ch]">{body}</p>}
      {action}
    </div>
  );
}

/* ───────────── Section header ───────────── */
export function SectionTitle({ children, right, className }: { children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={clsx("flex items-end justify-between gap-3", className)}>
      <h2 className="display text-[20px] leading-tight">{children}</h2>
      {right}
    </div>
  );
}

/* ───────────── Page transition wrapper ───────────── */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.main initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }} className={clsx("px-5", className)}>
      {children}
    </motion.main>
  );
}
