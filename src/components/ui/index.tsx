import React, { useState, useRef, useEffect, useId } from 'react';
import { Loader2, Search, X, CheckCircle2, AlertCircle, Info, XCircle, FileText, Pencil, Trash2 } from 'lucide-react';
import { REPORT_PERIOD_OPTIONS, type ReportPeriod } from '../../utils/reportPeriod';
import {
  clampQuantity, formatQuantity, parseQuantity, quantityStep, type QuantityRule,
} from '../../utils/quantity';

// ─── Badge ────────────────────────────────────────────────────────────────────
type BadgeVariant =
  | 'pending' | 'inprogress' | 'ready' | 'released' | 'cancelled'
  | 'paid' | 'unpaid' | 'partial' | 'refunded'
  | 'active' | 'inactive'
  | 'sent' | 'failed'
  | 'low' | 'normal' | 'critical'
  | 'admin' | 'staff'
  | 'blue' | 'green' | 'yellow' | 'red' | 'gray';

const badgeStyles: Record<BadgeVariant, string> = {
  pending:    'bg-slate-100 text-slate-700 border-slate-200',
  inprogress: 'bg-blue-50 text-blue-700 border-blue-200',
  ready:      'bg-indigo-50 text-indigo-700 border-indigo-200',
  released:   'bg-slate-100 text-slate-700 border-slate-200',
  cancelled:  'bg-red-50 text-red-700 border-red-200',
  paid:       'bg-green-50 text-green-700 border-green-200',
  unpaid:     'bg-red-50 text-red-700 border-red-200',
  partial:    'bg-amber-50 text-amber-700 border-amber-200',
  refunded:   'bg-slate-100 text-slate-700 border-slate-200',
  active:     'bg-green-50 text-green-700 border-green-200',
  inactive:   'bg-slate-100 text-slate-600 border-slate-200',
  sent:       'bg-blue-50 text-blue-700 border-blue-200',
  failed:     'bg-red-50 text-red-700 border-red-200',
  low:        'bg-amber-50 text-amber-700 border-amber-200',
  normal:     'bg-slate-100 text-slate-700 border-slate-200',
  critical:   'bg-red-50 text-red-700 border-red-200',
  admin:      'bg-blue-50 text-blue-700 border-blue-200',
  staff:      'bg-slate-100 text-slate-700 border-slate-200',
  blue:       'bg-blue-50 text-blue-700 border-blue-200',
  green:      'bg-green-50 text-green-700 border-green-200',
  yellow:     'bg-amber-50 text-amber-700 border-amber-200',
  red:        'bg-red-50 text-red-700 border-red-200',
  gray:       'bg-slate-100 text-slate-600 border-slate-200',
};

