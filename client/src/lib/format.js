export const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const fmtShort = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—');

export const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase() : '';

export const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { weekday: 'short' }) : '');

export const fmtDateTime = (d) => (d ? `${fmtDay(d)}, ${fmtDate(d)} · ${fmtTime(d)}` : '—');

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

export const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  if (s < 604800) return `${Math.floor(s / 86400)} d ago`;
  return fmtDate(d);
};

export const countdown = (d) => {
  const ms = new Date(d).getTime() - Date.now();
  if (ms <= 0) return 'Now';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 48) return `in ${Math.floor(h / 24)} days`;
  if (h >= 1) return `in ${h}h ${m}m`;
  return `in ${m}m`;
};

export const isSameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

// "2026-10-18" for <input type="date">
export const toDateInput = (d) => {
  if (!d) return '';
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

// "2026-10-18T18:00" for <input type="datetime-local">
export const toDateTimeInput = (d) => {
  if (!d) return '';
  const x = new Date(d);
  return `${toDateInput(x)}T${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
};

export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export const waLink = (phone, text = '') => {
  const digits = String(phone || '').replace(/\D/g, '');
  const num = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${num}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};
