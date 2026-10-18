import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errMsg } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtDate } from '../../lib/format';
import { Icon, PageHeader, SectionCard, Field, ErrorBox, Avatar, useToast } from '../../components/ui';

export function PasswordCard() {
  const toast = useToast();
  const [f, setF] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (f.newPassword !== f.confirm) return setErr('Passwords do not match');
    try { await api.put('/auth/password', f); toast('Password changed'); setF({ currentPassword: '', newPassword: '', confirm: '' }); } catch (e2) { setErr(errMsg(e2)); }
  };
  return (
    <SectionCard title="Change password" icon="lock">
      <form onSubmit={submit} className="grid sm:grid-cols-3 gap-3">
        <Field label="Current password"><input type="password" className="input" value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} required /></Field>
        <Field label="New password"><input type="password" className="input" value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} required minLength={6} /></Field>
        <Field label="Confirm"><input type="password" className="input" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} required /></Field>
        <div className="sm:col-span-3"><ErrorBox message={err} /></div>
        <div className="sm:col-span-3 flex justify-end"><button className="btn btn-primary">Update password</button></div>
      </form>
    </SectionCard>
  );
}

export default function StudentProfile() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [f, setF] = useState({});
  const [err, setErr] = useState('');
  useEffect(() => { setF({ email: user.email || '', phone: user.phone || '', parentName: user.parentName || '', parentPhone: user.parentPhone || '', address: user.address || '' }); }, [user]);
  const save = async (e) => {
    e.preventDefault(); setErr('');
    try { const { data } = await api.put('/auth/me', f); setUser(data); toast('Profile saved'); } catch (e2) { setErr(errMsg(e2)); }
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-5">
      <PageHeader title="Profile" />
      <div className="card p-5 flex items-center gap-4">
        <Avatar name={user.name} size={60} className="rounded-2xl" />
        <div>
          <div className="text-xl font-bold">{user.name}</div>
          <div className="text-sm muted">{user.grade}{user.board ? ` · ${user.board}` : ''} · Roll #{user.rollNo || '—'}</div>
          <div className="text-xs muted mt-0.5">Subjects: {(user.subjects || []).join(', ') || '—'} · Joined {fmtDate(user.joinedOn || user.createdAt)}</div>
        </div>
      </div>
      <SectionCard title="Contact & parent details" icon="contact_phone">
        <form onSubmit={save} className="grid sm:grid-cols-2 gap-4">
          <Field label="Phone"><input className="input" value={f.phone || ''} onChange={set('phone')} /></Field>
          <Field label="Email"><input type="email" className="input" value={f.email || ''} onChange={set('email')} /></Field>
          <Field label="Parent's name"><input className="input" value={f.parentName || ''} onChange={set('parentName')} /></Field>
          <Field label="Parent's phone"><input className="input" value={f.parentPhone || ''} onChange={set('parentPhone')} /></Field>
          <Field label="Address" className="sm:col-span-2"><input className="input" value={f.address || ''} onChange={set('address')} /></Field>
          <div className="sm:col-span-2"><ErrorBox message={err} /></div>
          <div className="sm:col-span-2 flex justify-end"><button className="btn btn-primary">Save</button></div>
        </form>
      </SectionCard>
      <PasswordCard />
      <button className="btn btn-outline text-error self-start" onClick={() => { logout(); navigate('/'); }}><Icon name="logout" size={18} /> Log out</button>
    </div>
  );
}
