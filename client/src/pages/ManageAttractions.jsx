import AdminNav from '../components/AdminNav.jsx';
import CrudManager from '../components/CrudManager.jsx';

const CATEGORIES = ['Mall', 'Heritage', 'Temple', 'Nature', 'Park', 'Museum', 'Market', 'Other'];

export default function ManageAttractions() {
  return (
    <div className="container section">
      <h1>Admin</h1>
      <AdminNav />
      <CrudManager
        title="Attractions" endpoint="attractions"
        columns={[{ label: 'Name', key: 'name' }, { label: 'City', render: (a) => a.city?.name }, { label: 'Category', key: 'category' }]}
        emptyForm={{ name: '', city: '', category: 'Other', shortDescription: '', description: '', address: '', lat: '', lng: '', image: '', openingHours: '', hoursVerified: false, featured: false, popularity: 0, isActive: true }}
        toForm={(a) => ({ ...a, city: a.city?._id || a.city, lat: a.location?.lat, lng: a.location?.lng, image: a.images?.[0] || '' })}
        fromForm={(f) => ({
          name: f.name, city: f.city, category: f.category, shortDescription: f.shortDescription, description: f.description, address: f.address,
          location: { lat: Number(f.lat), lng: Number(f.lng) }, images: f.image ? [f.image] : [], openingHours: f.openingHours,
          hoursVerified: !!f.hoursVerified, featured: !!f.featured, popularity: Number(f.popularity) || 0, isActive: !!f.isActive,
        })}
        fields={[
          { name: 'name', label: 'Name', required: true }, { name: 'city', label: 'City', type: 'ref', source: 'cities' },
          { name: 'category', label: 'Category', type: 'select', options: CATEGORIES },
          { name: 'shortDescription', label: 'Short description (max 200 chars)' }, { name: 'description', label: 'Description', type: 'textarea' },
          { name: 'address', label: 'Address', required: true },
          { name: 'lat', label: 'Latitude', type: 'number' }, { name: 'lng', label: 'Longitude', type: 'number' },
          { name: 'image', label: 'Image URL' }, { name: 'openingHours', label: 'Opening hours' },
          { name: 'hoursVerified', label: 'Opening hours are verified', type: 'checkbox' },
          { name: 'featured', label: 'Featured', type: 'checkbox' }, { name: 'popularity', label: 'Popularity score (0-100)', type: 'number' },
          { name: 'isActive', label: 'Active', type: 'checkbox' },
        ]}
      />
    </div>
  );
}
