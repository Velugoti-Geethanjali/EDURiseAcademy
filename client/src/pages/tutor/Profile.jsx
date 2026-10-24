import { useEffect, useState } from 'react';
import api, { errMsg } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Icon, PageHeader, SectionCard, Field, ErrorBox, useToast } from '../../components/ui';
import { PasswordCard } from '../student/Profile';

export default function TutorProfile() {
  const { user, setUser, settings, reloadSettings, logout } = useAuth();
  const toast = useToast();
  const [p, setP] = useState({});
  const [s, setS] = useState({});
  const [err, setErr] = useState('');
  useEffect(() => { setP({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', qualification: user?.qualification || '', bio: user?.bio || '' }); }, [user]);
  useEffect(() => {
    if (settings) setS({ ...settings, subjectsText: (settings.subjects || []).join(', '), gradesText: (settings.grades || []).join(', ') });
  }, [settings]);

  const saveProfile = async (e) => {
    e.preventDefault(); setErr('');
    try { const { data } = await api.put('/auth/me', p); setUser(data); toast('Profile saved'); reloadSettings(); } catch (e2) { setErr(errMsg(e2)); }
  };
  const saveSettings = async (e) => {
    e.preventDefault(); setErr('');
    const split = (t) => t.split(',').map((x) => x.trim()).filter(Boolean);
    try {
      await api.put('/settings', {
        tuitionName: s.tuitionName, tagline: s.tagline, phone: s.phone, whatsapp: s.whatsapp, email: s.email, address: s.address,
        subjects: split(s.subjectsText), grades: split(s.gradesText), lowBalanceThreshold: Number(s.lowBalanceThreshold) || 2,
      });
      await reloadSettings(); toast('Tuition settings saved');
    } catch (e2) { setErr(errMsg(e2)); }
  };
  const setv = (setter, obj) => (k) => (e) => setter({ ...obj, [k]: e.target.value });
  const sp = setv(setP, p); const ss = setv(setS, s);

  return (
    <div className="max-w-4xl">
      <PageHeader title="Profile & settings" actions={<button className="btn btn-outline text-error" onClick={logout}><Icon name="logout" size={18} /> Log out</button>} />
      <div className="mb-4"><ErrorBox message={err} /></div>
      <div className="grid gap-5">
        <SectionCard title="Your profile" subtitle="Shown on the home page" icon="person">
          <form onSubmit={saveProfile} className="grid sm:grid-cols-2 gap-4">
            <Field label="Name"><input className="input" value={p.name || ''} onChange={sp('name')} required /></Field>
            <Field label="Qualification"><input className="input" value={p.qualification || ''} onChange={sp('qualification')} placeholder="e.g. M.Sc. Mathematics" /></Field>
            <Field label="Login email"><input className="input" type="email" value={p.email || ''} onChange={sp('email')} /></Field>
            <Field label="Login phone"><input className="input" value={p.phone || ''} onChange={sp('phone')} /></Field>
            <Field label="Short bio" className="sm:col-span-2"><textarea className="input" rows={2} value={p.bio || ''} onChange={sp('bio')} /></Field>
            <div className="sm:col-span-2 flex justify-end"><button className="btn btn-primary">Save profile</button></div>
          </form>
        </SectionCard>

        <SectionCard title="Tuition settings" subtitle="Name, contact details, subjects and classes" icon="tune">
          <form onSubmit={saveSettings} className="grid sm:grid-cols-2 gap-4">
            <Field label="Tuition name"><input className="input" value={s.tuitionName || ''} onChange={ss('tuitionName')} /></Field>
            <Field label="Tagline" className="sm:col-span-2"><input className="input" value={s.tagline || ''} onChange={ss('tagline')} /></Field>
            <Field label="Contact phone"><input className="input" value={s.phone || ''} onChange={ss('phone')} /></Field>
            <Field label="WhatsApp number" hint="With country code, e.g. 919876543210"><input className="input" value={s.whatsapp || ''} onChange={ss('whatsapp')} /></Field>
            <Field label="Contact email"><input className="input" value={s.email || ''} onChange={ss('email')} /></Field>
            <Field label="Address"><input className="input" value={s.address || ''} onChange={ss('address')} /></Field>
            <Field label="Subjects you teach" hint="Comma separated" className="sm:col-span-2"><input className="input" value={s.subjectsText || ''} onChange={ss('subjectsText')} /></Field>
            <Field label="Classes / grades" hint="Comma separated" className="sm:col-span-2"><input className="input" value={s.gradesText || ''} onChange={ss('gradesText')} /></Field>
            <Field label="Low balance alert at" hint="Warn when this many classes or fewer are left"><input type="number" min="0" className="input" value={s.lowBalanceThreshold ?? 2} onChange={ss('lowBalanceThreshold')} /></Field>
            <div className="sm:col-span-2 flex justify-end"><button className="btn btn-primary">Save settings</button></div>
          </form>
        </SectionCard>

        <PasswordCard />
      </div>
    </div>
  );
}
