import { Link } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { useShopInfo } from '../../context/AppSettingsContext'

// Written against the Kenya Data Protection Act, 2019. The sections describe
// what this system actually collects and does — keep this page in sync when
// data practices change (new third-party service, new personal-data field).
const LAST_UPDATED = '17 July 2026'

const Section = ({ title, children }) => (
  <section className="mb-8">
    <h2 className="font-display text-lg font-bold text-earth-900 mb-3">{title}</h2>
    <div className="text-sm text-earth-700 font-body leading-relaxed space-y-3">{children}</div>
  </section>
)

export default function PrivacyPolicyPage() {
  const shopInfo = useShopInfo()

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-3xl mx-auto px-4 py-10">

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-brand-50 border border-brand-200 rounded-xl
              flex items-center justify-center">
              <Shield size={18} className="text-brand-600" />
            </div>
            <h1 className="font-display text-2xl font-bold text-earth-900">Privacy Policy</h1>
          </div>
          <p className="text-earth-500 text-xs font-body">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="bg-white rounded-2xl border border-earth-100 shadow-warm p-6 sm:p-8">

          <Section title="Who we are">
            <p>
              {shopInfo.name || 'Vittorios Grains & Cereals'} ("we", "us") operates this
              website and the wholesale ordering service behind it. We are the data
              controller for the personal information described below, and we process it
              in accordance with the Kenya Data Protection Act, 2019.
            </p>
          </Section>

          <Section title="What we collect">
            <p>We only collect what the service needs to work:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Account details</strong> — your name, phone number and, optionally, an email address and KRA PIN (used only on tax invoices you request).</li>
              <li><strong>Order details</strong> — the products you order, delivery addresses you save or enter, and your order history.</li>
              <li><strong>Guest orders</strong> — if you order without an account, we collect only your name, phone number and delivery details for that order.</li>
              <li><strong>Location</strong> — only if you tap "detect my location". We use your coordinates once, to pick your nearest branch and calculate your delivery fee. We do not track your location in the background.</li>
              <li><strong>Payment confirmations</strong> — when you pay via M-Pesa we receive the transaction confirmation from Safaricom (amount, receipt number, phone number). We never see or store your M-Pesa PIN.</li>
            </ul>
          </Section>

          <Section title="How we use it">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>To process, deliver and support your orders — including order-status SMS and email updates, which are part of the service.</li>
              <li>To send promotional SMS <strong>only if you have expressly opted in</strong>, either at registration or in your profile. You can withdraw this consent at any time in your profile, and it never affects order updates.</li>
              <li>To keep the service secure (fraud prevention, account protection, audit logs).</li>
              <li>To issue tax invoices where required by KRA regulations.</li>
            </ul>
            <p>We do not sell your personal information to anyone.</p>
          </Section>

          <Section title="Who we share it with">
            <p>Only service providers needed to run the shop, and only the minimum they need:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Safaricom (M-Pesa)</strong> — to process payments you initiate.</li>
              <li><strong>SMS and email providers</strong> — your phone number or email, to deliver the messages described above.</li>
              <li><strong>Kenya Revenue Authority (eTIMS)</strong> — invoice details where fiscal invoicing applies.</li>
              <li><strong>Our delivery drivers</strong> — your name, phone number and delivery address for orders assigned to them.</li>
              <li><strong>Hosting and error-monitoring providers</strong> — our servers and databases are hosted with reputable cloud providers; error reports are scrubbed of personal details before being stored.</li>
            </ul>
          </Section>

          <Section title="How long we keep it">
            <p>
              We keep account and order records while your account is active and as long
              as tax and accounting law requires us to retain transaction records. Guest
              order details are kept for the same statutory record-keeping periods.
            </p>
          </Section>

          <Section title="Your rights">
            <p>Under the Data Protection Act, 2019 you have the right to:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Be told how your data is used (this page);</li>
              <li>Access the personal data we hold about you;</li>
              <li>Have inaccurate data corrected;</li>
              <li>Object to processing, including withdrawing marketing consent at any time;</li>
              <li>Request deletion of your data, subject to records we must keep by law.</li>
            </ul>
            <p>
              To exercise any of these rights, contact us using the details below. You may
              also lodge a complaint with the Office of the Data Protection Commissioner
              (www.odpc.go.ke).
            </p>
          </Section>

          <Section title="Cookies and local storage">
            <p>
              We use your browser's local storage to keep you signed in, remember your
              cart and remember your chosen branch. These are essential to the service
              and are not used to track you across other websites.
            </p>
          </Section>

          <Section title="Contact us">
            <p>
              {shopInfo.name || 'Vittorios Grains & Cereals'}
              {shopInfo.location ? ` — ${shopInfo.location}` : ''}
              <br />
              {shopInfo.phone && <>Phone: {shopInfo.phone}<br /></>}
              {shopInfo.email && <>Email: {shopInfo.email}</>}
            </p>
          </Section>

          <p className="text-xs text-earth-400 font-body pt-2 border-t border-earth-100">
            See also our <Link to="/terms" className="text-brand-600 hover:text-brand-700 font-semibold">Terms of Service</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}