const badgeLabels: Partial<Record<BadgeVariant, string>> = {
  inprogress: 'In Progress',
  ready:      'Ready for Pickup',
  released:   'Released',
  partial:    'Partially Paid',
  refunded:   'Refunded',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children?: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'gray', children, className = '' }: BadgeProps) {
  const label = children ?? (badgeLabels[variant] ?? variant);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${badgeStyles[variant]} ${className}`}>
      {label}
    </span>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type BtnSize = 'xs' | 'sm' | 'md' | 'lg';

const btnBase = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-smooth cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden';
const btnVariants: Record<BtnVariant, string> = {
  primary:   'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 active:shadow-md shadow-sm',
  secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:shadow-md hover:-translate-y-0.5 active:scale-95 border border-slate-200 hover:border-slate-300 shadow-sm',
  danger:    'bg-white text-red-600 border border-red-300 hover:bg-red-600 hover:text-white hover:border-red-600 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 shadow-sm',
  ghost:     'bg-transparent text-slate-600 border border-transparent hover:bg-slate-100 hover:text-slate-900 hover:shadow-sm hover:-translate-y-0.5 active:scale-95',
  outline:   'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:border-slate-400 hover:shadow-md hover:-translate-y-0.5 active:scale-95 shadow-sm',
};
const btnSizes: Record<BtnSize, string> = {
  xs: 'px-2.5 py-1.5 text-xs sm:px-3 sm:py-2',
  sm: 'px-3 py-2 text-xs sm:text-sm sm:px-4 sm:py-2.5',
  md: 'px-4 py-2.5 text-sm sm:px-5 sm:py-3 md:text-base',
  lg: 'px-5 py-3 text-base sm:px-6 sm:py-3.5 md:text-lg',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: React.ReactNode;
  loading?: boolean;
}

export function Button({ variant = 'primary', size = 'md', icon, loading, children, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`${btnBase} ${btnVariants[variant]} ${btnSizes[size]} ${className}`}
      {...props}
      disabled={loading || props.disabled}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void; }) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-sm transition-smooth ${onClick ? 'cursor-pointer hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 hover:bg-blue-50/30' : 'hover:shadow'} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 ${className}`}>{children}</div>;
}
export function CardBody({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-4 sm:px-6 py-4 sm:py-5 ${className}`}>{children}</div>;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
interface KpiCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  trend?: { value: string; up: boolean };
  iconBg?: string;
  onClick?: () => void;
}
export function KpiCard({ title, value, subtext, icon, trend, onClick }: KpiCardProps) {
  return (
    <div
      onClick={onClick}
      className={`p-3 sm:p-4 md:p-5 flex flex-col justify-between h-full min-h-25 sm:min-h-27.5 md:min-h-30 bg-white rounded-lg sm:rounded-xl border border-slate-200 shadow-sm transition-smooth ${onClick ? 'cursor-pointer hover:border-blue-300 hover:shadow-lg hover:-translate-y-1 hover:bg-linear-to-br hover:from-blue-50/50 hover:to-blue-50/30' : 'hover:border-slate-300 hover:shadow'}`}
    >
      {/* Upper-left: icon + title */}
      <div className="flex items-center gap-2 mb-2 sm:mb-3">
        {icon && <div className="text-slate-400 shrink-0 w-4 h-4 sm:w-5 sm:h-5">{icon}</div>}
        <div className="text-[10px] sm:text-xs md:text-sm font-bold text-slate-500 tracking-tight leading-tight line-clamp-2">{title}</div>
      </div>
      {/* Lower-right: value + subtext/trend */}
      <div className="flex flex-col items-end justify-end mt-auto text-right">
        <div className={`text-base sm:text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight num`}>{value}</div>
        {(subtext || trend) && (
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
            {trend && (
              <span className={`text-[10px] sm:text-[11px] font-bold ${trend.up ? 'text-green-600' : 'text-red-600'}`}>
                {trend.up ? '↑' : '↓'} {trend.value}
              </span>
            )}
            {subtext && <span className="text-[10px] sm:text-[11px] font-medium text-slate-400">{subtext}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Input / Select / Textarea ────────────────────────────────────────────────
// Horizontal padding is applied separately so an icon slot can reserve space without
// colliding with `px-*` at larger breakpoints (Tailwind v4 drops the legacy `!` prefix).
const inputBase = 'w-full rounded-lg border border-slate-200 bg-white py-2 sm:py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-smooth hover:border-slate-300 hover:shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:shadow-md disabled:bg-slate-50 disabled:text-slate-500';
const inputPadX = 'px-3 sm:px-3.5';
const inputPadWithIcon = 'pl-10 pr-3 sm:pr-3.5';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}
export function Input({ label, error, icon, className = '', id, ...props }: InputProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const errId = `${fieldId}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={fieldId} className="text-sm font-medium text-slate-700">{label}</label>}
      <div className="relative">
        {icon && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">{icon}</span>}
        <input
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
          className={`${inputBase} ${icon ? inputPadWithIcon : inputPadX} ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p id={errId} className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}
export function Select({ label, error, options, className = '', id, ...props }: SelectProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const errId = `${fieldId}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={fieldId} className="text-sm font-medium text-slate-700">{label}</label>}
      <select
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        className={`${inputBase} ${inputPadX} ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''} ${className}`}
        {...props}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p id={errId} className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}
export function Textarea({ label, error, className = '', id, ...props }: TextareaProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const errId = `${fieldId}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={fieldId} className="text-sm font-medium text-slate-700">{label}</label>}
      <textarea
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        className={`${inputBase} ${inputPadX} resize-none ${error ? 'border-red-400' : ''} ${className}`}
        {...props}
      />
      {error && <p id={errId} className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────
// `maxHeight` makes this single div the one true scroll container (both axes),
// so the sticky <thead> below resolves against it correctly. Without it, the
// table only needs horizontal scroll and relies on the page to scroll vertically.
export function Table({ children, className = '', maxHeight }: { children: React.ReactNode; className?: string; maxHeight?: number | string }) {
  const resolvedMax = typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight;
  return (
    <div className={maxHeight ? 'overflow-auto relative' : 'overflow-x-auto'} style={resolvedMax ? { maxHeight: resolvedMax } : undefined}>
      <table className={`w-full text-sm text-left ${className}`}>{children}</table>
    </div>
  );
}
export function Thead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-slate-50 border-y border-slate-200 sticky top-0 z-10">{children}</thead>;
}
export function Tbody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>;
}
const alignClass: Record<'left' | 'center' | 'right', string> = { left: 'text-left', center: 'text-center', right: 'text-right' };
export function Th({ children, className = '', align = 'left', colSpan }: { children: React.ReactNode; className?: string; align?: 'left'|'center'|'right'; colSpan?: number }) {
  return <th colSpan={colSpan} className={`px-2 sm:px-4 py-2 sm:py-3 ${alignClass[align]} text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 ${className}`}>{children}</th>;
}
export function Td({ children, className = '', align = 'left', colSpan, title }: { children: React.ReactNode; className?: string; align?: 'left'|'center'|'right'; colSpan?: number; title?: string }) {
  return <td colSpan={colSpan} title={title} className={`px-2 sm:px-4 py-2 sm:py-3.5 text-[11px] sm:text-sm text-slate-700 ${alignClass[align]} ${className}`}>{children}</td>;
}
export function Tr({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <tr
      className={`transition-smooth ${onClick ? 'cursor-pointer hover:bg-blue-100/40 hover:shadow-sm' : 'hover:bg-slate-50'} ${className}`}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

// ─── Table row actions ───────────────────────────────────────────────────────
// One set of action controls for every table in the app, so the icon, colour
// and hit area of View / Edit / Delete never drift between modules.

function ActionButton({
  icon, title, onClick, disabled, tone = 'default',
}: {
  icon: React.ReactNode;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger';
}) {
  const tones = {
    default: 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
    danger: 'text-red-600 hover:text-red-700 hover:bg-red-50',
  };
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={e => { e.stopPropagation(); onClick?.(); }}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-smooth disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent ${tones[tone]}`}
    >
      {icon}
    </button>
  );
}

