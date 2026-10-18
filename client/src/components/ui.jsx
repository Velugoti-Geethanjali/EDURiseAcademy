import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { initials } from '../lib/format';

export const Icon = ({ name, className = '', fill = false, size }) => (
  <span className={`material-symbols-outlined ${fill ? 'icon-fill' : ''} ${className}`} style={size ? { fontSize: size } : undefined} aria-hidden="true">
    {name}
  </span>
);

export const Spinner = ({ className = '' }) => (
  <div className={`flex items-center justify-center py-16 ${className}`}>
    <div className="h-8 w-8 rounded-full border-[3px] border-surface-container-high border-t-primary-container animate-spin" />
  </div>
);

export const Empty = ({ icon = 'inbox', title = 'Nothing here yet', text, action }) => (
  <div className="flex flex-col items-center text-center py-10 px-4">
    <div className="w-12 h-12 rounded-full bg-surface-container-low text-primary-container flex items-center justify-center mb-3">
      <Icon name={icon} />
    </div>
    <p className="font-semibold text-on-surface">{title}</p>
    {text && <p className="muted text-sm mt-1 max-w-sm">{text}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const ErrorBox = ({ message }) =>
  message ? (
    <div className="flex items-start gap-2 rounded-lg bg-[#fef2f2] text-[#991b1b] px-3 py-2.5 text-sm">
      <Icon name="error" size={18} /> <span>{message}</span>
    </div>
  ) : null;

const CHIP = {
  present: ['bg-[#ecfdf5] text-[#065f46]', '#10b981', 'Present'],
  completed: ['bg-[#ecfdf5] text-[#065f46]', '#10b981', 'Completed'],
  paid: ['bg-[#ecfdf5] text-[#065f46]', '#10b981', 'Paid'],
  active: ['bg-[#ecfdf5] text-[#065f46]', '#10b981', 'Active'],
  absent: ['bg-[#fef2f2] text-[#991b1b]', '#ef4444', 'Absent'],
  rejected: ['bg-[#fef2f2] text-[#991b1b]', '#ef4444', 'Rejected'],
  overdue: ['bg-[#fef2f2] text-[#991b1b]', '#ef4444', 'Overdue'],
  expired: ['bg-[#fef2f2] text-[#991b1b]', '#ef4444', 'Expired'],
  cancelled: ['bg-[#f0f9ff] text-[#075985]', '#0ea5e9', 'Cancelled'],
  rescheduled: ['bg-[#fffbeb] text-[#92400e]', '#f59e0b', 'Rescheduled'],
  pending: ['bg-[#fffbeb] text-[#92400e]', '#f59e0b', 'Pending'],
  scheduled: ['bg-surface-container-low text-on-surface-variant', '#777587', 'Scheduled'],
  inactive: ['bg-slate-100 text-slate-600', '#94a3b8', 'Inactive'],
  reviewed: ['bg-[#ecfdf5] text-[#065f46]', '#10b981', 'Reviewed'],
  submitted: ['bg-[#eef2ff] text-[#3730a3]', '#4f46e5', 'Submitted'],
};

export const Chip = ({ status, label, className = '' }) => {
  const [cls, dot, text] = CHIP[status] || CHIP.scheduled;
  return (
    <span className={`chip ${cls} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
      {label || text}
    </span>
  );
};

const AVATAR_COLORS = ['bg-primary-container', 'bg-[#f59e0b]', 'bg-tertiary-container', 'bg-[#0ea5e9]', 'bg-[#db2777]', 'bg-[#7c3aed]'];
export const Avatar = ({ name = '', size = 36, className = '' }) => {
  const color = AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
  return (
    <div className={`${color} text-white rounded-full flex items-center justify-center font-bold shrink-0 ${className}`} style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials(name) || '?'}
    </div>
  );
};

export const ProgressBar = ({ value = 0, color = 'bg-primary-container', className = '' }) => (
  <div className={`w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden ${className}`}>
    <div className={`${color} h-full rounded-full transition-all`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
  </div>
);

export const ProgressRing = ({ value = 0, size = 96, stroke = 9, label, sub }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e7ff" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#4f46e5" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (Math.min(100, value) / 100) * c} style={{ transition: 'stroke-dashoffset .5s' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-bold text-on-surface" style={{ fontSize: size * 0.2 }}>{label ?? `${Math.round(value)}%`}</span>
        {sub && <span className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">{sub}</span>}
      </div>
    </div>
  );
};

export const StatCard = ({ label, value, unit, icon, iconClass = 'bg-surface-container-high text-primary', foot, progress, progressColor, onClick }) => (
  <div onClick={onClick} className={`card p-4 flex flex-col gap-3 ${onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow-md transition' : ''}`}>
    <div className="flex items-center justify-between">
      <span className="text-[11px] uppercase tracking-wider font-semibold text-on-surface-variant">{label}</span>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconClass}`}><Icon name={icon} size={20} /></div>
    </div>
    <div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[28px] leading-none font-bold text-on-surface tabular-nums">{value}</span>
        {unit && <span className="text-sm font-medium text-on-surface-variant">{unit}</span>}
      </div>
      {foot && <div className="mt-2 text-xs text-on-surface-variant">{foot}</div>}
    </div>
    {progress !== undefined && <ProgressBar value={progress} color={progressColor} />}
  </div>
);

export const SectionCard = ({ title, subtitle, icon, iconClass = 'bg-surface-container-high text-primary', action, children, className = '' }) => (
  <section className={`card card-pad flex flex-col gap-4 ${className}`}>
    {(title || action) && (
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}><Icon name={icon} size={18} /></div>}
          <div className="min-w-0">
            <h2 className="h-card truncate">{title}</h2>
            {subtitle && <p className="text-xs muted truncate">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
    )}
    {children}
  </section>
);

export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
    <div>
      <h1 className="h-page">{title}</h1>
      {subtitle && <p className="muted mt-1">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);

export const Tabs = ({ tabs, value, onChange, className = '' }) => (
  <div className={`inline-flex flex-wrap gap-1 bg-surface-container-low p-1 rounded-lg ${className}`}>
    {tabs.map((t) => {
      const key = typeof t === 'string' ? t : t.value;
      const label = typeof t === 'string' ? t : t.label;
      return (
        <button key={key} type="button" onClick={() => onChange(key)} className={`tab ${value === key ? 'tab-active' : ''}`}>
          {label}
        </button>
      );
    })}
  </div>
);

export function Modal({ open, onClose, title, subtitle, icon, children, footer, wide }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-[rgba(15,23,42,0.4)] sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`bg-white w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} rounded-t-2xl sm:rounded-xl shadow-pop max-h-[92vh] flex flex-col`}>
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {icon && <div className="w-9 h-9 rounded-lg bg-surface-container-high text-primary-container flex items-center justify-center"><Icon name={icon} size={20} /></div>}
            <div>
              <h3 className="font-semibold text-base">{title}</h3>
              {subtitle && <p className="text-xs muted">{subtitle}</p>}
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-md hover:bg-slate-100 text-slate-500" aria-label="Close"><Icon name="close" /></button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2 pb-safe">{footer}</div>}
      </div>
    </div>
  );
}

export const Field = ({ label, children, hint, className = '' }) => (
  <label className={`block ${className}`}>
    {label && <span className="label">{label}</span>}
    {children}
    {hint && <span className="block text-[11px] muted mt-1">{hint}</span>}
  </label>
);

// Simple SVG line chart: points = [{ label, value }] with values 0-100
export function LineChart({ points = [], height = 180, suffix = '%' }) {
  if (!points.length) return <Empty icon="show_chart" title="No data yet" />;
  const w = 600; const h = height; const pad = { l: 34, r: 12, t: 14, b: 30 };
  const iw = w - pad.l - pad.r; const ih = h - pad.t - pad.b;
  const x = (i) => pad.l + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v) => pad.t + ih - (Math.max(0, Math.min(100, v)) / 100) * ih;
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' ');
  const area = `${path} L${x(points.length - 1)},${pad.t + ih} L${x(0)},${pad.t + ih} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" role="img">
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line x1={pad.l} x2={w - pad.r} y1={y(g)} y2={y(g)} stroke="#eef0f6" />
          <text x={pad.l - 6} y={y(g) + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{g}</text>
        </g>
      ))}
      <path d={area} fill="#4f46e5" opacity="0.08" />
      <path d={path} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.value)} r="4.5" fill="#fff" stroke="#4f46e5" strokeWidth="2.5" />
          <text x={x(i)} y={y(p.value) - 10} textAnchor="middle" fontSize="11" fontWeight="600" fill="#131b2e">{Math.round(p.value)}{suffix}</text>
          <text x={x(i)} y={h - 8} textAnchor="middle" fontSize="10" fill="#64748b">{p.label.length > 14 ? `${p.label.slice(0, 13)}…` : p.label}</text>
        </g>
      ))}
    </svg>
  );
}

