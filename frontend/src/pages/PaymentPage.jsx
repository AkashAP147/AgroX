import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { payOrder, getOrderDetails } from '../services/api';
import html2pdf from 'html2pdf.js';
import { CreditCard, Smartphone, Landmark, CheckCircle2, Lock, Loader2, Home, Tractor, Truck, ArrowRight, ExternalLink, Check, Download } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const PLATFORM_UPI_ID = '8497847147@upi';

const UPI_APPS = [
  { id: 'gpay', label: 'Google Pay' },
  { id: 'phonepe', label: 'PhonePe' },
  { id: 'paytm', label: 'Paytm' },
  { id: 'upi', label: 'Any UPI App' }
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
  const [downloading, setDownloading] = useState(false);

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
    // Always use the generic UPI scheme for maximum compatibility
    const params = new URLSearchParams({
      pa: PLATFORM_UPI_ID,
      pn: 'AgroX Platform',
      am: String(total),
      cu: 'INR',
      tn: `Order payment ${orderId}`
    }).toString();
    return `upi://pay?${params}`;
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

  async function handleDownloadPDF() {
    setDownloading(true);
    try {
      const dateStr = new Date().toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
      const receiptNo = result?.transactionId || 'N/A';
      const oId = orderId?.slice(-8) || 'N/A';
      const cropName = orderInfo?.order?.cropName || 'Item';
      const qty = orderInfo?.order?.quantity || 0;
      const totalAmt = result?.amount || 0;
      const rate = qty > 0 ? (totalAmt / qty).toFixed(2) : '0.00';
      const retailerName = orderInfo?.retailerName || orderInfo?.order?.retailerName || 'N/A';
      const farmerName = orderInfo?.farmerName || 'N/A';
      const transporterName = orderInfo?.transporterName || 'Not assigned';

      const html = `
        <div style="width:280px;font-family:'Courier New',monospace;color:#000;padding:12px 8px;font-size:11px;line-height:1.5;">
          <!-- Header -->
          <div style="text-align:center;margin-bottom:6px;">
            <div style="font-size:22px;font-weight:900;letter-spacing:2px;">AGROX</div>
            <div style="font-size:9px;margin:2px 0;">AGRICULTURAL MARKETPLACE</div>
            <div style="font-size:8px;color:#444;">Farm-to-Retailer • No Middlemen</div>
            <div style="font-size:8px;color:#444;">www.agrox.in</div>
          </div>

          <div style="border-top:2px solid #000;margin:6px 0;"></div>

          <!-- Store & Receipt Info -->
          <div style="font-size:10px;">
            <div style="display:flex;justify-content:space-between;"><span>Receipt #</span><span style="font-weight:bold;">${receiptNo}</span></div>
            <div style="display:flex;justify-content:space-between;"><span>Order ID</span><span style="font-weight:bold;">${oId}</span></div>
            <div style="display:flex;justify-content:space-between;"><span>Date</span><span>${dateStr}</span></div>
          </div>

          <div style="border-top:1px dashed #000;margin:6px 0;"></div>

          <!-- Parties -->
          <div style="font-size:10px;margin-bottom:4px;">
            <div style="font-weight:bold;text-align:center;margin-bottom:3px;font-size:10px;text-decoration:underline;">PARTY DETAILS</div>
            <div style="display:flex;justify-content:space-between;"><span>Retailer:</span><span style="font-weight:bold;">${retailerName}</span></div>
            <div style="display:flex;justify-content:space-between;"><span>Farmer:</span><span style="font-weight:bold;">${farmerName}</span></div>
            <div style="display:flex;justify-content:space-between;"><span>Transporter:</span><span style="font-weight:bold;">${transporterName}</span></div>
          </div>

          <div style="border-top:1px dashed #000;margin:6px 0;"></div>

          <!-- Items Table (DMart style) -->
          <table style="width:100%;font-size:10px;border-collapse:collapse;">
            <tr style="font-weight:bold;border-bottom:1px solid #000;">
              <td style="padding:3px 0;text-align:left;">ITEM</td>
              <td style="padding:3px 0;text-align:center;">QTY</td>
              <td style="padding:3px 0;text-align:center;">RATE</td>
              <td style="padding:3px 0;text-align:right;">AMOUNT</td>
            </tr>
            <tr style="border-bottom:1px dashed #ccc;">
              <td style="padding:4px 0;text-align:left;">${cropName}</td>
              <td style="padding:4px 0;text-align:center;">${qty} kg</td>
              <td style="padding:4px 0;text-align:center;">₹${rate}</td>
              <td style="padding:4px 0;text-align:right;font-weight:bold;">₹${totalAmt.toLocaleString('en-IN')}</td>
            </tr>
          </table>

          <div style="border-top:1px dashed #000;margin:6px 0;"></div>

          <!-- Payment Breakdown -->
          <div style="font-size:10px;">
            <div style="font-weight:bold;text-align:center;margin-bottom:3px;text-decoration:underline;">PAYMENT SPLIT</div>
            <div style="display:flex;justify-content:space-between;"><span>Farmer Payout (85%)</span><span>₹${result.farmerPayout?.toLocaleString('en-IN')}</span></div>
            <div style="display:flex;justify-content:space-between;"><span>Transport Fee (10%)</span><span>₹${result.transporterPayout?.toLocaleString('en-IN')}</span></div>
            <div style="display:flex;justify-content:space-between;"><span>Platform Fee (5%)</span><span>₹${result.platformFee?.toLocaleString('en-IN')}</span></div>
          </div>

          <div style="border-top:2px solid #000;margin:8px 0;"></div>

          <!-- Total -->
          <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:900;">
            <span>TOTAL PAID</span>
            <span>₹${totalAmt.toLocaleString('en-IN')}</span>
          </div>

          <div style="border-top:2px solid #000;margin:8px 0;"></div>

          <!-- Payment Info -->
          <div style="font-size:10px;">
            <div style="display:flex;justify-content:space-between;"><span>Payment Mode:</span><span style="font-weight:bold;">${payMethod.toUpperCase()}</span></div>
            <div style="display:flex;justify-content:space-between;"><span>UPI ID:</span><span style="font-weight:bold;">${PLATFORM_UPI_ID}</span></div>
            <div style="display:flex;justify-content:space-between;"><span>Status:</span><span style="font-weight:bold;">✓ PAID</span></div>
          </div>

          <div style="border-top:1px dashed #000;margin:8px 0;"></div>

          <!-- Footer -->
          <div style="text-align:center;font-size:9px;color:#333;">
            <div style="margin-bottom:4px;">Payment collected by AgroX platform</div>
            <div>Settled to farmer & transporter accounts</div>
            <div style="margin-top:6px;font-size:8px;color:#666;">--- Items once sold are non-returnable ---</div>
            <div style="margin-top:8px;font-size:11px;font-weight:bold;">★ THANK YOU FOR USING AGROX ★</div>
            <div style="font-size:8px;color:#888;margin-top:4px;">Save this receipt for your records</div>
          </div>
        </div>
      `;

      const opt = {
        margin: [2, 0, 2, 0],
        filename: `AgroX_Receipt_${receiptNo}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: [80, 220], orientation: 'portrait' }
      };
      await html2pdf().set(opt).from(html).save();
    } catch (err) {
      console.error('PDF generation failed:', err);
    }
    setDownloading(false);
  }

  // Success state
  if (result && !result.error) {
    return (
      <>


        {/* Screen View */}
        <div className="page-container max-w-md">
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
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="btn btn-secondary w-full mb-3 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              {downloading ? 'Generating PDF...' : 'Download Invoice PDF'}
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