/** Wraps the buttons in an Actions cell and stops row clicks bubbling. */
export function RowActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-0.5" onClick={e => e.stopPropagation()}>
      {children}
    </div>
  );
}

export function ViewAction({ onClick, title = 'View details' }: { onClick: () => void; title?: string }) {
  return <ActionButton icon={<FileText className="w-4 h-4" />} title={title} onClick={onClick} />;
}

export function EditAction({ onClick, disabled, title = 'Edit' }: { onClick: () => void; disabled?: boolean; title?: string }) {
  return <ActionButton icon={<Pencil className="w-4 h-4" />} title={title} onClick={onClick} disabled={disabled} />;
}

export function DeleteAction({ onClick, disabled, title = 'Delete' }: { onClick: () => void; disabled?: boolean; title?: string }) {
  return <ActionButton icon={<Trash2 className="w-4 h-4" />} title={title} onClick={onClick} disabled={disabled} tone="danger" />;
}

// ─── Modal ────────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  footer?: React.ReactNode;
}
const modalSizes = {
  sm: 'max-w-xs sm:max-w-sm md:max-w-sm',
  md: 'max-w-sm sm:max-w-md md:max-w-md',
  lg: 'max-w-sm sm:max-w-lg md:max-w-lg',
  xl: 'max-w-sm sm:max-w-xl md:max-w-xl',
  '2xl': 'max-w-sm sm:max-w-xl md:max-w-2xl'
};