// ---------------- Toasts ----------------
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, type = 'success') => {
    const id = Math.random();
    setItems((x) => [...x, { id, message, type }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed z-[200] bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 w-[92%] sm:w-auto items-center pointer-events-none">
        {items.map((t) => (
          <div key={t.id} className={`pointer-events-auto flex items-center gap-2 rounded-lg px-4 py-3 shadow-pop text-sm font-medium text-white ${t.type === 'error' ? 'bg-[#dc2626]' : 'bg-[#131b2e]'}`}>
            <Icon name={t.type === 'error' ? 'error' : 'check_circle'} size={18} />
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

export function ConfirmButton({ onConfirm, children, className = 'btn btn-outline btn-sm', message = 'Are you sure?' }) {
  return (
    <button type="button" className={className} onClick={() => { if (window.confirm(message)) onConfirm(); }}>
      {children}
    </button>
  );
}

export const FileLinks = ({ files = [] }) =>
  files?.length ? (
    <div className="flex flex-wrap gap-2">
      {files.map((f, i) => <FileChip key={i} file={f} />)}
    </div>
  ) : null;

export function FileChip({ file }) {
  const icon = file.type?.includes('pdf') ? 'picture_as_pdf' : file.type?.startsWith('image') ? 'image' : file.type?.startsWith('video') ? 'movie' : 'description';
  const base = import.meta.env.VITE_API_URL || '';
  return (
    <a href={file.url?.startsWith('http') ? file.url : `${base}${file.url}`} target="_blank" rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container-high px-2.5 py-1.5 text-xs font-medium text-primary-container max-w-full">
      <Icon name={icon} size={16} /> <span className="truncate max-w-[180px]">{file.name}</span>
    </a>
  );
}
