import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { Icon } from '../../components/ui';
import { waLink } from '../../lib/format';

export function PublicHeader() {
  const { settings } = useAuth();
  return (
    <>
      <div className="bg-surface-container-low text-xs text-on-surface-variant">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <a href={`tel:${settings?.phone || ''}`} className="flex items-center gap-1 hover:text-primary"><Icon name="call" size={14} /> {settings?.phone}</a>
            <a href={waLink(settings?.whatsapp)} target="_blank" rel="noreferrer" className="hidden sm:flex items-center gap-1 text-tertiary-container hover:underline"><Icon name="chat" size={14} /> WhatsApp</a>
          </div>
          <Link to="/login" className="flex items-center gap-1 text-primary font-medium"><Icon name="login" size={14} /> Portal Login</Link>
        </div>
      </div>
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={settings?.logoUrl || '/logo.png'} alt="" className="w-11 h-11 rounded-full object-cover" />
            <div className="leading-tight">
              <div className="font-semibold text-lg">{settings?.tuitionName || 'Edurise Academy'}</div>
              {settings?.tutor?.name && <div className="text-xs muted">Private tutoring by {settings.tutor.name}</div>}
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-on-surface-variant">
            <a href="#portals" className="hover:text-primary">Login</a>
            <a href="#contact" className="hover:text-primary">Contact</a>
            <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
          </nav>
        </div>
      </header>
    </>
  );
}

export function PublicFooter() {
  const { settings } = useAuth();
  return (
    <footer className="bg-surface-container-low mt-16">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row justify-between gap-4 text-sm text-on-surface-variant">
        <div>
          <div className="font-semibold text-on-surface">{settings?.tuitionName}</div>
          <div className="mt-1">{settings?.address}</div>
        </div>
        <div className="sm:text-right">
          <div>{settings?.phone} · {settings?.email}</div>
          <div className="mt-1">© {new Date().getFullYear()} {settings?.tuitionName}. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  const { user, settings } = useAuth();
  if (user) return <Navigate to={user.role === 'tutor' ? '/tutor' : '/student'} replace />;

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      <section className="max-w-6xl mx-auto px-4 pt-10 sm:pt-16 pb-8 flex flex-col-reverse md:flex-row md:items-center justify-between gap-8">
        <div className="max-w-2xl">
          <span className="chip bg-surface-container-high text-primary"><Icon name="verified" size={14} /> Private tuition · Limited seats</span>
          <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1]">
            {settings?.tuitionName || 'Edurise Academy'}
          </h1>
          <p className="mt-4 text-lg text-on-surface-variant">{settings?.tagline}</p>
          <div className="mt-6 rounded-xl bg-surface-container-low p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2">
              <Icon name="info" className="text-primary mt-0.5" size={20} />
              <div>
                <div className="font-semibold">New student?</div>
                <div className="text-sm muted">Register online and start using your student account right away.</div>
              </div>
            </div>
            <Link to="/register" className="btn btn-primary">Register now <Icon name="arrow_forward" size={18} /></Link>
          </div>
        </div>
        <img src={settings?.logoUrl || '/logo.png'} alt={settings?.tuitionName || 'Edurise Academy'}
          className="w-48 h-48 md:w-72 md:h-72 lg:w-80 lg:h-80 rounded-full object-cover shadow-lg self-center md:mr-6" />
      </section>

      <section id="portals" className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-5">
        <div className="card p-6 border-t-4 border-t-primary-container">
          <span className="chip bg-surface-container-high text-primary"><Icon name="admin_panel_settings" size={14} /> Tutor console</span>
          <h2 className="mt-3 text-2xl font-bold">Tutor Login</h2>
          <p className="mt-2 muted">Manage students, mark classes complete, track attendance and fees, post homework and publish results.</p>
          <Link to="/login?role=tutor" className="btn btn-primary w-full mt-6"><Icon name="lock" size={18} /> Login as Tutor</Link>
        </div>
        <div className="card p-6 border-t-4 border-t-[#f59e0b]">
          <span className="chip bg-secondary-fixed text-on-secondary-fixed-variant"><Icon name="school" size={14} /> Student & parent access</span>
          <h2 className="mt-3 text-2xl font-bold">Student Login</h2>
          <p className="mt-2 muted">See your upcoming classes, remaining package balance, homework, study notes, results and fees.</p>
          <Link to="/login?role=student" className="btn w-full mt-6 bg-[#131b2e] text-white hover:bg-black"><Icon name="key" size={18} /> Access Student Portal</Link>
        </div>
      </section>

      {settings?.tutor && (settings.tutor.bio || settings.tutor.qualification) && (
        <section className="max-w-6xl mx-auto px-4 mt-12">
          <div className="card p-6 flex flex-col sm:flex-row gap-5 items-start">
            <div className="w-16 h-16 rounded-2xl bg-primary-container text-white flex items-center justify-center text-2xl font-bold shrink-0">
              {settings.tutor.name?.[0]}
            </div>
            <div>
              <h3 className="text-xl font-bold">{settings.tutor.name}</h3>
              {settings.tutor.qualification && <p className="text-primary font-medium text-sm">{settings.tutor.qualification}</p>}
              {settings.tutor.bio && <p className="mt-2 text-on-surface-variant">{settings.tutor.bio}</p>}
            </div>
          </div>
        </section>
      )}

      <section id="contact" className="max-w-6xl mx-auto px-4 mt-12">
        <h2 className="text-2xl font-bold text-center">Contact us</h2>
        <div className="grid sm:grid-cols-3 gap-4 mt-6">
          <div className="card p-5">
            <div className="w-9 h-9 rounded-lg bg-[#ecfdf5] text-tertiary-container flex items-center justify-center"><Icon name="call" size={20} /></div>
            <div className="mt-3 font-semibold">Phone & WhatsApp</div>
            <div className="text-sm muted">{settings?.phone}</div>
            <a href={waLink(settings?.whatsapp)} target="_blank" rel="noreferrer" className="btn btn-success w-full mt-4"><Icon name="chat" size={18} /> Chat on WhatsApp</a>
          </div>
          <div className="card p-5">
            <div className="w-9 h-9 rounded-lg bg-surface-container-high text-primary flex items-center justify-center"><Icon name="mail" size={20} /></div>
            <div className="mt-3 font-semibold">Email</div>
            <div className="text-sm muted break-all">{settings?.email}</div>
            <a href={`mailto:${settings?.email}`} className="btn btn-outline w-full mt-4"><Icon name="send" size={18} /> Send email</a>
          </div>
          <div className="card p-5">
            <div className="w-9 h-9 rounded-lg bg-secondary-fixed text-on-secondary-fixed-variant flex items-center justify-center"><Icon name="location_on" size={20} /></div>
            <div className="mt-3 font-semibold">Address</div>
            <div className="text-sm muted">{settings?.address}</div>
            <a href={`https://maps.google.com/?q=${encodeURIComponent(settings?.address || '')}`} target="_blank" rel="noreferrer" className="btn btn-outline w-full mt-4"><Icon name="map" size={18} /> View map</a>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
