import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errMsg } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Icon, Field, ErrorBox, PageHeader, Spinner, useToast } from '../../components/ui';
import { PackageFields, emptyPackage } from '../../components/PackageForm';

const BOARDS = ['CBSE', 'ICSE', 'State Board', 'IB', 'IGCSE', 'Other'];

export default function StudentForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const toast = useToast();
  const { settings } = useAuth();
  const [f, setF] = useState({ name: '', phone: '', email: '', grade: '', board: '', subjects: [], parentName: '', parentPhone: '', address: '', password: '', notes: '', status: 'active' });
  const [withPkg, setWithPkg] = useState(true);
  const [pkg, setPkg] = useState(emptyPackage());
  const [loading, setLoading] = useState(isEdit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/students/${id}`).then(({ data }) => {
      const s = data.student;
      setF({ ...f, ...Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v ?? ''])), password: '' });
    }).catch((e) => setError(errMsg(e))).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggleSubject = (s) => setF({ ...f, subjects: f.subjects.includes(s) ? f.subjects.filter((x) => x !== s) : [...f.subjects, s] });

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      if (isEdit) {
        const body = { ...f };
        if (!body.password) delete body.password;
        await api.put(`/students/${id}`, body);
        toast('Student updated');
        navigate(`/tutor/students/${id}`);
      } else {
        const { data: student } = await api.post('/students', f);
        if (withPkg && pkg.subject) {
          await api.post('/packages', { ...pkg, student: student._id, schedule: pkg.schedule.map((s) => ({ day: Number(s.day), time: s.time })) });
        }
        toast('Student added');
        navigate(`/tutor/students/${student._id}`);
      }
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  if (loading) return <Spinner />;
  return (
    <div className="max-w-4xl">
      <Link to={isEdit ? `/tutor/students/${id}` : '/tutor/students'} className="text-sm text-primary font-medium inline-flex items-center gap-1 mb-3"><Icon name="arrow_back" size={18} /> Back</Link>
      <PageHeader title={isEdit ? 'Edit student' : 'Add student'} subtitle={isEdit ? f.name : 'Student is active immediately – no approval needed'} />
      <form onSubmit={submit} className="space-y-5">
        <section className="card card-pad">
          <h2 className="h-card mb-4 flex items-center gap-2"><Icon name="person" className="text-primary" size={20} /> Personal details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full name *" className="sm:col-span-2"><input className="input" value={f.name} onChange={set('name')} required /></Field>
            <Field label="Phone *" hint="Used to log in"><input className="input" type="tel" value={f.phone} onChange={set('phone')} required /></Field>
            <Field label="Email"><input className="input" type="email" value={f.email} onChange={set('email')} /></Field>
            <Field label="Class / Grade">
              <select className="input" value={f.grade} onChange={set('grade')}>
                <option value="">Select</option>{(settings?.grades || []).map((g) => <option key={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Board">
              <select className="input" value={f.board} onChange={set('board')}><option value="">Select</option>{BOARDS.map((b) => <option key={b}>{b}</option>)}</select>
            </Field>
            <Field label={isEdit ? 'New password (leave blank to keep)' : 'Login password'} hint={isEdit ? '' : 'If blank, the phone number becomes the password'}>
              <input className="input" type="text" value={f.password} onChange={set('password')} placeholder={isEdit ? '••••••' : 'Defaults to phone number'} />
            </Field>
            {isEdit && (
              <Field label="Status">
                <select className="input" value={f.status} onChange={set('status')}><option value="active">Active</option><option value="inactive">Inactive</option></select>
              </Field>
            )}
          </div>
          <div className="mt-4">
            <span className="label">Subjects</span>
            <div className="flex flex-wrap gap-2">
              {(settings?.subjects || []).map((s) => (
                <button type="button" key={s} onClick={() => toggleSubject(s)}
                  className={`px-3 py-1.5 rounded-full border text-sm font-medium ${f.subjects.includes(s) ? 'bg-primary-container border-primary-container text-white' : 'bg-white border-slate-200 text-on-surface-variant'}`}>{s}</button>
              ))}
            </div>
          </div>
        </section>

        <section className="card card-pad">
          <h2 className="h-card mb-4 flex items-center gap-2"><Icon name="family_restroom" className="text-primary" size={20} /> Parent details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Parent's name"><input className="input" value={f.parentName} onChange={set('parentName')} /></Field>
            <Field label="Parent's phone"><input className="input" type="tel" value={f.parentPhone} onChange={set('parentPhone')} /></Field>
            <Field label="Address" className="sm:col-span-2"><input className="input" value={f.address} onChange={set('address')} /></Field>
            <Field label="Private notes (only you can see)" className="sm:col-span-2"><textarea className="input" rows={2} value={f.notes} onChange={set('notes')} /></Field>
          </div>
        </section>

        {!isEdit && (
          <section className="card card-pad">
            <div className="flex items-center justify-between mb-4">
              <h2 className="h-card flex items-center gap-2"><Icon name="inventory_2" className="text-primary" size={20} /> Class package, timings & fee</h2>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[#4f46e5] w-4 h-4" checked={withPkg} onChange={(e) => setWithPkg(e.target.checked)} /> Assign now</label>
            </div>
            {withPkg ? <PackageFields value={pkg} onChange={setPkg} subjects={settings?.subjects || []} /> : <p className="text-sm muted">You can assign a package later from the student's page.</p>}
          </section>
        )}

        <ErrorBox message={error} />
        <div className="flex justify-end gap-2">
          <Link to={isEdit ? `/tutor/students/${id}` : '/tutor/students'} className="btn btn-outline">Cancel</Link>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add student'}</button>
        </div>
      </form>
    </div>
  );
}
