import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errMsg } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Icon, ErrorBox, Field } from '../../components/ui';
import { PublicHeader } from './Landing';

export default function Register() {
  const { settings, login } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ name: '', phone: '', email: '', grade: '', board: '', subjects: [], parentName: '', parentPhone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggleSubject = (s) => setF({ ...f, subjects: f.subjects.includes(s) ? f.subjects.filter((x) => x !== s) : [...f.subjects, s] });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (f.password !== f.confirm) return setError('Passwords do not match');
    if (!f.subjects.length) return setError('Select at least one subject');
    setBusy(true);
    try {
      await api.post('/auth/register', { ...f, confirm: undefined });
      await login((f.phone || f.email).trim(), f.password, 'student');
      navigate('/student');
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="h-page">Student registration</h1>
        <p className="muted mt-1">Fill in your details to create your student account. You can log in straight away.</p>
        <form onSubmit={submit} className="card p-5 sm:p-7 mt-5 space-y-6">
          <div>
            <h2 className="h-card mb-3 flex items-center gap-2"><Icon name="person" className="text-primary" size={20} /> Student details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Full name *" className="sm:col-span-2"><input className="input" value={f.name} onChange={set('name')} required /></Field>
              <Field label="Phone number *"><input className="input" type="tel" value={f.phone} onChange={set('phone')} placeholder="10-digit mobile" required pattern="[0-9+ ]{10,15}" /></Field>
              <Field label="Email"><input className="input" type="email" value={f.email} onChange={set('email')} /></Field>
              <Field label="Class / Grade *">
                <select className="input" value={f.grade} onChange={set('grade')} required>
                  <option value="">Select class</option>
                  {(settings?.grades || []).map((g) => <option key={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="Board">
                <select className="input" value={f.board} onChange={set('board')}>
                  <option value="">Select board</option>
                  {['CBSE', 'ICSE', 'State Board', 'IB', 'IGCSE', 'Other'].map((b) => <option key={b}>{b}</option>)}
                </select>
              </Field>
            </div>
            <div className="mt-4">
              <span className="label">Subjects *</span>
              <div className="flex flex-wrap gap-2">
                {(settings?.subjects || []).map((s) => (
                  <button type="button" key={s} onClick={() => toggleSubject(s)}
                    className={`px-3 py-1.5 rounded-full border text-sm font-medium transition ${f.subjects.includes(s) ? 'bg-primary-container border-primary-container text-white' : 'bg-white border-slate-200 text-on-surface-variant hover:border-slate-300'}`}>
                    {f.subjects.includes(s) && <Icon name="check" size={14} />} {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <h2 className="h-card mb-3 flex items-center gap-2"><Icon name="family_restroom" className="text-primary" size={20} /> Parent details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Parent's name *"><input className="input" value={f.parentName} onChange={set('parentName')} required /></Field>
              <Field label="Parent's phone *"><input className="input" type="tel" value={f.parentPhone} onChange={set('parentPhone')} required /></Field>
            </div>
          </div>
          <div>
            <h2 className="h-card mb-3 flex items-center gap-2"><Icon name="lock" className="text-primary" size={20} /> Password</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Password *" hint="At least 6 characters"><input className="input" type="password" value={f.password} onChange={set('password')} required minLength={6} /></Field>
              <Field label="Confirm password *"><input className="input" type="password" value={f.confirm} onChange={set('confirm')} required /></Field>
            </div>
          </div>
          <ErrorBox message={error} />
          <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3">
            <Link to="/login" className="text-sm text-primary font-medium">Already registered? Log in</Link>
            <button className="btn btn-primary" disabled={busy}>{busy ? 'Submitting…' : 'Register'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
