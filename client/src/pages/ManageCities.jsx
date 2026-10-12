import AdminNav from '../components/AdminNav.jsx';
import CrudManager from '../components/CrudManager.jsx';

export default function ManageCities() {
  return (
    <div className="container section">
      <h1>Admin</h1>
      <AdminNav />
      <CrudManager
        title="Cities" endpoint="cities"
        columns={[{ label: 'Name', key: 'name' }, { label: 'State', key: 'state' }, { label: 'Featured', render: (c) => (c.featured ? 'Yes' : 'No') }]}
        emptyForm={{ name: '', state: '', description: '', image: '', featured: false, isActive: true }}
        fields={[
          { name: 'name', label: 'Name', required: true }, { name: 'state', label: 'State', required: true },
          { name: 'description', label: 'Description', type: 'textarea' }, { name: 'image', label: 'Image URL', help: 'Paste a direct image link.' },
          { name: 'featured', label: 'Featured on home page', type: 'checkbox' }, { name: 'isActive', label: 'Active', type: 'checkbox' },
        ]}
      />
    </div>
  );
}
