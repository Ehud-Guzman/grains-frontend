import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, Ban, BookOpen, Lock, MessageCircle, Send, Sparkles } from 'lucide-react'
import { ASSISTANT_THEMES } from './assistantThemes'

// The help assistant's conversation: ask a question, browse everything, and (for the
// superadmin) see what people asked that had no answer. The server does all the thinking —
// this only shows what it returns, so what someone is told they can do always matches what
// the API will let them do.
//
//   service       { ask(q), openTopic(id), topics(), unanswered?() } — one per audience
//   theme         'admin' | 'storefront'
//   layout        'panel'  fills its parent and scrolls the messages (admin slide-over)
//                 'flow'   grows with its content and lets the page scroll (Help Center tab)
//   onNavigate    called with a page path when "Take me there" is tapped
//   showUnanswered  adds the superadmin-only tab

const ERROR_ANSWER = {
  outcome: 'error',
  message: 'I could not reach the server just now. Check your connection and try again.',
  results: [],
  suggestions: [],
}

function Steps({ steps, t }) {
  return (
    <ol className="mt-3 space-y-2">
      {steps.map((step, i) => (
        <li key={i} className={`flex gap-2.5 text-sm ${t.font} ${t.body}`}>
          <span aria-hidden="true"
            className="mt-0.5 w-5 h-5 rounded-full bg-brand-50 text-brand-700 text-[11px] font-bold flex items-center justify-center flex-shrink-0">
            {i + 1}
          </span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  )
}

function ResultCard({ result, onGo, t }) {
  if (result.kind === 'not_supported') {
    return (
      <div className={`rounded-xl border ${t.lineStrong} ${t.surface} p-3.5`}>
        <p className={`flex items-center gap-2 text-sm ${t.font} font-semibold ${t.ink}`}>
          <Ban size={14} className={`${t.muted} flex-shrink-0`} aria-hidden="true" /> {result.title}
        </p>
        <p className={`mt-1.5 text-sm ${t.font} ${t.body}`}>{result.summary}</p>
        {result.workaround && (
          <p className={`mt-2 text-sm ${t.font} ${t.soft}`}>
            <span className="font-semibold">Instead: </span>{result.workaround}
          </p>
        )}
      </div>
    )
  }

  if (!result.allowed) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5">
        <p className={`flex items-center gap-2 text-sm ${t.font} font-semibold ${t.ink}`}>
          <Lock size={14} className="text-amber-600 flex-shrink-0" aria-hidden="true" /> {result.title}
        </p>
        <p className={`mt-1.5 text-sm ${t.font} ${t.body}`}>{result.summary}</p>
        <p className={`mt-2 text-sm ${t.font} text-amber-800`}>{result.blockedReason}</p>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border ${t.line} bg-white p-3.5 shadow-sm`}>
      <p className={`text-sm ${t.font} font-semibold ${t.ink}`}>{result.title}</p>
      <p className={`mt-1 text-sm ${t.font} ${t.soft}`}>{result.summary}</p>
      <Steps steps={result.steps} t={t} />
      {result.notes.length > 0 && (
        <ul className={`mt-3 space-y-1 border-t ${t.line} pt-3`}>
          {result.notes.map((note, i) => (
            <li key={i} className={`text-xs ${t.font} ${t.muted}`}>{note}</li>
          ))}
        </ul>
      )}
      {result.page && (
        <button type="button" onClick={() => onGo(result.page)}
          className={`mt-3 inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-xl bg-brand-600 hover:bg-brand-700
            text-white text-sm ${t.font} font-semibold transition-colors`}>
          Take me there <ArrowRight size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

function Chips({ items, onPick, t }) {
  if (!items?.length) return null
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map(item => (
        <button key={item.id} type="button" onClick={() => onPick(item)}
          className={`min-h-[36px] px-3 rounded-full border ${t.lineStrong} bg-white ${t.surfaceHover} text-xs ${t.font}
            font-medium ${t.body} text-left transition-colors`}>
          {item.title}
        </button>
      ))}
    </div>
  )
}

function BotMessage({ answer, onGo, onPick, t }) {
  return (
    <div className="max-w-[94%] space-y-2.5">
      <p className={`text-sm ${t.font} ${t.strong}`}>{answer.message}</p>
      {answer.results.map(result => <ResultCard key={result.id} result={result} onGo={onGo} t={t} />)}
      {answer.suggestions?.length > 0 && <Chips items={answer.suggestions} onPick={onPick} t={t} />}
    </div>
  )
}

function Browse({ topics, onPick, t }) {
  if (!topics) return <p className={`text-sm ${t.font} ${t.faint} px-1`}>Loading…</p>
  return (
    <div className="space-y-5">
      {topics.areas.map(area => (
        <section key={area.key} aria-label={area.label}>
          <h3 className={`text-[11px] ${t.font} font-semibold uppercase tracking-widest ${t.faint} mb-1.5`}>{area.label}</h3>
          <ul className="space-y-0.5">
            {area.items.map(item => (
              <li key={item.id}>
                <button type="button" onClick={() => onPick(item)}
                  className={`w-full min-h-[40px] px-3 py-2 rounded-lg text-left text-sm ${t.font} flex items-center gap-2
                    ${t.surfaceHover} transition-colors ${item.allowed ? t.strong : t.faint}`}>
                  <span className="flex-1">{item.title}</span>
                  {!item.allowed && <Lock size={12} aria-label="Needs a higher role" className="flex-shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {topics.notSupported.length > 0 && (
        <section aria-label="Not supported">
          <h3 className={`text-[11px] ${t.font} font-semibold uppercase tracking-widest ${t.faint} mb-1.5`}>
            Things we do not do
          </h3>
          <ul className="space-y-0.5">
            {topics.notSupported.map(item => (
              <li key={item.id}>
                <button type="button" onClick={() => onPick(item)}
                  className={`w-full min-h-[40px] px-3 py-2 rounded-lg text-left text-sm ${t.font} ${t.soft} ${t.surfaceHover}`}>
                  {item.title}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

const AUDIENCE_LABEL = { admin: 'admin panel', customer: 'shop', driver: 'driver portal' }

function Unanswered({ rows, t }) {
  if (!rows) return <p className={`text-sm ${t.font} ${t.faint} px-1`}>Loading…</p>
  if (rows.length === 0) {
    return <p className={`text-sm ${t.font} ${t.muted} px-1`}>Nothing yet — every question so far had an answer.</p>
  }
  return (
    <ul className="space-y-2">
      {rows.map((row, i) => (
        <li key={i} className={`rounded-xl border ${t.line} p-3`}>
          <p className={`text-sm ${t.font} font-medium ${t.strong}`}>“{row.example}”</p>
          <p className={`mt-1 text-xs ${t.font} ${t.muted}`}>
            Asked {row.count}×
            {' · '}{row.outcome === 'not_supported' ? 'system cannot do this' : 'no match'}
            {' · '}{AUDIENCE_LABEL[row.audience] || row.audience}: {row.roles.join(', ')}
          </p>
        </li>
      ))}
    </ul>
  )
}

export default function AssistantChat({
  service,
  theme = 'admin',
  layout = 'panel',
  onNavigate,
  showUnanswered = false,
  inputRef: externalInputRef,
  intro = 'Ask me whether the system can do something — for example “can I change a product price?” or “how do I cancel an order?”. I will say how, or tell you plainly if it cannot be done.',
  placeholder = 'Ask a question…',
}) {
  const t = ASSISTANT_THEMES[theme]
  const ownInputRef = useRef(null)
  const inputRef = externalInputRef || ownInputRef
  const endRef = useRef(null)
  const [tab, setTab] = useState('ask')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState([])
  const [topics, setTopics] = useState(null)
  const [unanswered, setUnanswered] = useState(null)

  // Topics double as the starter suggestions on an empty conversation, and carry the
  // audience's own introduction.
  useEffect(() => {
    let live = true
    service.topics()
      .then(res => { if (live) setTopics(res.data.data) })
      .catch(() => { if (live) setTopics({ areas: [], notSupported: [], suggestions: [] }) })
    return () => { live = false }
  }, [service])

  useEffect(() => {
    if (tab !== 'unanswered' || unanswered) return undefined
    let live = true
    service.unanswered()
      .then(res => { if (live) setUnanswered(res.data.data) })
      .catch(() => { if (live) setUnanswered([]) })
    return () => { live = false }
  }, [tab, unanswered, service])

  useEffect(() => { endRef.current?.scrollIntoView?.({ block: 'end' }) }, [messages, busy])

  const run = useCallback(async (label, request) => {
    setTab('ask')
    setMessages(m => [...m, { id: `u${m.length}`, from: 'user', text: label }])
    setBusy(true)
    try {
      const res = await request()
      setMessages(m => [...m, { id: `b${m.length}`, from: 'bot', answer: res.data.data }])
    } catch {
      setMessages(m => [...m, { id: `b${m.length}`, from: 'bot', answer: ERROR_ANSWER }])
    } finally {
      setBusy(false)
    }
  }, [])

  const submit = (e) => {
    e.preventDefault()
    const q = text.trim()
    if (q.length < 2 || busy) return
    setText('')
    run(q, () => service.ask(q))
  }

  const pickTopic = (item) => run(item.title, () => service.openTopic(item.id))

  // In the Help Center the outer tab is already called "Ask", so the inner one is "Chat" there.
  const tabs = [
    { key: 'ask', label: layout === 'flow' ? 'Chat' : 'Ask', icon: MessageCircle },
    { key: 'browse', label: 'Browse', icon: BookOpen },
    ...(showUnanswered ? [{ key: 'unanswered', label: 'Unanswered', icon: Sparkles }] : []),
  ]

  const isPanel = layout === 'panel'
  const starters = topics?.suggestions || []

  return (
    <div className={isPanel ? 'flex flex-col flex-1 min-h-0' : ''}>
      <div role="tablist" aria-label="Help sections"
        className={`flex gap-1 flex-shrink-0 ${isPanel ? `px-3 pt-2 border-b ${t.line}` : `mb-4 rounded-xl border ${t.line} ${t.surface} p-1`}`}>
        {tabs.map(tb => (
          <button key={tb.key} type="button" role="tab" aria-selected={tab === tb.key} onClick={() => setTab(tb.key)}
            className={isPanel
              ? `min-h-[40px] px-3 rounded-t-lg text-sm ${t.font} font-medium flex items-center gap-1.5 border-b-2 transition-colors
                ${tab === tb.key ? 'border-brand-600 text-brand-700' : `border-transparent ${t.muted} hover:text-brand-700`}`
              : `flex-1 min-h-[36px] rounded-lg text-xs ${t.font} font-semibold flex items-center justify-center gap-1.5 transition-all
                ${tab === tb.key ? 'bg-white text-brand-700 shadow-sm' : `${t.muted} hover:text-brand-700`}`}>
            <tb.icon size={14} aria-hidden="true" /> {tb.label}
          </button>
        ))}
      </div>

      <div className={isPanel ? 'flex-1 min-h-0 overflow-y-auto px-4 py-4' : ''} role="tabpanel">
        {tab === 'browse' && <Browse topics={topics} onPick={pickTopic} t={t} />}
        {tab === 'unanswered' && <Unanswered rows={unanswered} t={t} />}
        {tab === 'ask' && (
          <div className="space-y-4" aria-live="polite">
            {messages.length === 0 && (
              <div>
                <p className={`text-sm ${t.font} ${t.body}`}>{topics?.intro || intro}</p>
                <Chips items={starters} onPick={pickTopic} t={t} />
              </div>
            )}
            {messages.map(m => m.from === 'user' ? (
              <div key={m.id} className="flex justify-end">
                <p className={`max-w-[85%] rounded-2xl rounded-br-md bg-brand-600 text-white text-sm ${t.font} px-3.5 py-2`}>{m.text}</p>
              </div>
            ) : (
              <BotMessage key={m.id} answer={m.answer} onGo={onNavigate} onPick={pickTopic} t={t} />
            ))}
            {busy && <p className={`text-sm ${t.font} ${t.faint}`}>Looking that up…</p>}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {tab === 'ask' && (
        <form onSubmit={submit}
          className={`flex items-center gap-2 flex-shrink-0 ${isPanel ? `px-3 py-3 border-t ${t.line}` : `sticky bottom-0 bg-white pt-3 mt-4 border-t ${t.line}`}`}>
          <label htmlFor="assistant-input" className="sr-only">Your question</label>
          <input id="assistant-input" ref={inputRef} value={text} onChange={e => setText(e.target.value)}
            maxLength={300} autoComplete="off" placeholder={placeholder}
            className={`flex-1 min-h-[44px] px-3.5 rounded-xl border ${t.lineStrong} ${t.surface} text-sm ${t.font} ${t.ink}
              ${t.inputPlaceholder} focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent`} />
          <button type="submit" disabled={busy || text.trim().length < 2} aria-label="Send question"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-brand-600 text-white
              hover:bg-brand-700 disabled:opacity-40 transition-colors">
            <Send size={16} />
          </button>
        </form>
      )}
    </div>
  )
}
