import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getFarmerCrops } from '../services/api';
import { getPendingCrops } from '../services/offlineDB';
import CropCard from '../components/CropCard';
import VoiceCropInput from '../components/VoiceCropInput';
import { Wheat, CheckCircle2, IndianRupee, Upload, MapPin, Plus, TrendingUp, TrendingDown, Minus, BarChart3, Sprout, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const HEATMAP_DATA = [
  { crop: 'Rice', demand: 'High', level: 3 },
  { crop: 'Wheat', demand: 'Medium', level: 2 },
  { crop: 'Tomato', demand: 'Very High', level: 4 },
  { crop: 'Onion', demand: 'High', level: 3 },
  { crop: 'Potato', demand: 'Medium', level: 2 },
  { crop: 'Mango', demand: 'Low', level: 1 },
  { crop: 'Banana', demand: 'Medium', level: 2 },
  { crop: 'Sugarcane', demand: 'High', level: 3 }
];

const DEMAND_COLORS = {
  1: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  2: 'bg-amber-100 text-amber-700 ring-amber-200',
  3: 'bg-orange-100 text-orange-700 ring-orange-200',
  4: 'bg-red-100 text-red-700 ring-red-200'
};

export default function FarmerDashboard({ user }) {
  const { t } = useLanguage();
  const [crops, setCrops] = useState([]);
  const [pendingCrops, setPendingCrops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCrops();
    loadPending();
  }, []);

  async function loadCrops() {
    try {
      const data = await getFarmerCrops(user._id);
      setCrops(data);
    } catch { /* offline */ }
    setLoading(false);
  }

  async function loadPending() {
    try {
      const data = await getPendingCrops();
      setPendingCrops(data);
    } catch { /* ignore */ }
  }

  return (
    <div className="page-container">
      {/* Welcome header */}
      <div className="flex items-start sm:items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="page-title">{t('welcome')}, {user.name}!</h1>
          <p className="page-subtitle flex items-center gap-1.5 mt-1">
            <MapPin className="w-4 h-4 text-gray-400" />
            {user.location}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <VoiceCropInput user={user} onCropAdded={loadCrops} buttonLabel="Voice Add" />
          <Link to="/farmer/add-crop" className="btn btn-primary text-base">
            <Plus className="w-5 h-5" /> {t('addCrop')}
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: t('totalCrops'), value: crops.length, Icon: Wheat, color: 'text-primary-600' },
          { label: t('available'), value: crops.filter(c => c.status === 'available').length, Icon: CheckCircle2, color: 'text-emerald-600' },
          { label: t('sold'), value: crops.filter(c => c.status === 'sold').length, Icon: IndianRupee, color: 'text-amber-600' },
          { label: t('pendingSync'), value: pendingCrops.length, Icon: Upload, color: 'text-blue-600' }
        ].map((stat, i) => (
          <div key={stat.label} className="stat-card animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
            <stat.Icon className={`w-6 h-6 ${stat.color} mx-auto mb-2`} />
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Demand Heatmap */}
      <div className="card-static mb-6 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title mb-0">
            <BarChart3 className="w-5 h-5 text-primary-600" /> {t('demandHeatmap')}
          </h2>
          <span className="badge badge-gray text-[10px]">{t('demoData')}</span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {HEATMAP_DATA.map((item, i) => (
            <div key={item.crop}
              className={`rounded-xl p-3 text-center ring-1 transition-all duration-300 hover:scale-105 cursor-default
                ${DEMAND_COLORS[item.level]} animate-fade-in`}
              style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="font-bold text-sm">{item.crop}</div>
              <div className="text-[10px] opacity-70 mt-0.5">{item.demand}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Price Predictions */}
      <div className="card-static mb-8 bg-gradient-to-br from-amber-50/50 to-white border-amber-100">
        <h2 className="section-title">
          <TrendingUp className="w-5 h-5 text-amber-600" /> {t('pricePredictions')}
        </h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { name: 'Tomato', price: '₹25-30/kg', TrendIcon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
            { name: 'Onion', price: '₹18-22/kg', TrendIcon: TrendingDown, color: 'text-red-600 bg-red-50' },
            { name: 'Potato', price: '~₹15/kg', TrendIcon: Minus, color: 'text-amber-600 bg-amber-50' }
          ].map(p => (
            <div key={p.name} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <Wheat className="w-5 h-5 text-gray-500" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 text-sm">{p.name}</div>
                <div className="text-xs text-gray-500">{t('nextWeek')} {p.price}</div>
              </div>
              <span className={`px-2 py-1 rounded-lg ${p.color}`}>
                <p.TrendIcon className="w-4 h-4" />
              </span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-3 text-center">* {t('placeholderPredictions')}</p>
      </div>

      {/* Pending offline crops */}
      {pendingCrops.length > 0 && (
        <div className="mb-8">
          <h2 className="section-title text-amber-700">
            <span className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600" />
            </span>
            {t('pendingSync')} ({pendingCrops.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {pendingCrops.map(crop => (
              <div key={crop.localId} className="card-static bg-amber-50/50 border-amber-200/60 animate-fade-in">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-900">{crop.cropName}</p>
                    <p className="text-sm text-gray-600">{crop.quantity} kg — ₹{crop.price}/kg</p>
                  </div>
                  <span className="badge badge-yellow text-[10px]">Offline</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Listed crops */}
      <div>
        <h2 className="section-title">
          <span className="w-7 h-7 rounded-lg bg-primary-100 flex items-center justify-center">
            <Sprout className="w-4 h-4 text-primary-600" />
          </span>
          {t('yourListedCrops')}
        </h2>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="card-static p-5">
                <div className="skeleton h-6 w-32 mb-3" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="skeleton h-10 rounded-lg" />
                  <div className="skeleton h-10 rounded-lg" />
                  <div className="skeleton h-10 rounded-lg" />
                  <div className="skeleton h-10 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : crops.length === 0 ? (
          <div className="card-static text-center py-12">
            <Sprout className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">{t('noCropsListed')}</p>
            <p className="text-gray-400 text-sm mt-1 mb-4">{t('startByAdding')}</p>
            <Link to="/farmer/add-crop" className="btn btn-primary">{t('addYourFirstCrop')}</Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {crops.map(crop => <CropCard key={crop._id} crop={crop} />)}
          </div>
        )}
      </div>

    </div>
  );
}
