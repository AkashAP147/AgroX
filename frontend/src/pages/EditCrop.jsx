import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { updateCrop } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function EditCrop({ crops, onCropUpdated }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { cropId } = useParams();
  const crop = crops.find(c => c._id === cropId);
  const [form, setForm] = useState({
    cropName: crop?.cropName || '',
    quantity: crop?.quantity || '',
    price: crop?.price || '',
    location: crop?.location || '',
    availableUntil: crop?.availableUntil ? crop.availableUntil.slice(0, 10) : '',
    quantityUnit: crop?.quantityUnit || 'kg',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!crop) return <div className="p-8 text-center text-red-600">Crop not found.</div>;

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await updateCrop(cropId, form);
      if (onCropUpdated) onCropUpdated();
      navigate(-1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  return (
    <div className="max-w-md mx-auto p-6 card-static mt-8">
      <h2 className="text-xl font-bold mb-4">{t('editCrop') || 'Edit Crop'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input className="input w-full" name="cropName" value={form.cropName} onChange={handleChange} placeholder="Crop Name" required />
        <input className="input w-full" name="quantity" value={form.quantity} onChange={handleChange} placeholder="Quantity" required type="number" min="1" />
        <input className="input w-full" name="price" value={form.price} onChange={handleChange} placeholder="Price" required type="number" min="1" />
        <input className="input w-full" name="location" value={form.location} onChange={handleChange} placeholder="Location" required />
        <input className="input w-full" name="availableUntil" value={form.availableUntil} onChange={handleChange} placeholder="Available Until" type="date" required />
        <select className="input w-full" name="quantityUnit" value={form.quantityUnit} onChange={handleChange} required>
          <option value="kg">kg</option>
          <option value="quintal">quintal</option>
          <option value="ton">ton</option>
        </select>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button className="btn btn-primary w-full" type="submit" disabled={loading}>{loading ? 'Saving...' : t('save') || 'Save'}</button>
      </form>
    </div>
  );
}
