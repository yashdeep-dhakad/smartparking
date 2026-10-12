import { useEffect, useState } from 'react';
import api, { errMsg } from '../services/api.js';
import AdminNav from '../components/AdminNav.jsx';
import CrudManager from '../components/CrudManager.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import { VEHICLES } from '../utils/format.js';

const TYPES = ['public', 'private', 'on-site', 'street', 'multi-level'];
const VT = ['car', 'bike', 'other'];
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const emptyForm = {
  name: '', attraction: '', type: 'public', address: '', lat: '', lng: '', description: '',
  rate_car: '', rate_bike: '', rate_other: '', minHours: 1, dailyCap: 0, convenienceFee: 0, taxPercent: 18,
  is24x7: false, open: '06:00', close: '23:00', verified: false, dataSource: 'demo', notes: '', featured: false, isActive: true,
};

function toForm(p) {
  const f = {
    ...emptyForm, name: p.name, attraction: p.attraction?._id || p.attraction, type: p.type, address: p.address,
    lat: p.location.lat, lng: p.location.lng, description: p.description || '', convenienceFee: p.convenienceFee, taxPercent: p.taxPercent,
    is24x7: p.operatingHours.is24x7, open: p.operatingHours.open, close: p.operatingHours.close, verified: p.verified, dataSource: p.dataSource,
    notes: p.notes || '', featured: p.featured, isActive: p.isActive,
  };
  p.pricing.forEach((r) => { f[`rate_${r.vehicleType}`] = r.ratePerHour; f.minHours = r.minHours; f.dailyCap = r.dailyCap || 0; });
  return f;
}

function fromForm(f) {
  if (!HHMM.test(f.open) || !HHMM.test(f.close)) throw new Error('Opening and closing times must look like 06:00.');
  const pricing = VT.filter((v) => f[`rate_${v}`] !== '' && f[`rate_${v}`] != null).map((v) => ({
    vehicleType: v, ratePerHour: Number(f[`rate_${v}`]), minHours: Number(f.minHours) || 1, dailyCap: Number(f.dailyCap) || 0,
  }));
  if (!pricing.length) throw new Error('Enter an hourly rate for at least one vehicle type.');
  return {
    name: f.name, attraction: f.attraction, type: f.type, address: f.address, location: { lat: Number(f.lat), lng: Number(f.lng) },
    description: f.description, vehicleTypes: pricing.map((p) => p.vehicleType), pricing,
    convenienceFee: Number(f.convenienceFee) || 0, taxPercent: Number(f.taxPercent) || 0,
    operatingHours: { is24x7: !!f.is24x7, open: f.open, close: f.close },
    verified: !!f.verified, dataSource: f.dataSource, notes: f.notes, featured: !!f.featured, isActive: !!f.isActive,
  };
}