export function Modal({ open, onClose, title, children, size = 'md', footer }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);

    // Move focus into the dialog so the keyboard isn't left behind the overlay,
    // and return it to the element that opened the modal once it closes.
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handler);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative bg-white rounded-lg sm:rounded-xl shadow-2xl w-full ${modalSizes[size]} max-h-[90vh] flex flex-col animate-scaleIn mx-4 sm:mx-0 outline-none`}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 id={titleId} className="text-base sm:text-lg font-semibold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="text-slate-400 hover:text-slate-600 transition-smooth p-1.5 rounded-lg hover:bg-slate-200 hover:shadow-sm">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 sm:py-5">{children}</div>
        {footer && <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 justify-end bg-slate-50 rounded-b-lg sm:rounded-b-xl">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
interface ConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}
export function Confirm({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger }: ConfirmProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{message}</p>
    </Modal>
  );
}

// ─── Export / Print Confirmation Dialog ───────────────────────────────────────
interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  reportTitle: string;
  period?: string;
  filters?: string;
  rowCount?: number;
  confirmLabel?: string;
}
export function ExportDialog({ open, onClose, onConfirm, title, reportTitle, period, filters, rowCount, confirmLabel = 'Export PDF' }: ExportDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="space-y-2.5 text-sm">
        <div className="flex justify-between"><span className="text-slate-500">Report</span><span className="font-medium text-slate-900 text-right">{reportTitle}</span></div>
        {period && <div className="flex justify-between"><span className="text-slate-500">Period</span><span className="font-medium text-slate-900 text-right">{period}</span></div>}
        {filters && <div className="flex justify-between"><span className="text-slate-500">Filters</span><span className="font-medium text-slate-900 text-right">{filters}</span></div>}
        {rowCount !== undefined && <div className="flex justify-between"><span className="text-slate-500">Rows</span><span className="font-medium text-slate-900">{rowCount}</span></div>}
      </div>
    </Modal>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'warning' | 'info';
interface ToastItem { id: number; type: ToastType; message: string; }

let toastFn: ((type: ToastType, message: string) => void) | null = null;

export function useToast() {
  const toast = (type: ToastType, message: string) => { toastFn?.(type, message); };
  return {
    success: (msg: string) => toast('success', msg),
    error: (msg: string) => toast('error', msg),
    warning: (msg: string) => toast('warning', msg),
    info: (msg: string) => toast('info', msg),
  };
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  useEffect(() => {
    toastFn = (type, message) => {
      const id = ++counter.current;
      setToasts(p => [...p, { id, type, message }]);
      setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
    };
    return () => { toastFn = null; };
  }, []);

  const styles: Record<ToastType, string> = {
    success: 'bg-white border-slate-200 text-slate-800',
    error:   'bg-white border-red-200 text-slate-800',
    warning: 'bg-white border-amber-200 text-slate-800',
    info:    'bg-white border-blue-200 text-slate-800',
  };
  const iconMap: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="w-5 h-5 text-green-600" />,
    error:   <XCircle className="w-5 h-5 text-red-600" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-600" />,
    info:    <Info className="w-5 h-5 text-blue-600" />,
  };

  return (
    <div className="fixed top-4 right-4 z-100 flex flex-col gap-3 pointer-events-none" role="status" aria-live="polite" aria-atomic="false">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl text-sm font-medium animate-slideInRight pointer-events-auto ${styles[t.type]}`}>
          {iconMap[t.type]}
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Quantity Input ───────────────────────────────────────────────────────────
/**
 * Stepper with a typable field, used by both tills.
 *
 * The cashier can hold the arrows for small corrections or type the figure
 * straight in — "24" is faster than tapping + twenty-four times. While they are
 * typing the field keeps its own draft, so a half-finished "1." never reaches
 * the cart; the value is committed as soon as it parses, and a blur on
 * something invalid snaps the field back to the last good quantity.
 */
