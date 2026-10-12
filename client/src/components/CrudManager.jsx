import { useEffect, useState } from 'react';
import api, { errMsg } from '../services/api.js';
import ErrorMessage from './ErrorMessage.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';
import Pagination from './Pagination.jsx';

// Generic admin list + add/edit form.
// fields: { name, label, type: text|textarea|number|checkbox|select|ref|multicheck, options?, source? (API list for 'ref'), required?, help? }
export default function CrudManager({ title, endpoint, columns, fields, emptyForm, toForm = (x) => x, fromForm = (x) => x }) {
  const [list, setList] = useState({ items: [], page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null | { id?, form }
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [refs, setRefs] = useState({});

  const load = () => {
    setLoading(true);
    api.get(`/admin/${endpoint}`, { params: { page, limit: 15, search: search || undefined } })
      .then((r) => { setList(r.data); setError(''); })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [page, endpoint]);

  useEffect(() => {
    fields.filter((f) => f.type === 'ref').forEach((f) => {
      api.get(`/admin/${f.source}`, { params: { limit: 200 } }).then((r) => setRefs((p) => ({ ...p, [f.source]: r.data.items })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setFormErr('');
    try {
      const body = fromForm(editing.form);
      if (editing.id) await api.patch(`/admin/${endpoint}/${editing.id}`, body); else await api.post(`/admin/${endpoint}`, body);
      setEditing(null);
      load();
    } catch (err) { setFormErr(errMsg(err)); }
    finally { setSaving(false); }
  };

  const toggle = async (item) => {
    try { await api.patch(`/admin/${endpoint}/${item._id}`, { isActive: !item.isActive }); load(); } catch (err) { setError(errMsg(err)); }
  };

  const set = (name, value) => setEditing((p) => ({ ...p, form: { ...p.form, [name]: value } }));

  const input = (f) => {
    const v = editing.form[f.name];
    if (f.type === 'textarea') return <textarea rows={3} value={v ?? ''} onChange={(e) => set(f.name, e.target.value)} />;
    if (f.type === 'checkbox') return <input type="checkbox" checked={!!v} onChange={(e) => set(f.name, e.target.checked)} />;
    if (f.type === 'number') return <input type="number" step="any" value={v ?? ''} onChange={(e) => set(f.name, e.target.value)} />;
    if (f.type === 'select') return <select value={v ?? ''} onChange={(e) => set(f.name, e.target.value)}>{f.options.map((o) => <option key={o} value={o}>{o}</option>)}</select>;
    if (f.type === 'ref') return (
      <select value={v ?? ''} onChange={(e) => set(f.name, e.target.value)} required>
        <option value="">Select…</option>
        {(refs[f.source] || []).map((o) => <option key={o._id} value={o._id}>{o.name}</option>)}
      </select>
    );
    if (f.type === 'multicheck') return (
      <div className="chips">{f.options.map((o) => (
        <label key={o} className="chip-check"><input type="checkbox" checked={(v || []).includes(o)} onChange={(e) => set(f.name, e.target.checked ? [...(v || []), o] : (v || []).filter((x) => x !== o))} /> {o}</label>
      ))}</div>
    );
    return <input value={v ?? ''} required={f.required} onChange={(e) => set(f.name, e.target.value)} />;
  };

  return (
    <section>
      <div className="row-between">
        <h2>{title}</h2>
        <div className="btn-row">
          <form onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }} className="inline-form">
            <input aria-label={`Search ${title}`} placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="btn btn-ghost btn-sm">Search</button>
          </form>
          <button className="btn btn-primary btn-sm" onClick={() => setEditing({ form: { ...emptyForm } })}>Add new</button>
        </div>
      </div>
      <ErrorMessage message={error} onRetry={load} />
      {loading ? <LoadingSpinner /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr>{columns.map((c) => <th key={c.label}>{c.label}</th>)}<th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {list.items.map((item) => (
                <tr key={item._id}>
                  {columns.map((c) => <td key={c.label}>{c.render ? c.render(item) : item[c.key]}</td>)}
                  <td><span className={`badge ${item.isActive ? 'badge-green' : 'badge-grey'}`}>{item.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="btn-row">
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing({ id: item._id, form: toForm(item) })}>Edit</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggle(item)}>{item.isActive ? 'Deactivate' : 'Activate'}</button>
                  </td>
                </tr>
              ))}
              {list.items.length === 0 && <tr><td colSpan={columns.length + 2} className="muted">No records.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={list.page} pages={list.pages} onChange={setPage} />

      {editing && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`${editing.id ? 'Edit' : 'Add'} ${title}`}>
          <form className="modal" onSubmit={save}>
            <h3>{editing.id ? 'Edit' : 'Add'} record</h3>
            <ErrorMessage message={formErr} />
            <div className="modal-fields">
              {fields.map((f) => (
                <label key={f.name} className={f.type === 'checkbox' ? 'check' : ''}>
                  {f.label}
                  {input(f)}
                  {f.help && <span className="muted small">{f.help}</span>}
                </label>
              ))}
            </div>
            <div className="btn-row">
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
