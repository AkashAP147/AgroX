import { Link } from 'react-router-dom';
import { Wheat, Tractor, Store, Truck, WifiOff, IndianRupee, Smartphone, BarChart3, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Landing() {
  const { t } = useLanguage();
  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-earth-50">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-200/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-earth-200/30 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-100/80 text-primary-700 text-sm font-semibold mb-6 animate-fade-in-d1">
            <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse-soft" />
            {t('heroTagline')}
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 mb-4 tracking-tight leading-tight animate-fade-in-d2">
            {t('heroTitle1')}
            <br />
            <span className="text-gradient">{t('heroTitle2')}</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-d3">
            {t('heroDesc')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-d4">
            <Link to="/login" className="btn btn-primary text-lg py-4 px-10 shadow-lg shadow-primary-200">
              {t('getStarted')} <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/register" className="btn btn-outline text-lg py-4 px-10">
              {t('createAccount')}
            </Link>
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center mb-3">
          {t('builtForEveryone')}
        </h2>
        <p className="text-gray-500 text-center mb-10 max-w-xl mx-auto">
          {t('builtForEveryoneDesc')}
        </p>

        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              Icon: Tractor, title: t('farmer'),
              desc: t('farmerRoleDesc'),
              color: 'from-emerald-50 to-emerald-100/50',
              border: 'border-emerald-200/60',
              iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600'
            },
            {
              Icon: Store, title: t('retailer'),
              desc: t('retailerRoleDesc'),
              color: 'from-blue-50 to-blue-100/50',
              border: 'border-blue-200/60',
              iconBg: 'bg-blue-100', iconColor: 'text-blue-600'
            },
            {
              Icon: Truck, title: t('transporter'),
              desc: t('transporterRoleDesc'),
              color: 'from-amber-50 to-amber-100/50',
              border: 'border-amber-200/60',
              iconBg: 'bg-amber-100', iconColor: 'text-amber-600'
            }
          ].map((role, i) => (
            <div key={role.title}
              className={`card text-center bg-gradient-to-br ${role.color} border ${role.border} hover:-translate-y-2 
                animate-fade-in`}
              style={{ animationDelay: `${0.2 + i * 0.15}s` }}>
              <div className={`w-16 h-16 rounded-2xl ${role.iconBg} flex items-center justify-center mx-auto mb-4`}>
                <role.Icon className={`w-8 h-8 ${role.iconColor}`} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{role.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{role.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center mb-10 flex items-center justify-center gap-2">
            <Sparkles className="w-7 h-7 text-primary-500" /> {t('whyMandiConnect')}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { Icon: WifiOff, title: t('offlineFirst'), desc: t('offlineFirstDesc') },
              { Icon: IndianRupee, title: t('fairPricing'), desc: t('fairPricingDesc') },
              { Icon: Truck, title: t('smartLogistics'), desc: t('smartLogisticsDesc') },
              { Icon: Smartphone, title: t('mobileReady'), desc: t('mobileReadyDesc') },
              { Icon: ShieldCheck, title: t('upiPayments'), desc: t('upiPaymentsDesc') },
              { Icon: BarChart3, title: t('marketInsights'), desc: t('marketInsightsDesc') }
            ].map((f, i) => (
              <div key={f.title}
                className="flex items-start gap-4 p-4 rounded-2xl hover:bg-white hover:shadow-card transition-all duration-300 group">
                <div className="w-11 h-11 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0
                  group-hover:bg-primary-200 group-hover:scale-110 transition-all duration-300">
                  <f.Icon className="w-5 h-5 text-primary-700" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-0.5">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="card-static bg-gradient-to-r from-primary-600 to-primary-500 text-white p-10 sm:p-14 rounded-3xl shadow-glow-lg">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">{t('readyToStart')}</h2>
          <p className="text-primary-100 mb-8 max-w-md mx-auto">
            {t('readyToStartDesc')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="btn bg-white text-primary-700 hover:bg-gray-50 text-lg py-4 px-10 shadow-lg font-bold">
              {t('createFreeAccount')}
            </Link>
            <Link to="/login" className="btn border-2 border-white/30 text-white hover:bg-white/10 text-lg py-4 px-10">
              {t('login')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
