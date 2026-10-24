import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import { Icon, Avatar } from './ui';
import { fmtDate } from '../lib/format';

const TUTOR_NAV = [
  { to: '/tutor', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/tutor/students', label: 'Students', icon: 'group' },
  { to: '/tutor/classes', label: 'Classes', icon: 'calendar_month' },
  { to: '/tutor/attendance', label: 'Attendance', icon: 'fact_check' },
  { to: '/tutor/payments', label: 'Payments', icon: 'payments' },
  { to: '/tutor/assignments', label: 'Assignments', icon: 'assignment' },
  { to: '/tutor/tests', label: 'Tests', icon: 'quiz' },
  { to: '/tutor/announcements', label: 'Announcements', icon: 'campaign' },
  { to: '/tutor/profile', label: 'Profile', icon: 'person' },
];
const TUTOR_TABS = ['/tutor', '/tutor/students', '/tutor/classes', '/tutor/payments'];

const STUDENT_NAV = [
  { to: '/student', label: 'Home', icon: 'home', end: true },
  { to: '/student/classes', label: 'My Classes', short: 'Classes', icon: 'calendar_month' },
  { to: '/student/homework', label: 'Homework', short: 'Tasks', icon: 'assignment' },
  { to: '/student/materials', label: 'Study Materials', short: 'Notes', icon: 'menu_book' },
  { to: '/student/payments', label: 'Payments', short: 'Fees', icon: 'currency_rupee' },
  { to: '/student/results', label: 'Results', icon: 'military_tech' },
  { to: '/student/profile', label: 'Profile', icon: 'account_circle' },
];
const STUDENT_TABS = ['/student', '/student/classes', '/student/homework', '/student/payments', '/student/results', '/student/profile'];

export default function Layout({ role }) {
  const { user, settings, logout } = useAuth();
  const [unread, setUnread] = useState(0);
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const nav = role === 'tutor' ? TUTOR_NAV : STUDENT_NAV;
  const tabs = (role === 'tutor' ? TUTOR_TABS : STUDENT_TABS).map((p) => nav.find((n) => n.to === p));
  const base = role === 'tutor' ? '/tutor' : '/student';

  useEffect(() => {
    let alive = true;
    const load = () => api.get('/notifications').then(({ data }) => alive && setUnread(data.unread)).catch(() => {});
    load();
    const t = setInterval(load, 60000);
    return () => { alive = false; clearInterval(t); };
  }, [location.pathname]);

  useEffect(() => { setDrawer(false); window.scrollTo(0, 0); }, [location.pathname]);

  const doLogout = () => { logout(); navigate('/'); };
  const name = settings?.tuitionName || 'EduuRise Academy';
  const [first, ...rest] = name.split(' ');

  const Brand = (
    <Link to={base} className="flex items-center gap-2.5">
      <img src={settings?.logoUrl || '/logo.png'} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
      <div className="flex flex-col leading-tight">
        <span className="font-semibold text-on-surface">{first} {rest.slice(0, 1).join(' ')}</span>
        <span className="text-xs font-semibold text-primary">{rest.slice(1).join(' ') || 'Tuition'}</span>
      </div>
    </Link>
  );

  const NavItems = (
    <nav className="flex-1 px-3 py-2 flex flex-col gap-0.5 overflow-y-auto no-scrollbar">
      {nav.map((n) => (
        <NavLink key={n.to} to={n.to} end={n.end}
          className={({ isActive }) => `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-primary-container text-white shadow-[0_2px_4px_rgba(79,70,229,0.2)]' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}>
          <Icon name={n.icon} size={20} /> {n.label}
        </NavLink>
      ))}
      <NavLink to={`${base}/notifications`}
        className={({ isActive }) => `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-primary-container text-white' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}>
        <Icon name="notifications" size={20} /> Notifications
        {unread > 0 && <span className="ml-auto bg-error text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">{unread}</span>}
      </NavLink>
    </nav>
  );

  const UserBox = (
    <div className="m-3 p-3 rounded-xl bg-surface-container-low flex items-center gap-2.5">
      <Avatar name={user?.name} size={34} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate">{user?.name}</p>
        <p className="text-[11px] muted truncate">{role === 'tutor' ? (user?.qualification || 'Tutor') : `${user?.grade || 'Student'}${user?.rollNo ? ` · Roll #${user.rollNo}` : ''}`}</p>
      </div>
      <button onClick={doLogout} title="Log out" className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-error"><Icon name="logout" size={20} /></button>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 flex-col z-40">
        <div className="px-5 pt-5 pb-3">{Brand}</div>
        {NavItems}
        {UserBox}
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="lg:hidden fixed inset-0 z-50 bg-[rgba(15,23,42,0.4)]" onClick={() => setDrawer(false)}>
          <aside className="absolute inset-y-0 left-0 w-72 bg-white flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 pt-5 pb-3">{Brand}</div>
            {NavItems}
            {UserBox}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 no-print">
          <div className="flex items-center gap-2">
            <button className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100" onClick={() => setDrawer(true)} aria-label="Menu"><Icon name="menu" /></button>
            <div className="lg:hidden">{Brand}</div>
            <div className="hidden lg:flex items-center gap-1.5 text-on-surface-variant px-2.5 py-1 rounded-lg bg-surface-container-low text-xs font-medium">
              <Icon name="today" size={16} /> {new Date().toLocaleDateString('en-GB', { weekday: 'long' })}, {fmtDate(new Date())}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to={`${base}/notifications`} className="relative p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low" aria-label="Notifications">
              <Icon name="notifications" size={22} />
              {unread > 0 && <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>}
            </Link>
            <Link to={`${base}/profile`} className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
              <span className="text-sm font-medium">{user?.name}</span>
              <Avatar name={user?.name} size={32} />
            </Link>
          </div>
        </header>

        <main className="px-4 lg:px-6 py-5 lg:py-6 pb-28 lg:pb-10 max-w-[1400px] mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom tabs */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 pb-safe no-print">
        <div className="flex justify-around">
          {tabs.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => `flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${isActive ? 'text-primary-container' : 'text-slate-500'}`}>
              {({ isActive }) => (<><Icon name={n.icon} fill={isActive} size={24} /><span>{n.short || n.label}</span></>)}
            </NavLink>
          ))}
          {role === 'tutor' && (
            <button onClick={() => setDrawer(true)} className="flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-slate-500">
              <Icon name="more_horiz" size={24} /><span>More</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