function StructureManager() {
  const [locations, setLocations] = useState([]);
  const [locId, setLocId] = useState('');
  const [areas, setAreas] = useState([]);
  const [err, setErr] = useState('');
  const [area, setArea] = useState({ name: '', code: '' });
  const [bulk, setBulk] = useState({ areaId: '', count: 4, vehicleTypes: ['car'] });

  useEffect(() => { api.get('/admin/parking-locations', { params: { limit: 200 } }).then((r) => setLocations(r.data.items)); }, []);
  const load = (id = locId) => { if (!id) return setAreas([]); api.get(`/admin/parking-locations/${id}/structure`).then((r) => setAreas(r.data.areas)).catch((e) => setErr(errMsg(e))); };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [locId]);

  const run = async (fn) => { setErr(''); try { await fn(); load(); } catch (e) { setErr(errMsg(e)); } };

  return (
    <section className="mt">
      <h2>Areas &amp; slots</h2>
      <label className="field-inline">Parking location
        <select value={locId} onChange={(e) => setLocId(e.target.value)}>
          <option value="">Select…</option>
          {locations.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
        </select>
      </label>
      <ErrorMessage message={err} />
      {locId && (
        <>
          <form className="toolbar wrap" onSubmit={(e) => { e.preventDefault(); run(async () => { await api.post('/admin/parking-areas', { ...area, location: locId }); setArea({ name: '', code: '' }); }); }}>
            <input aria-label="Area name" placeholder="New area name (e.g. Basement)" value={area.name} onChange={(e) => setArea({ ...area, name: e.target.value })} required />
            <input aria-label="Slot prefix" placeholder="Prefix (e.g. B)" maxLength={4} value={area.code} onChange={(e) => setArea({ ...area, code: e.target.value })} required />
            <button className="btn btn-primary btn-sm">Add area</button>
          </form>
          {areas.map((a) => (
            <div key={a._id} className="panel">
              <div className="row-between">
                <h3>{a.name} <span className="muted small">({a.code}) {!a.isActive && '· inactive'}</span></h3>
                <button className="btn btn-ghost btn-sm" onClick={() => run(() => api.patch(`/admin/parking-areas/${a._id}`, { isActive: !a.isActive }))}>{a.isActive ? 'Deactivate area' : 'Activate area'}</button>
              </div>
              <div className="admin-slots">
                {a.slots.map((s) => (
                  <div key={s._id} className={`admin-slot ${!s.isActive ? 'off' : ''}`}>
                    <strong>{s.code}</strong>
                    <span className="small">{s.vehicleTypes.map((v) => VEHICLES[v]).join(', ')}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => run(() => api.patch(`/admin/parking-slots/${s._id}`, { isActive: !s.isActive }))}>{s.isActive ? 'Disable' : 'Enable'}</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => run(() => api.patch(`/admin/parking-slots/${s._id}`, { manualStatus: s.manualStatus === 'occupied' ? 'available' : 'occupied' }))}>{s.manualStatus === 'occupied' ? 'Mark available' : 'Mark occupied'}</button>
                  </div>
                ))}
              </div>
              <form className="toolbar wrap" onSubmit={(e) => { e.preventDefault(); run(() => api.post(`/admin/parking-areas/${a._id}/slots/bulk`, { count: Number(bulk.count), vehicleTypes: bulk.vehicleTypes })); }}>
                <label className="field-inline">Add slots <input type="number" min="1" max="100" value={bulk.count} onChange={(e) => setBulk({ ...bulk, count: e.target.value })} style={{ width: 80 }} /></label>
                {VT.map((v) => (
                  <label key={v} className="chip-check"><input type="checkbox" checked={bulk.vehicleTypes.includes(v)} onChange={(e) => setBulk({ ...bulk, vehicleTypes: e.target.checked ? [...bulk.vehicleTypes, v] : bulk.vehicleTypes.filter((x) => x !== v) })} /> {VEHICLES[v]}</label>
                ))}
                <button className="btn btn-primary btn-sm" disabled={!bulk.vehicleTypes.length}>Create slots</button>
              </form>
            </div>
          ))}
        </>
      )}
    </section>
  );
}

export default function ManageParking() {
  return (
    <div className="container section">
      <h1>Admin</h1>
      <AdminNav />
      <CrudManager
        title="Parking locations" endpoint="parking-locations" emptyForm={emptyForm}
        toForm={toForm}
        fromForm={fromForm}
        columns={[
          { label: 'Name', key: 'name' }, { label: 'Attraction', render: (p) => p.attraction?.name }, { label: 'Type', key: 'type' },
          { label: 'Data', render: (p) => (p.verified ? 'Verified' : 'Demo / unverified') },
        ]}
        fields={[
          { name: 'name', label: 'Name', required: true },
          { name: 'attraction', label: 'Attraction', type: 'ref', source: 'attractions' },
          { name: 'type', label: 'Parking type', type: 'select', options: TYPES },
          { name: 'address', label: 'Address', required: true },
          { name: 'lat', label: 'Latitude', type: 'number' }, { name: 'lng', label: 'Longitude', type: 'number' },
          { name: 'description', label: 'Description', type: 'textarea' },
          { name: 'rate_car', label: 'Car rate per hour (₹)', type: 'number', help: 'Leave blank if cars are not supported.' },
          { name: 'rate_bike', label: 'Two-wheeler rate per hour (₹)', type: 'number' },
          { name: 'rate_other', label: 'Other vehicle rate per hour (₹)', type: 'number', help: 'For any vehicle that is not a car or two-wheeler.' },
          { name: 'minHours', label: 'Minimum billable hours', type: 'number' },
          { name: 'dailyCap', label: 'Maximum charge per booking (₹, 0 = none)', type: 'number' },
          { name: 'convenienceFee', label: 'Convenience fee per booking (₹)', type: 'number' },
          { name: 'taxPercent', label: 'GST %', type: 'number' },
          { name: 'is24x7', label: 'Open 24 hours', type: 'checkbox' },
          { name: 'open', label: 'Opens (HH:MM, IST)' }, { name: 'close', label: 'Closes (HH:MM, IST)' },
          { name: 'verified', label: 'Address, fees and hours are verified', type: 'checkbox' },
          { name: 'dataSource', label: 'Data source', type: 'select', options: ['demo', 'operator', 'verified'] },
          { name: 'notes', label: 'Internal notes', type: 'textarea' },
          { name: 'featured', label: 'Featured', type: 'checkbox' }, { name: 'isActive', label: 'Active', type: 'checkbox' },
        ]}
      />
      <StructureManager />
    </div>
  );
}
