import { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';

// Colored div pins avoid the Vite/Leaflet default-icon image path problem.
const pin = (type) =>
  L.divIcon({
    className: 'pw-pin-wrap',
    html: `<span class="pw-pin pw-pin-${type}">${type === 'attraction' ? '★' : 'P'}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -14],
  });

function Fit({ markers }) {
  const map = useMap();
  useEffect(() => {
    if (!markers.length) return;
    if (markers.length === 1) map.setView([markers[0].lat, markers[0].lng], 16);
    else map.fitBounds(markers.map((m) => [m.lat, m.lng]), { padding: [40, 40], maxZoom: 17 });
    // Container may have been sized after mount (flex/route transition) - recalculate.
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [markers, map]);
  return null;
}

// markers: [{ lat, lng, label, type: 'attraction' | 'parking', link?, sub? }]
export default function MapView({ markers = [], height = 340 }) {
  const valid = markers.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));
  if (!valid.length) return <div className="empty">No map location available.</div>;
  return (
    <div className="map-wrap" style={{ height }}>
      <MapContainer center={[valid[0].lat, valid[0].lng]} zoom={15} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <Fit markers={valid} />
        {valid.map((m, i) => (
          <Marker key={`${m.label}-${i}`} position={[m.lat, m.lng]} icon={pin(m.type)}>
            <Popup>
              <strong>{m.label}</strong>
              {m.sub && <div>{m.sub}</div>}
              {m.link && <div><Link to={m.link}>View details</Link></div>}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
