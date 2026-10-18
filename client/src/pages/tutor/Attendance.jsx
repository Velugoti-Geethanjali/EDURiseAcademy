import { useEffect, useMemo, useState } from 'react';
import api, { errMsg } from '../../lib/api';
import useFetch from '../../lib/useFetch';
import { fmtDate, fmtTime, toDateInput, toDateTimeInput } from '../../lib/format';
import { Icon, Spinner, PageHeader, Empty, Avatar, ErrorBox, useToast } from '../../components/ui';

const OPTIONS = [
  { v: 'present', label: 'Present', short: 'P', on: 'bg-[#10b981] text-white border-[#10b981]' },
  { v: 'absent', label: 'Absent', short: 'A', on: 'bg-[#ef4444] text-white border-[#ef4444]' },
  { v: 'cancelled', label: 'Cancelled', short: 'C', on: 'bg-[#0ea5e9] text-white border-[#0ea5e9]' },
  { v: 'rescheduled', label: 'Rescheduled', short: 'R', on: 'bg-[#f59e0b] text-white border-[#f59e0b]' },
];
const defaultNew = (s) => toDateTimeInput(new Date(new Date(s.date).getTime() + 864e5));
const toUi = (status) => (status === 'completed' ? 'present' : status === 'scheduled' ? '' : status);

export default function Attendance() {
  const toast = useToast();
  const [date, setDate] = useState(toDateInput(new Date()));
  const range = useMemo(() => {
    const s = new Date(`${date}T00:00:00`); const e = new Date(`${date}T23:59:59`);
    return `/sessions?from=${s.toISOString()}&to=${e.toISOString()}`;
  }, [date]);
  const { data, loading, error, reload } = useFetch(range);
  const [marks, setMarks] = useState({});
  const [newDates, setNewDates] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) setMarks(Object.fromEntries(data.map((s) => [s._id, toUi(s.status)])));
    setNewDates({});
  }, [data]);

  const changed = (data || []).filter((s) => marks[s._id] && marks[s._id] !== toUi(s.status));
  const save = async () => {
    setBusy(true);
    try {
      await api.post('/sessions/attendance', {
        items: changed.map((s) => ({ id: s._id, status: marks[s._id], newDate: marks[s._id] === 'rescheduled' ? new Date(newDates[s._id] || defaultNew(s)) : undefined })),
      });
      toast(`Attendance saved (${changed.length})`);
      reload(true);
    } catch (e) { toast(errMsg(e), 'error'); } finally { setBusy(false); }
  };
  const allPresent = () => setMarks(Object.fromEntries((data || []).map((s) => [s._id, s.status === 'scheduled' ? 'present' : toUi(s.status)])));
  const shift = (n) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + n); setDate(toDateInput(d)); };

  return (
    <div className="max-w-4xl">
      <PageHeader title="Attendance" subtitle="Present marks the class as completed and deducts 1 class from the package" />
      <div className="card p-3 flex flex-wrap items-center gap-2 mb-4">
        <button className="btn btn-outline btn-sm" onClick={() => shift(-1)} aria-label="Previous day"><Icon name="chevron_left" size={18} /></button>
        <input type="date" className="input w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
        <button className="btn btn-outline btn-sm" onClick={() => shift(1)} aria-label="Next day"><Icon name="chevron_right" size={18} /></button>
        <button className="btn btn-ghost btn-sm" onClick={() => setDate(toDateInput(new Date()))}>Today</button>
        <div className="ml-auto flex gap-2">
          <button className="btn btn-outline btn-sm" onClick={allPresent} disabled={!data?.length}>Mark all present</button>
        </div>
      </div>
      <ErrorBox message={error} />
      {loading && !data ? <Spinner /> : !data?.length ? (
        <div className="card"><Empty icon="event_available" title={`No classes on ${fmtDate(`${date}T12:00:00`)}`} /></div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {data.map((s) => (
            <div key={s._id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar name={s.student?.name} size={38} />
                <div className="min-w-0">
                  <div className="font-semibold truncate">{s.student?.name} <span className="text-xs muted font-normal">#{s.student?.rollNo}</span></div>
                  <div className="text-xs muted">{fmtTime(s.date)} · {s.subject} · {s.student?.grade}</div>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <div className="grid grid-cols-4 gap-1.5">
                  {OPTIONS.map((o) => (
                    <button key={o.v} type="button" onClick={() => setMarks({ ...marks, [s._id]: o.v })}
                      className={`border rounded-lg px-2 sm:px-3 py-1.5 text-xs font-semibold transition ${marks[s._id] === o.v ? o.on : 'bg-white border-slate-200 text-on-surface-variant hover:border-slate-300'}`}>
                      <span className="sm:hidden">{o.short}</span><span className="hidden sm:inline">{o.label}</span>
                    </button>
                  ))}
                </div>
                {marks[s._id] === 'rescheduled' && s.status !== 'rescheduled' && (
                  <input type="datetime-local" className="input py-1.5 text-xs" value={newDates[s._id] || defaultNew(s)}
                    onChange={(e) => setNewDates({ ...newDates, [s._id]: e.target.value })} title="New date & time" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {!!data?.length && (
        <div className="sticky bottom-20 lg:bottom-4 mt-4 flex justify-end">
          <button className="btn btn-primary shadow-pop" onClick={save} disabled={!changed.length || busy}>
            <Icon name="save" size={18} /> {busy ? 'Saving…' : `Save attendance${changed.length ? ` (${changed.length})` : ''}`}
          </button>
        </div>
      )}
    </div>
  );
}
