import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { payOrder, getOrderDetails } from '../services/api';
import { CreditCard, Smartphone, Landmark, CheckCircle2, Lock, Loader2, Home, Tractor, Truck, ArrowRight, ExternalLink, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const PLATFORM_UPI_ID = '8497847147@upi';

const UPI_APPS = [
  { id: 'gpay', label: 'Google Pay', scheme: 'tez://upi/pay' },
  { id: 'phonepe', label: 'PhonePe', scheme: 'phonepe://pay' },
  { id: 'paytm', label: 'Paytm', scheme: 'paytmmp://pay' },
  { id: 'upi', label: 'Any UPI App', scheme: 'upi://pay' }
];

export default function PaymentPage() {
  const { t } = useLanguage();
  const { orderId } = useParams();
  const { state } = useLocation();
  const total = state?.total || 0;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [orderInfo, setOrderInfo] = useState(null);
  const [payMethod, setPayMethod] = useState('gpay');
  const [appPickerOpen, setAppPickerOpen] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);

  useEffect(() => {
    if (orderId) {
      getOrderDetails(orderId).then(setOrderInfo).catch(() => {});
    }
  }, [orderId]);

  // Platform split model: one payment from retailer, then internal settlement.
  const farmerAmount = Math.round(total * 0.85);
  const transporterAmount = Math.round(total * 0.10);
  const platformAmount = total - farmerAmount - transporterAmount;

  function buildUpiLink(appId) {
    const app = UPI_APPS.find(item => item.id === appId) || UPI_APPS[0];
    const params = new URLSearchParams({
      pa: PLATFORM_UPI_ID,
      pn: 'AgroX Platform',
      am: String(total),
      cu: 'INR',
      tn: `Order payment ${orderId}`
    }).toString();
    return `${app.scheme}?${params}`;
  }

  function launchUpiApp(appId) {
    setPayMethod(appId);
    setPaymentInitiated(true);
    setAppPickerOpen(false);
    window.location.href = buildUpiLink(appId);
  }

  async function handlePay(e) {
    e?.preventDefault();
    setLoading(true);
    try {
      const paidVia = `${payMethod}:${PLATFORM_UPI_ID}`;
      const data = await payOrder(orderId, paidVia);
      setResult(data);
    } catch (err) {
      setResult({ error: err.message });
    }
    setLoading(false);
  }

  // Success state
  if (result && !result.error) {
    return (
      <>
        {/* Print-only bill */}
        <style>{`
          @media print {
            body { margin: 0; padding: 0; background: white; }
            
            /* Hide all web UI elements */
            .print-hidden { display: none !important; }
            .page-container { display: none !important; }
            .card-static { display: none !important; }
            .btn { display: none !important; }
            .navbar { display: none !important; }
            nav { display: none !important; }
            header { display: none !important; }
            
            /* Show bill */
            .print-only { 
              display: block !important;
              margin: 0;
              padding: 0;
            }
            
            .bill-container {
              width: 80mm;
              padding: 0;
              margin: 0 auto;
              font-family: 'Courier New', monospace;
              background: white;
              color: black;
              page-break-after: avoid;
            }
            .bill-header { text-align: center; margin-bottom: 10px; }
            .bill-title { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
            .bill-subtitle { font-size: 11px; color: #000; margin-bottom: 10px; }
            .bill-divider { border-top: 1px dashed #000; margin: 8px 0; }
            .bill-item { display: flex; justify-content: space-between; font-size: 11px; margin: 4px 0; }
            .bill-label { flex: 1; }
            .bill-value { text-align: right; font-weight: bold; margin-left: 10px; }
            .bill-total { font-size: 14px; font-weight: bold; margin: 10px 0; display: flex; justify-content: space-between; }
            .bill-breakdown { font-size: 10px; margin: 8px 0; }
            .bill-footer { text-align: center; font-size: 10px; margin-top: 15px; color: #000; }
          }
          @media screen {
            .print-only { display: none !important; }
          }
        `}</style>

        {/* Print Bill Layout */}
        <div className="print-only bill-container">
          <div className="bill-header">
            <div className="bill-title">AGROX</div>
            <div className="bill-subtitle">Agricultural Payment Receipt</div>
            <div className="bill-subtitle">www.agrox.in</div>
          </div>

          <div className="bill-divider"></div>

          <div className="bill-item">
            <span className="bill-label">Receipt No:</span>
            <span className="bill-value">{result.transactionId}</span>
          </div>
          <div className="bill-item">
            <span className="bill-label">Order ID:</span>
            <span className="bill-value">{orderId?.slice(-8)}</span>
          </div>
          <div className="bill-item">
            <span className="bill-label">Date & Time:</span>
            <span className="bill-value">{new Date().toLocaleString('en-IN')}</span>
          </div>

          <div className="bill-divider"></div>

          {orderInfo && (
            <>
              <div className="bill-item">
                <span className="bill-label">Retailer:</span>
                <span className="bill-value">{orderInfo.retailerName || 'N/A'}</span>
              </div>
              <div className="bill-item">
                <span className="bill-label">Farmer:</span>
                <span className="bill-value">{orderInfo.farmerName || 'N/A'}</span>
              </div>
              <div className="bill-item">
                <span className="bill-label">Transporter:</span>
                <span className="bill-value">{orderInfo.transporterName || 'N/A'}</span>
              </div>
              <div className="bill-item">
                <span className="bill-label">Crop:</span>
                <span className="bill-value">{orderInfo.cropName || 'N/A'}</span>
              </div>
              <div className="bill-item">
                <span className="bill-label">Quantity:</span>
                <span className="bill-value">{orderInfo.quantity} kg</span>
              </div>
            </>
          )}

          <div className="bill-divider"></div>

          <div className="bill-breakdown">
            <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '5px' }}>PAYMENT BREAKDOWN</div>
            <div className="bill-item">
              <span className="bill-label">Farmer (85%):</span>
              <span className="bill-value">₹{result.farmerPayout?.toLocaleString('en-IN')}</span>
            </div>
            <div className="bill-item">
              <span className="bill-label">Transporter (10%):</span>
              <span className="bill-value">₹{result.transporterPayout?.toLocaleString('en-IN')}</span>
            </div>
            <div className="bill-item">
              <span className="bill-label">Platform Fee (5%):</span>
              <span className="bill-value">₹{result.platformFee?.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="bill-divider"></div>

          <div className="bill-total">
            <span>TOTAL PAID:</span>
            <span>₹{result.amount?.toLocaleString('en-IN')}</span>
          </div>

          <div className="bill-item">
            <span className="bill-label">Payment Mode:</span>
            <span className="bill-value">{payMethod.toUpperCase()}</span>
          </div>
          <div className="bill-item">
            <span className="bill-label">UPI ID:</span>
            <span className="bill-value">{PLATFORM_UPI_ID}</span>
          </div>

          <div className="bill-divider"></div>

          <div className="bill-footer">
            <div>Thank you for using AgroX</div>
            <div style={{ marginTop: '8px', fontSize: '9px' }}>Payment collected by platform and</div>
            <div style={{ fontSize: '9px' }}>settled to farmer and transporter</div>
            <div style={{ marginTop: '10px' }}>**** THANK YOU ****</div>
          </div>
        </div>

        {/* Screen View */}
        <div className="page-container max-w-md print-hidden">
          <div className="card-static text-center py-10 animate-scale-in">
            {/* Success icon */}
            <div className="relative mx-auto w-20 h-20 mb-6">
              <div className="absolute inset-0 bg-emerald-200 rounded-full animate-ping opacity-30" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
            </div>

            <h2 className="text-2xl font-extrabold text-gray-900 mb-1">{t('paymentSuccess')}</h2>
            <p className="text-gray-500 text-sm mb-6">Payment received by platform and settled to farmer/transporter</p>

            {/* Receipt */}
            <div className="bg-gray-50 rounded-2xl p-5 mb-6 text-left space-y-3 border border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">{t('transactionId')}</span>
                <span className="font-mono text-sm font-bold text-gray-900">{result.transactionId}</span>
              </div>
              <div className="border-t border-gray-200" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">{t('total')} {t('paid')}</span>
                <span className="text-xl font-extrabold text-emerald-600">₹{result.amount?.toLocaleString('en-IN')}</span>
              </div>
              <div className="border-t border-gray-200" />

              {/* Payment breakdown */}
              <div className="space-y-2.5 pt-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Payment Breakdown</p>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    <Tractor className="w-4 h-4 text-primary-500" /> {t('farmer')}
                    {orderInfo?.farmerName && <span className="text-gray-400">({orderInfo.farmerName})</span>}
                  </span>
                  <span className="text-sm font-bold text-primary-700">₹{result.farmerPayout?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    <Truck className="w-4 h-4 text-blue-500" /> {t('transporter')} fee
                  </span>
                  <span className="text-sm font-bold text-blue-600">₹{result.transporterPayout?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    Platform fee
                  </span>
                  <span className="text-sm font-bold text-gray-600">₹{result.platformFee?.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="border-t border-gray-200" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Paid via</span>
                <span className="text-sm font-medium text-gray-700">{payMethod.toUpperCase()} • {PLATFORM_UPI_ID}</span>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="btn btn-secondary w-full mb-3"
            >
              Print & Download Invoice
            </button>

            <button onClick={() => navigate('/')} className="btn btn-primary w-full text-lg py-4">
              <Home className="w-5 h-5" /> {t('back')}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="page-container max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 mb-4">
          <CreditCard className="w-8 h-8 text-primary-700" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{t('payment')}</h1>
        <p className="text-gray-500 mt-2">{t('completePayment')}</p>
      </div>

      {/* Amount */}
      <div className="card-static mb-6 text-center bg-gradient-to-br from-primary-50 to-white border-primary-100 p-6">
        <p className="text-sm text-gray-500 mb-1">{t('amountToPay')}</p>
        <p className="text-4xl font-extrabold text-gray-900">₹{total.toLocaleString('en-IN')}</p>
        <p className="text-xs text-primary-700 mt-2 font-semibold">Platform UPI: {PLATFORM_UPI_ID}</p>
      </div>

      {/* Connected parties info */}
      {orderInfo && (
        <div className="card-static mb-6 p-4 animate-fade-in">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('connectedParties')}</p>
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                <Tractor className="w-5 h-5 text-primary-600" />
              </div>
              <span className="text-xs font-medium text-gray-700 text-center truncate w-full">{orderInfo.farmerName}</span>
              <span className="text-[10px] text-gray-400">{t('farmer')}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Truck className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-gray-700 text-center truncate w-full">{orderInfo.transporterName}</span>
              <span className="text-[10px] text-gray-400">{t('transporter')}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Home className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-xs font-medium text-gray-700 text-center truncate w-full">{orderInfo.retailerName}</span>
              <span className="text-[10px] text-gray-400">{t('retailer')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Payment breakdown info */}
      {total > 0 && (
        <div className="card-static mb-6 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('paymentSplitPreview')}</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <Tractor className="w-3.5 h-3.5 text-primary-500" /> {t('farmer')} (85%)
              </span>
              <span className="text-sm font-bold text-gray-800">₹{farmerAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <Truck className="w-3.5 h-3.5 text-blue-500" /> {t('transporter')} (10%)
              </span>
              <span className="text-sm font-bold text-gray-800">₹{transporterAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Platform (5%)</span>
              <span className="text-sm font-bold text-gray-800">₹{platformAmount.toLocaleString('en-IN')}</span>
            </div>
            {/* Visual bar */}
            <div className="flex h-2 rounded-full overflow-hidden mt-2">
              <div className="bg-primary-500" style={{ width: '85%' }} />
              <div className="bg-blue-500" style={{ width: '10%' }} />
              <div className="bg-gray-300" style={{ width: '5%' }} />
            </div>
          </div>
        </div>
      )}

      {appPickerOpen && (
        <div className="card-static mb-6 p-5 animate-scale-in border-2 border-primary-100">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Choose UPI App</h2>
              <p className="text-sm text-gray-500">Amount ₹{total.toLocaleString('en-IN')} will be opened in your selected app.</p>
            </div>
            <button type="button" onClick={() => setAppPickerOpen(false)} className="text-sm text-gray-500 hover:text-gray-700">Close</button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {UPI_APPS.map(app => (
              <button
                key={app.id}
                type="button"
                onClick={() => launchUpiApp(app.id)}
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 px-4 py-4 text-sm font-semibold text-gray-700 hover:border-primary-400 hover:bg-primary-50 transition-colors"
              >
                <Smartphone className="w-4 h-4" /> {app.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {paymentInitiated && !result && (
        <div className="card-static mb-6 p-4 border border-emerald-100 bg-emerald-50/60 animate-fade-in">
          <p className="text-sm font-semibold text-emerald-800">UPI app opened for demo payment.</p>
          <p className="text-xs text-emerald-700 mt-1">After completing the payment in your mobile UPI app, come back and confirm it here.</p>
        </div>
      )}

      {/* Payment form */}
      <form onSubmit={handlePay} className="card-static p-6 sm:p-8 space-y-5">
        {/* Payment methods */}
        <div>
          <label className="label">{t('paymentMethod')}</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'gpay', Icon: Smartphone, label: 'Google Pay' },
              { id: 'phonepe', Icon: Smartphone, label: 'PhonePe' },
              { id: 'upi', Icon: Landmark, label: 'Any UPI' }
            ].map(m => (
              <div key={m.id}
                onClick={() => setPayMethod(m.id)}
                className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                  ${payMethod === m.id
                    ? 'border-primary-500 bg-primary-50 shadow-sm shadow-primary-100'
                    : 'border-gray-200 hover:border-gray-300'
                  }`}>
                <m.Icon className={`w-6 h-6 ${payMethod === m.id ? 'text-primary-600' : 'text-gray-400'}`} />
                <span className={`text-xs font-semibold ${payMethod === m.id ? 'text-primary-700' : 'text-gray-500'}`}>{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Payment Destination</label>
          <div className="input flex items-center justify-between bg-gray-50">
            <span className="font-semibold text-gray-800">{PLATFORM_UPI_ID}</span>
            <span className="text-xs text-gray-500">Fixed platform UPI</span>
          </div>
        </div>

        {/* Error */}
        {result?.error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-scale-in">
            {result.error}
          </div>
        )}

        {/* Submit */}
        {!paymentInitiated ? (
          <button
            type="button"
            onClick={() => setAppPickerOpen(true)}
            className="btn btn-primary w-full text-lg py-4 shadow-lg shadow-primary-200"
          >
            <ExternalLink className="w-5 h-5" /> Open UPI App & Pay ₹{total.toLocaleString('en-IN')}
          </button>
        ) : (
          <button type="submit" className="btn btn-primary w-full text-lg py-4 shadow-lg shadow-primary-200" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Confirming payment...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Check className="w-5 h-5" /> I Completed Payment in UPI App
              </span>
            )}
          </button>
        )}

        <p className="text-xs text-center text-gray-400 flex items-center justify-center gap-1">
          <Lock className="w-3 h-3" /> Demo flow: mobile UPI app opens with amount and platform UPI prefilled.
        </p>
      </form>
    </div>
  );
}
