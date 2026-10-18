import { useNavigate } from 'react-router-dom';
import useFetch from '../lib/useFetch';
import api from '../lib/api';
import { useAuth } from '../lib/auth';
import { timeAgo } from '../lib/format';
import { Icon, Spinner, PageHeader, Empty, ErrorBox } from '../components/ui';

const ICONS = {
  class: ['schedule', 'bg-surface-container-high text-primary'],
  schedule: ['event_repeat', 'bg-[#fffbeb] text-[#f59e0b]'],
  homework: ['assignment', 'bg-surface-container-high text-primary'],
  test: ['quiz', 'bg-[#f0f9ff] text-[#0ea5e9]'],
  fee: ['currency_rupee', 'bg-secondary-fixed text-on-secondary-fixed-variant'],
  balance: ['battery_alert', 'bg-[#fef2f2] text-error'],
  announcement: ['campaign', 'bg-[#fef2f2] text-error'],
  registration: ['how_to_reg', 'bg-[#ecfdf5] text-tertiary-container'],
  general: ['notifications', 'bg-surface-container-high text-primary'],
};

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useFetch('/notifications');
  const readAll = async () => { await api.patch('/notifications/read-all'); reload(true); };
  const open = async (n) => {
    if (!n.read) await api.patch(`/notifications/${n._id}/read`);
    if (n.link && n.link.startsWith(user.role === 'tutor' ? '/tutor' : '/student')) navigate(n.link);
    else reload(true);
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="Notifications" subtitle={data?.unread ? `${data.unread} unread` : 'You are all caught up'}
        actions={data?.unread > 0 && <button className="btn btn-outline btn-sm" onClick={readAll}><Icon name="done_all" size={16} /> Mark all read</button>} />
      <ErrorBox message={error} />
      {loading && !data ? <Spinner /> : !data?.items?.length ? <div className="card"><Empty icon="notifications_off" title="No notifications yet" /></div> : (
        <div className="card divide-y divide-slate-100 overflow-hidden">
          {data.items.map((n) => {
            const [ic, cls] = ICONS[n.type] || ICONS.general;
            return (
              <button key={n._id} onClick={() => open(n)} className={`w-full text-left p-4 flex gap-3 hover:bg-slate-50 ${n.read ? '' : 'bg-[#f5f6ff]'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${cls}`}><Icon name={ic} size={20} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-2">
                    <span className={`text-sm ${n.read ? 'font-medium' : 'font-semibold'}`}>{n.title}</span>
                    <span className="text-[11px] muted shrink-0">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="text-sm text-on-surface-variant mt-0.5">{n.message}</p>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-primary-container mt-2 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
