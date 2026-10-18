import { useEffect, useState } from 'react';
import api, { errMsg } from '../lib/api';
import { DAYS, toDateInput } from '../lib/format';
import { useAuth } from '../lib/auth';
import { Icon, Field, Modal, ErrorBox, useToast } from './ui';

export const emptyPackage = () => {
  const start = new Date();
  const exp = new Date(); exp.setMonth(exp.getMonth() + 2);
  return {
    subject: '', totalClasses: 12, startDate: toDateInput(start), expiryDate: toDateInput(exp),
    feeType: 'package', feeAmount: '', durationMins: 60,
    schedule: [{ day: 1, time: '18:00' }], createFee: true, feeDueDate: toDateInput(start),
  };
};

// Fields for a class package. `value` / `onChange` controlled.
export function PackageFields({ value: f, onChange, subjects, isEdit }) {
  const set = (k) => (e) => onChange({ ...f, [k]: e.target.value });
  const setSlot = (i, k, v) => onChange({ ...f, schedule: f.schedule.map((s, j) => (j === i ? { ...s, [k]: v } : s)) });
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Subject *">
          <select className="input" value={f.subject} onChange={set('subject')} required>
            <option value="">Select</option>
            {subjects.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Classes purchased *"><input type="number" min="1" className="input" value={f.totalClasses} onChange={set('totalClasses')} required /></Field>
        <Field label="Class duration (mins)"><input type="number" min="15" step="15" className="input" value={f.durationMins} onChange={set('durationMins')} /></Field>
        <Field label="Start date *"><input type="date" className="input" value={f.startDate} onChange={set('startDate')} required /></Field>
        <Field label="Expiry date"><input type="date" className="input" value={f.expiryDate || ''} onChange={set('expiryDate')} /></Field>
      </div>

      <div>
        <span className="label">Weekly class timings</span>
        <div className="space-y-2">
          {f.schedule.map((s, i) => (
            <div key={i} className="flex gap-2 items-center">
              <select className="input" value={s.day} onChange={(e) => setSlot(i, 'day', Number(e.target.value))}>
                {DAYS.map((d, n) => <option key={d} value={n}>{d}</option>)}
              </select>
              <input type="time" className="input w-36" value={s.time} onChange={(e) => setSlot(i, 'time', e.target.value)} />
              <button type="button" className="p-2 rounded-lg text-slate-400 hover:text-error hover:bg-slate-50" onClick={() => onChange({ ...f, schedule: f.schedule.filter((_, j) => j !== i) })} aria-label="Remove"><Icon name="delete" size={20} /></button>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange({ ...f, schedule: [...f.schedule, { day: 3, time: f.schedule.at(-1)?.time || '18:00' }] })}>
            <Icon name="add" size={16} /> Add day
          </button>
        </div>
        <p className="text-[11px] muted mt-1">{isEdit ? 'Tick "rebuild schedule" below to apply new timings to future classes.' : 'Classes are created automatically on these days until the package is full.'}</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Fee type">
          <select className="input" value={f.feeType} onChange={set('feeType')}>
            <option value="package">Per package</option><option value="monthly">Monthly</option>
          </select>
        </Field>
        <Field label={f.feeType === 'monthly' ? 'Monthly fee (₹)' : 'Package fee (₹)'}><input type="number" min="0" className="input" value={f.feeAmount} onChange={set('feeAmount')} /></Field>
        {!isEdit && (
          <Field label="Fee due date"><input type="date" className="input" value={f.feeDueDate} onChange={set('feeDueDate')} /></Field>
        )}
      </div>
      {!isEdit && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-[#4f46e5] w-4 h-4" checked={f.createFee} onChange={(e) => onChange({ ...f, createFee: e.target.checked })} />
          Add this fee to Payments as pending
        </label>
      )}
      {isEdit && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-[#4f46e5] w-4 h-4" checked={!!f.regenerate} onChange={(e) => onChange({ ...f, regenerate: e.target.checked })} />
          Rebuild schedule (replace future un-marked classes with the new timings)
        </label>
      )}
    </div>
  );
}

export function PackageModal({ open, onClose, onDone, studentId, pkg }) {
  const { settings } = useAuth();
  const toast = useToast();
  const [f, setF] = useState(emptyPackage());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    setError('');
    setF(pkg ? { ...pkg, startDate: toDateInput(pkg.startDate), expiryDate: toDateInput(pkg.expiryDate), schedule: pkg.schedule || [], regenerate: false } : emptyPackage());
  }, [open, pkg]);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const body = { ...f, student: studentId, schedule: f.schedule.map((s) => ({ day: Number(s.day), time: s.time })) };
      const { data } = pkg ? await api.put(`/packages/${pkg._id}`, body) : await api.post('/packages', body);
      toast(pkg ? 'Package updated' : `Package created · ${data.sessionsCreated} classes scheduled`);
      onDone?.(data); onClose();
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} wide icon="inventory_2" title={pkg ? 'Edit class package' : 'Assign class package'}
      footer={<><button className="btn btn-outline" onClick={onClose}>Cancel</button><button form="pkgform" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : pkg ? 'Save changes' : 'Create package'}</button></>}>
      <form id="pkgform" onSubmit={submit}>
        <PackageFields value={f} onChange={setF} subjects={settings?.subjects || []} isEdit={!!pkg} />
        <div className="mt-3"><ErrorBox message={error} /></div>
      </form>
    </Modal>
  );
}
