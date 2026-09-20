"use client";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { create } from "zustand";
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { AvatarFigure } from "@/data/avatars";
import { isReady, openModelSheet, useByok } from "@/lib/byok";
import { useLang } from "@/store/useApp";
import { t } from "@/lib/i18n";
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
  const base = "press min-w-0 [&>svg]:shrink-0 inline-flex items-center justify-center gap-2 font-semibold rounded-full select-none text-center leading-snug";
  const sizes = { sm: "min-h-11 px-4 text-[13px]", md: "h-12 px-5 text-[15px]", lg: "h-14 px-6 text-base" }[size];
  const variants: Record<Variant, string> = {
    primary: "bg-action text-accent-ink hover:bg-action-hover",
    ink: "bg-ink text-paper hover:opacity-90",
    secondary: "bg-card text-ink border border-line-strong hover:bg-inset",
    ghost: "bg-transparent text-ink-2 hover:bg-inset",
    danger: "bg-danger-soft text-danger hover:opacity-90",
  };
  return (
    <button className={clsx(base, sizes, variants[variant], block && "w-full", className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  const lang = useLang();
  return (
    <span className={clsx("inline-flex shrink-0 items-center gap-1", className)} aria-label={t(lang, "loading")}>
      <span className="dot" /><span className="dot" /><span className="dot" />
    </span>
  );
}

export function IconButton({ className, children, label, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button aria-label={label} title={label} className={clsx("press h-11 w-11 shrink-0 inline-flex items-center justify-center rounded-full text-ink-2 hover:bg-inset", className)} {...rest}>
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
      aria-pressed={onClick ? !!active : undefined}
      style={style}
      className={clsx(
        "press inline-flex items-center gap-1.5 rounded-full border whitespace-nowrap",
        small ? (onClick ? "min-h-11 px-3 text-[12px]" : "min-h-9 px-2.5 text-[12px]") : "min-h-11 px-3.5 text-[13px] font-medium",
        active ? "bg-ink text-paper border-ink" : "bg-card border-line text-ink-2 hover:border-line-strong",
        className,
      )}
    >
      {children}
    </Comp>
  );
}

/* ───────────── Switch ───────────── */

/**
 * Pill switch. The knob is anchored with an explicit `left` — never rely on
 * the static position of an absolutely positioned child, which is affected by
 * the button's centered text-align and lets the knob drift out of the track.
 * Touch target: 48×44; visual track stays 48×28.
 * Geometry: 48×28 border-box track (1px border → 46×26 inside), 20px knob,
 * 3px inset → ON travel is exactly 20px, gaps symmetric on all four sides.
 */
export function Switch({ checked, onChange, label, className }: { checked: boolean; onChange: (v: boolean) => void; label: string; className?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={clsx("press relative h-11 w-12 shrink-0 rounded-full", className)}
    >
      <span aria-hidden className={clsx("absolute inset-x-0 top-2 h-7 rounded-full border", checked ? "bg-ink border-ink" : "bg-ink-3 border-ink-3")}>
        <span className={clsx("absolute left-[3px] top-[3px] h-5 w-5 rounded-full bg-card transition-transform duration-200", checked ? "translate-x-5" : "translate-x-0")} style={{ transitionTimingFunction: "var(--ease-out)" }} />
      </span>
    </button>
  );
}

/* ───────────── Avatar ───────────── */
/**
 * A character's presence. `seed` decides the figure and defaults to the name,
 * which is stable for corpus characters; the learner passes their own so a
 * selection can persist it. An authored `hue` selects a muted palette; a saved
 * portrait carries its own palette. See `data/avatars`.
 */
export function Avatar({
  name,
  hue,
  size = 40,
  seed,
  className,
}: {
  name: string;
  hue: number;
  size?: number;
  seed?: string;
  className?: string;
}) {
  return <AvatarFigure seed={seed ?? name} hue={hue} size={size} className={className} />;
}

/* ───────────── Stars (objectives) ───────────── */
export function Stars({ n, of = 3, size = 18 }: { n: number; of?: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-1" role="img" aria-label={`${n}/${of}`}>
      {Array.from({ length: of }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i < n ? "var(--gold)" : "none"} stroke={i < n ? "var(--gold)" : "var(--line-strong)"} strokeWidth={1.8} strokeLinejoin="round">
          <path d="M12 3.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 17l-5.4 3 1.2-6L3.3 9.8l6.1-.7z" />
        </svg>
      ))}
    </span>
  );
}