export function QuantityInput({
  value, onChange, rule, unit, label, size = 'md', className = '',
}: {
  value: number;
  onChange: (qty: number) => void;
  rule: QuantityRule;
  unit?: string;
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const [draft, setDraft] = useState(() => formatQuantity(value));
  const [error, setError] = useState<string | null>(null);
  const editing = useRef(false);
  const step = quantityStep(rule);

  // Follow the committed value unless the cashier is mid-edit in this field.
  useEffect(() => {
    if (!editing.current) setDraft(formatQuantity(value));
  }, [value]);

  const commit = (raw: string) => {
    setDraft(raw);
    const { value: parsed, error: message } = parseQuantity(raw, rule);
    setError(message);
    if (parsed !== null) onChange(parsed);
  };

  const nudge = (delta: number) => {
    editing.current = false;
    setError(null);
    const next = clampQuantity(value + delta, rule);
    setDraft(formatQuantity(next));
    onChange(next);
  };

  const pad = size === 'sm' ? 'h-8' : 'h-10';
  const btn = `${pad} aspect-square shrink-0 rounded-lg bg-slate-100 text-slate-700 font-bold text-lg leading-none
               hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed
               focus-visible:outline-2 focus-visible:outline-blue-500`;

  return (
    <div className={className}>
      <div className="flex items-stretch gap-1.5">
        <button type="button" className={btn} aria-label={`Decrease ${label}`}
          disabled={value <= step} onClick={() => nudge(-step)}>−</button>

        <div className="relative flex-1 min-w-0">
          <input
            type="text" inputMode={rule.allowDecimal ? 'decimal' : 'numeric'}
            value={draft}
            aria-label={label}
            aria-invalid={error ? true : undefined}
            onFocus={() => { editing.current = true; }}
            onChange={e => commit(e.target.value)}
            onBlur={() => {
              editing.current = false;
              setError(null);
              setDraft(formatQuantity(value));
            }}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            className={`num w-full ${pad} text-center rounded-lg border bg-white font-semibold text-slate-900
                        outline-none transition-smooth focus:ring-2 focus:ring-blue-500/20
                        ${error ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'}
                        ${unit ? 'pr-7' : ''}`}
          />
          {unit && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-400 pointer-events-none">
              {unit}
            </span>
          )}
        </div>

        <button type="button" className={btn} aria-label={`Increase ${label}`}
          disabled={value >= rule.max} onClick={() => nudge(step)}>+</button>
      </div>
      {error && <p className="mt-1 text-[11px] font-medium text-red-600">{error}</p>}
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
/**
 * Page controls for the history tables.
 *
 * These lists are complete by design (fetchAllRows pages past PostgREST's 1000
 * row cap), so a year of trading is thousands of rows. Rendering them all at
 * once builds tens of thousands of DOM nodes and locks up the tablet, so the
 * table shows one page at a time. Exports and totals still use the full
 * filtered set — only what is painted is limited.
 */
export const PAGE_SIZE = 50;

export function Pagination({ page, total, pageSize = PAGE_SIZE, onPage }: {
  page: number;
  total: number;
  pageSize?: number;
  onPage: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50/50">
      <p className="text-xs text-slate-500 font-medium">
        Showing <span className="num">{first}</span>–<span className="num">{last}</span> of <span className="num">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button size="xs" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
        <span className="text-xs text-slate-600 font-medium whitespace-nowrap">
          Page <span className="num">{page}</span> of <span className="num">{pageCount}</span>
        </span>
        <Button size="xs" variant="outline" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>Next</Button>
      </div>
    </div>
  );
}

// ─── Search Bar ───────────────────────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder = 'Search...', className = '' }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 outline-none transition-smooth hover:border-slate-300 hover:shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:shadow-md"
      />
    </div>
  );
}

