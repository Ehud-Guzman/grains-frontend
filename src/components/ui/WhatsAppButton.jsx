import { MessageCircle } from 'lucide-react'
import { waLink } from '../../utils/whatsapp'

// Opens WhatsApp with a prefilled message. Renders nothing when the number is unusable, so callers
// never show a dead button.
export default function WhatsAppButton({ phone, message, label = 'WhatsApp', className = '', size = 14 }) {
  const href = waLink(phone, message)
  if (!href) return null
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-1.5 font-semibold transition-colors ${className}`}>
      <MessageCircle size={size} aria-hidden="true" /> {label}
    </a>
  )
}