/* ───────────── Staged loader ───────────── */
/**
 * Context for an LLM wait, without claiming unreported stage completion.
 * Past `slowAfterMs` it also offers to switch
 * to the learner's own model — set that per call site to mean "slower than
 * usual for this task", not "this task takes a while", or the offer is noise.
 */
export function Stages({ steps, title, slowAfterMs = 25000 }: { steps: string[]; title: string; slowAfterMs?: number }) {
  const lang = useLang();
  const ownModel = isReady(useByok());
  const [slow, setSlow] = useState(false);
  // A long wait is the moment the offer actually means something. Say nothing to
  // someone already on their own endpoint — their slowness is not ours to explain.
  useEffect(() => {
    if (ownModel) return;
    const id = setTimeout(() => setSlow(true), slowAfterMs);
    return () => clearTimeout(id);
  }, [ownModel, slowAfterMs]);
  return (
    <div className="flex flex-col gap-5" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <Spinner />
        <p className="text-[15px] font-medium text-ink">{title}</p>
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-ink-3 leading-relaxed">{t(lang, "waiting_context")}</p>
        <ul className="flex flex-col gap-2">
          {steps.map((step) => (
            <li key={step} className="flex items-start gap-3 text-[14px] text-ink-2 leading-relaxed">
              <span aria-hidden className="h-1 w-1 mt-2.5 rounded-full bg-ink-3 shrink-0" />
              {step}
            </li>
          ))}
        </ul>
      </div>
      {slow && !ownModel && (
        <div className="dotted pt-3 flex items-center justify-between gap-3">
          <span className="text-[12px] text-ink-3">{t(lang, "pr_slow_note")}</span>
          <button onClick={openModelSheet} className="press shrink-0 min-h-11 px-3 rounded-full border border-dashed border-line-strong text-[12px] font-medium text-ink-2 hover:bg-inset">
            {t(lang, "pr_slow_action")}
          </button>
        </div>
      )}
    </div>
  );
}

/* ───────────── Bottom sheet ───────────── */
export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; footer?: ReactNode }) {
  const lang = useLang();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (!open) { element.close(); return; }
    const previousFocus = document.activeElement;
    element.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open]);
  if (!open) return null;
  return (
    <dialog
      ref={dialog}
      aria-label={title || t(lang, "dialog_label")}
      className="sheet-dialog"
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
        )).filter((element) => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose();
      }}
    >
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-line shrink-0">
        <h2 className="display text-[20px]">{title}</h2>
        <IconButton label={t(lang, "close")} onClick={onClose}><X size={18} /></IconButton>
      </div>
      <div className="overflow-y-auto px-5 pt-4 pb-safe pb-6">{children}</div>
      {footer && <div className="shrink-0 border-t border-line bg-card px-5 py-4 pb-safe">{footer}</div>}
    </dialog>
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
          className={clsx("fixed left-1/2 -translate-x-1/2 bottom-24 lg:bottom-8 z-[60] px-4 py-2.5 rounded-full text-[14px] shadow-lg border", kind === "error" ? "bg-danger-soft text-danger border-danger/20" : "bg-ink text-paper border-ink")}
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
    <motion.main initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }} className={clsx("px-5 md:px-8 lg:px-10", className)}>
      {children}
    </motion.main>
  );
}

/* ───────────── Bottom action bar ───────────── */
/**
 * The page's single bottom action. `.bar-fixed` floats it over the content on
 * phone and tablet (width tracking the sheet), then hands it back to the
 * document flow at `lg` so the page can place it at the end of a column.
 */
export function BottomBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("bar-fixed z-20", className)}>{children}</div>;
}

/* ───────────── Marginalia ───────────── */
/**
 * The desktop right-hand column: notes in the page margin, not a dashboard
 * panel — dashed rule, quieter ink, smaller type.
 *
 * By default it is `display: contents` below `lg`, so its children keep
 * flowing in the parent stack exactly as they did before. Pass `lgOnly` when
 * the content has no place on a phone at all.
 */
export function Marginalia({ children, className, lgOnly }: { children: ReactNode; className?: string; lgOnly?: boolean }) {
  return (
    <aside className={clsx(lgOnly ? "hidden" : "contents", "lg:flex lg:flex-col lg:gap-7 lg:pl-6 lg:border-l lg:border-dashed lg:border-line-strong lg:[&>*]:shrink-0", className)}>
      {children}
    </aside>
  );
}