// ─── Report Period Filter ───────────────────────────────────────────────────
// Shared across the Payment Ledger, Laundry Sales History, and Water
// Refilling Sales History pages so the nine filter options (Today …
// All Records) and the custom-range pickers look and behave the same way
// everywhere they appear.
export function PeriodFilter({
  period, onPeriodChange, customFrom, customTo, onCustomChange, className = '',
}: {
  period: ReportPeriod;
  onPeriodChange: (p: ReportPeriod) => void;
  customFrom: string;
  customTo: string;
  onCustomChange: (from: string, to: string) => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <select
        value={period}
        onChange={e => onPeriodChange(e.target.value as ReportPeriod)}
        aria-label="Report period"
        className="text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 bg-white text-slate-700 font-medium transition-smooth hover:border-slate-300"
      >
        {REPORT_PERIOD_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {period === 'custom' && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={customFrom}
            max={customTo || undefined}
            onChange={e => onCustomChange(e.target.value, customTo)}
            aria-label="From date"
            className="text-sm border border-slate-200 rounded-lg px-2.5 py-2 outline-none focus:border-blue-400 bg-white text-slate-700"
          />
          <span className="text-slate-400 text-xs">to</span>
          <input
            type="date"
            value={customTo}
            min={customFrom || undefined}
            onChange={e => onCustomChange(customFrom, e.target.value)}
            aria-label="To date"
            className="text-sm border border-slate-200 rounded-lg px-2.5 py-2 outline-none focus:border-blue-400 bg-white text-slate-700"
          />
        </div>
      )}
    </div>
  );
}

// ─── Page Header ──────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mb-4 sm:mb-5">
      <div>
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function Empty({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
      {icon && <div className="mb-4 text-slate-400">{icon}</div>}
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && <p className="text-sm text-slate-500 mt-2 max-w-sm">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: string; count?: number }[]; active: string; onChange: (id: string) => void; }) {
  return (
    <div className="flex gap-1 border-b border-slate-200 w-full overflow-x-auto">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-smooth whitespace-nowrap ${active === t.id ? 'border-blue-600 text-blue-700 bg-blue-50/30' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 hover:border-slate-300'}`}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={`px-2 py-0.5 rounded-full text-xs transition-colors ${active === t.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Stat Row ─────────────────────────────────────────────────────────────────
export function StatRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-medium text-slate-900 ${mono ? 'num' : ''}`}>{value}</span>
    </div>
  );
}

// ─── Section Title ────────────────────────────────────────────────────────────

// ─── Grid ─────────────────────────────────────────────────────────────────────
export function Grid({ cols = 4, children, className = '' }: { cols?: 2|3|4|5; children: React.ReactNode; className?: string }) {
  const cls: Record<number, string> = {
    2:'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2',
    3:'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4:'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    5:'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
  };
  return <div className={`grid gap-3 sm:gap-4 md:gap-5 ${cls[cols]} ${className}`}>{children}</div>;
}

// ─── Receipt ─────────────────────────────────────────────────────────────────

// ─── Custom Chart Tooltip ─────────────────────────────────────────────────
export function ChartTooltip({ active, payload, label, labelFormatter, formatter }: any) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="animate-scaleIn">
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-3 animate-slideInUp">
        {label && (
          <div className="text-sm font-semibold text-slate-900 mb-2">
            {labelFormatter ? labelFormatter(label) : label}
          </div>
        )}
        <div className="space-y-1.5">
          {payload.map((entry: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs font-medium text-slate-600">{entry.name}</span>
              </div>
              <span className="text-sm font-semibold text-slate-900">
                {formatter ? formatter(entry.value) : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
