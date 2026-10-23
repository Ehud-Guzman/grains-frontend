import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import Modal from '../ui/Modal'
import AssistantChat from '../assistant/AssistantChat'
import { adminAssistantService } from '../../services/admin/assistant.service'

// The admin help assistant: a slide-over opened from the top bar. The conversation itself
// lives in AssistantChat (shared with the storefront and driver Help Center); this is only
// the frame around it. The server answers for the signed-in role.

const TITLE_ID = 'assistant-title'

export default function AssistantPanel({ userRole, onClose }) {
  const navigate = useNavigate()
  const inputRef = useRef(null)

  const go = (path) => { onClose(); navigate(path) }

  return (
    <Modal onClose={onClose} labelledBy={TITLE_ID} placement="right" initialFocusRef={inputRef}
      backdropClassName="bg-black/40"
      panelClassName="bg-white w-full sm:w-[26rem] shadow-2xl border-l border-admin-100 pt-safe pb-safe">
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-admin-100 flex-shrink-0">
        <div className="min-w-0">
          <h2 id={TITLE_ID} className="text-base font-admin font-bold text-admin-900">Help assistant</h2>
          <p className="text-xs font-admin text-admin-500">Ask what the system can do. Answers match your role.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close help assistant"
          className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-admin-500
            hover:bg-admin-100 hover:text-admin-800 transition-colors">
          <X size={18} />
        </button>
      </div>

      <AssistantChat
        service={adminAssistantService}
        theme="admin"
        layout="panel"
        onNavigate={go}
        showUnanswered={userRole === 'superadmin'}
        inputRef={inputRef}
        placeholder="Can the system…?"
      />
    </Modal>
  )
}
