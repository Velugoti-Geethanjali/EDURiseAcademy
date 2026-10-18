import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { errMsg } from '../../lib/api';
import { Icon, ErrorBox } from '../../components/ui';
import { PublicHeader } from './Landing';
import { waLink } from '../../lib/format';

export default function Login() {
  const [params] = useSearchParams();
  const { user, login, settings } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState(params.get('role') === 'tutor' ? 'tutor' : 'student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={user.role === 'tutor' ? '/tutor' : '/student'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const u = await login(identifier.trim(), password, role);
      navigate(u.role === 'tutor' ? '/tutor' : '/student');
    } catch (err) {
      setError(errMsg(err));
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <div className="card overflow-hidden grid md:grid-cols-5">
          <form onSubmit={submit} className="md:col-span-3 p-6 sm:p-10">
            <p className="text-xs font-semibold tracking-wider text-primary uppercase">Secure sign in</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Sign in to your portal</h1>
            <p className="mt-2 muted">Classes, attendance, homework, results and fees in one place.</p>

            <div className="mt-6 grid grid-cols-2 gap-1 bg-surface-container-low p-1 rounded-xl">
              {[['student', 'school', 'Student / Parent'], ['tutor', 'admin_panel_settings', 'Tutor']].map(([r, ic, label]) => (
                <button type="button" key={r} onClick={() => setRole(r)}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition ${role === r ? 'bg-primary-container text-white shadow' : 'text-on-surface-variant'}`}>
                  <Icon name={ic} size={18} /> {label}
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="label">{role === 'tutor' ? 'Email or phone' : 'Registered phone, email or roll no.'}</span>
                <input className="input" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder={role === 'tutor' ? 'tutor@example.com' : '98765 43210'} autoComplete="username" required />
              </label>
              <label className="block">
                <span className="label">Password</span>
                <div className="relative">
                  <input className="input pr-10" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" required />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" aria-label="Show password"><Icon name={show ? 'visibility_off' : 'visibility'} size={20} /></button>
                </div>
              </label>
              <ErrorBox message={error} />
              <button className="btn btn-primary w-full py-3" disabled={busy}>
                {busy ? 'Signing in…' : role === 'tutor' ? 'Log in to Tutor Console' : 'Log in to Student Desk'} <Icon name="login" size={18} />
              </button>
              <p className="text-xs muted">Forgot your password? Ask the tutor to reset it{settings?.whatsapp ? <> on <a className="text-primary font-medium" href={waLink(settings.whatsapp, 'Hi, I need help resetting my tuition portal password.')} target="_blank" rel="noreferrer">WhatsApp</a></> : ''}.</p>
            </div>

            {role === 'student' && (
              <div className="mt-6 pt-5 border-t border-slate-100 text-sm">
                New student? <Link to="/register" className="text-primary font-semibold">Register here →</Link>
              </div>
            )}
          </form>
          <div className="hidden md:flex md:col-span-2 bg-surface-container flex-col justify-center gap-4 p-8">
            {[
              ['event_available', 'Track every class', 'See classes completed, remaining and your next session.'],
              ['assignment', 'Homework & notes', 'Download notes and submit homework online.'],
              ['monitoring', 'Results & progress', 'Marks, tutor feedback and progress over time.'],
            ].map(([ic, t, d]) => (
              <div key={t} className="card p-4 flex gap-3">
                <div className="w-9 h-9 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0"><Icon name={ic} size={20} /></div>
                <div><div className="font-semibold">{t}</div><div className="text-xs muted mt-0.5">{d}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
