import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import useFetch from '../../lib/useFetch';
import api, { errMsg } from '../../lib/api';
import { fmtDate, inr } from '../../lib/format';
import { Icon, Spinner, PageHeader, Tabs, Empty, Avatar, Chip, ProgressBar, useToast, ErrorBox } from '../../components/ui';

export default function Students() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'active';
  const [q, setQ] = useState('');
  const [grade, setGrade] = useState('');
  const [fee, setFee] = useState('');
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(`/students?status=${tab}`);

  const list = (data || []).filter((s) => {
    const rx = q.toLowerCase();
    if (rx && ![s.name, s.phone, s.rollNo, s.email, s.parentName].some((v) => (v || '').toLowerCase().includes(rx))) return false;
    if (grade && s.grade !== grade) return false;
    if (fee === 'pending' && !s.pendingFees) return false;
    if (fee === 'clear' && s.pendingFees) return false;
    return true;
  });
  const grades = [...new Set((data || []).map((s) => s.grade).filter(Boolean))];

  return (
    <div>
      <PageHeader title="Students" subtitle="Manage enrolments and packages"
        actions={<Link to="/tutor/students/new" className="btn btn-primary"><Icon name="person_add" size={20} /> Add student</Link>} />

      <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between mb-4">
        <Tabs value={tab} onChange={(t) => setParams({ tab: t })} tabs={[
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
        ]} />
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input className="input pl-9 sm:w-64" placeholder="Search name, phone, roll no" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {tab === 'active' && (
            <>
              <select className="input sm:w-36" value={grade} onChange={(e) => setGrade(e.target.value)}>
                <option value="">All classes</option>{grades.map((g) => <option key={g}>{g}</option>)}
              </select>
              <select className="input sm:w-36" value={fee} onChange={(e) => setFee(e.target.value)}>
                <option value="">All fees</option><option value="pending">Fees pending</option><option value="clear">Fees clear</option>
              </select>
            </>
          )}
        </div>
      </div>

      <ErrorBox message={error} />
      {loading && !data ? <Spinner /> : !list.length ? (
        <div className="card"><Empty icon="group" title="No students found"
          action={tab === 'active' && <Link to="/tutor/students/new" className="btn btn-primary btn-sm">Add your first student</Link>} /></div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card hidden md:block overflow-x-auto p-2">
            <table className="table-base">
              <thead><tr><th>Student</th><th>Class</th><th>Subjects</th><th className="w-56">Package progress</th><th>Fees</th><th /></tr></thead>
              <tbody>
                {list.map((s) => {
                  const p = s.packages?.[0];
                  return (
                    <tr key={s._id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/tutor/students/${s._id}`)}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={s.name} size={34} />
                          <div><div className="font-semibold">{s.name}</div><div className="text-xs muted">Roll #{s.rollNo || '—'} · {s.phone}</div></div>
                        </div>
                      </td>
                      <td className="text-sm">{s.grade}{s.board ? <span className="muted"> · {s.board}</span> : ''}</td>
                      <td className="text-sm">{(s.subjects || []).join(', ')}</td>
                      <td>
                        {p ? (
                          <div>
                            <div className="flex justify-between text-xs mb-1"><span className="font-medium">{p.subject}</span><span className={p.stats.remaining <= 2 ? 'text-error font-semibold' : 'muted'}>{p.stats.completed}/{p.totalClasses} · {p.stats.remaining} left</span></div>
                            <ProgressBar value={p.stats.progress} />
                            {s.packages.length > 1 && <div className="text-[11px] muted mt-1">+{s.packages.length - 1} more package</div>}
                          </div>
                        ) : <span className="text-xs muted">No active package</span>}
                      </td>
                      <td>{s.pendingFees ? <Chip status="pending" label={`${inr(s.pendingFees)} due`} /> : <Chip status="paid" label="Clear" />}</td>
                      <td className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Link to={`/tutor/students/${s._id}/edit`} className="p-1.5 rounded-lg hover:bg-slate-100 inline-flex text-slate-500" title="Edit"><Icon name="edit" size={18} /></Link>
                        <Link to={`/tutor/students/${s._id}`} className="p-1.5 rounded-lg hover:bg-slate-100 inline-flex text-slate-500" title="View"><Icon name="visibility" size={18} /></Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3">
            {list.map((s) => {
              const p = s.packages?.[0];
              return (
                <Link key={s._id} to={`/tutor/students/${s._id}`} className="card p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={s.name} size={38} />
                    <div className="flex-1 min-w-0"><div className="font-semibold truncate">{s.name}</div><div className="text-xs muted">{s.grade} · Roll #{s.rollNo}</div></div>
                    {s.pendingFees ? <Chip status="pending" label={inr(s.pendingFees)} /> : <Chip status="paid" label="Clear" />}
                  </div>
                  {p && <div className="mt-3"><div className="flex justify-between text-xs mb-1"><span>{p.subject}</span><span className="muted">{p.stats.remaining} left</span></div><ProgressBar value={p.stats.progress} /></div>}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

