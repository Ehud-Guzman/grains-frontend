import { Link } from 'react-router-dom'
import { ScrollText } from 'lucide-react'
import { useShopInfo } from '../../context/AppSettingsContext'

// Plain-language terms matching how the system actually works (order approval
// flow, stock reservation, delivery zones, M-Pesa). Update alongside any
// change to those flows.
const LAST_UPDATED = '17 July 2026'

const Section = ({ title, children }) => (
  <section className="mb-8">
    <h2 className="font-display text-lg font-bold text-earth-900 mb-3">{title}</h2>
    <div className="text-sm text-earth-700 font-body leading-relaxed space-y-3">{children}</div>
  </section>
)

export default function TermsPage() {
  const shopInfo = useShopInfo()

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-3xl mx-auto px-4 py-10">

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-brand-50 border border-brand-200 rounded-xl
              flex items-center justify-center">
              <ScrollText size={18} className="text-brand-600" />
            </div>
            <h1 className="font-display text-2xl font-bold text-earth-900">Terms of Service</h1>
          </div>
          <p className="text-earth-500 text-xs font-body">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="bg-white rounded-2xl border border-earth-100 shadow-warm p-6 sm:p-8">

          <Section title="1. About these terms">
            <p>
              These terms govern your use of the {shopInfo.name || 'Vittorios Grains & Cereals'}{' '}
              website and ordering service. By placing an order you agree to them. We may
              update them from time to time; the date above shows the current version.
            </p>
          </Section>

          <Section title="2. Orders and approval">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Placing an order is an offer to buy. Every order is <strong>reviewed by our team before it is confirmed</strong> — you will receive a confirmation once it is approved, or a notification if we cannot fulfil it.</li>
              <li>Stock is reserved for you the moment you place the order. If an order is rejected or cancelled, the reservation is released.</li>
              <li>Some branches have a minimum order value or quantity, shown before checkout.</li>
              <li>Prices are shown in Kenya Shillings and may change without notice; the price at the time you place your order applies. Items marked "quote only" are priced on request.</li>
            </ul>
          </Section>

          <Section title="3. Payment">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>We accept M-Pesa and, where agreed, other payment methods confirmed by our staff.</li>
              <li>M-Pesa payments are processed by Safaricom; we receive only the transaction confirmation.</li>
              <li>Where applicable, VAT is included and a fiscal (eTIMS) invoice is issued as required by KRA.</li>
            </ul>
          </Section>

          <Section title="4. Delivery and pickup">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Delivery fees depend on your branch and, where distance-based pricing applies, on how far you are from the branch. The fee is shown at checkout before you place the order.</li>
              <li>Areas beyond a branch's delivery radius are pickup-only.</li>
              <li>Delivery estimates are made in good faith but are not guaranteed times. A preferred delivery date you select is a request, not a guarantee.</li>
              <li>Please check your goods on delivery and report any issue to us immediately using the contact details below.</li>
            </ul>
          </Section>

          <Section title="5. Cancellations, rejections and refunds">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>You may cancel an order while it is still pending review — from your dashboard if you have an account, or by contacting us.</li>
              <li>Once an order is being prepared or is out for delivery, contact us to discuss cancellation; we will do our best to help.</li>
              <li>If we reject or cancel an order you have already paid for, or you cancel in line with these terms, we will refund the amount paid via M-Pesa to the paying number.</li>
              <li>Nothing in these terms limits your rights under the Consumer Protection Act, 2012.</li>
            </ul>
          </Section>

          <Section title="6. Your account">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Keep your password confidential — you are responsible for activity on your account.</li>
              <li>We may suspend accounts used fraudulently or abusively.</li>
              <li>How we handle your personal information is described in our <Link to="/privacy" className="text-brand-600 hover:text-brand-700 font-semibold">Privacy Policy</Link>.</li>
            </ul>
          </Section>

          <Section title="7. Liability">
            <p>
              We supply goods with reasonable care and skill. We are not liable for losses
              caused by events outside our reasonable control. Nothing in these terms
              excludes liability that cannot be excluded under Kenyan law.
            </p>
          </Section>

          <Section title="8. Governing law">
            <p>
              These terms are governed by the laws of Kenya, and disputes are subject to
              the jurisdiction of the Kenyan courts.
            </p>
          </Section>

          <Section title="9. Contact">
            <p>
              {shopInfo.name || 'Vittorios Grains & Cereals'}
              {shopInfo.location ? ` — ${shopInfo.location}` : ''}
              <br />
              {shopInfo.phone && <>Phone: {shopInfo.phone}<br /></>}
              {shopInfo.email && <>Email: {shopInfo.email}</>}
            </p>
          </Section>

        </div>
      </div>
    </div>
  )
}
