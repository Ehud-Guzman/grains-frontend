import { Check } from 'lucide-react'

const STEPS = ['Contact', 'Delivery', 'Payment', 'Review', 'Confirm']

export default function CheckoutStepper({ currentStep }) {
  return (
    <div className="flex items-center justify-between mb-8">
      {STEPS.map((step, i) => {
        const num = i + 1
        const done = num < currentStep
        const active = num === currentStep
        return (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                ${done ? 'bg-brand-500 text-white' : active ? 'bg-brand-500 text-white ring-4 ring-brand-100' : 'bg-earth-100 text-earth-400'}`}>
                {done ? <Check size={14} /> : num}
              </div>
              <span className={`text-xs mt-1 hidden sm:block font-body
                ${active ? 'text-brand-600 font-medium' : done ? 'text-earth-600' : 'text-earth-400'}`}>
                {step}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${done ? 'bg-brand-400' : 'bg-earth-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
