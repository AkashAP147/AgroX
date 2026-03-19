import { CheckCircle2, Clock, CreditCard, Truck, Package } from 'lucide-react';

const STATUS_STEPS = [
  { key: 'accepted', label: 'Order Placed', icon: Clock },
  { key: 'paid', label: 'Payment Done', icon: CreditCard },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Package }
];

export default function OrderStatusTracker({ status }) {
  // Find the current step index
  const currentStep = STATUS_STEPS.findIndex(s => s.key === status);

  return (
    <div className="flex flex-col gap-4 my-4">
      <div className="flex items-center justify-between">
        {STATUS_STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i <= currentStep;
          return (
            <div key={step.key} className="flex-1 flex flex-col items-center">
              <div className={`rounded-full w-10 h-10 flex items-center justify-center mb-1 border-2 ${isActive ? 'bg-emerald-100 border-emerald-400' : 'bg-gray-100 border-gray-300'}`}>
                <Icon className={`w-6 h-6 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
              </div>
              <span className={`text-xs font-medium ${isActive ? 'text-emerald-700' : 'text-gray-400'}`}>{step.label}</span>
            </div>
          );
        })}
      </div>
      {/* Progress bar */}
      <div className="flex items-center w-full px-2">
        {STATUS_STEPS.map((step, i) => (
          i < STATUS_STEPS.length - 1 && (
            <div key={step.key} className="flex-1 h-1 mx-1 rounded-full" style={{ background: i < currentStep ? '#34d399' : '#e5e7eb' }} />
          )
        ))}
      </div>
    </div>
  );
}
