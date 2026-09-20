import { createContext, forwardRef, useContext, useId } from 'react'

// ── Labelled form primitives ──────────────────────────────────────────────────
// Before this file the codebase had 102 <input> and 92 <label> elements with
// ZERO `htmlFor`, zero `aria-describedby`, zero `aria-invalid` and zero
// `role="alert"` — so every form in the app announced as "edit text, blank" to
// a screen reader and validation errors were never announced at all (WCAG 2.1
// AA 1.3.1, 3.3.1, 4.1.2).
//
// `<Field>` generates the id, renders the <label> bound to it, and publishes
// the wiring through context; `<Input>`/`<Select>`/`<Textarea>` consume it.
// Controls used outside a <Field> still work — they just fall back to plain
// props, which keeps migration incremental instead of all-or-nothing.

const FieldContext = createContext(null)

/** Read the enclosing <Field>'s wiring. Returns null outside a Field. */
export function useField() {
  return useContext(FieldContext)
}

const LABEL_CLASS = 'block text-xs font-body font-semibold text-earth-700 uppercase tracking-wide mb-1.5'
const HINT_CLASS = 'text-earth-400 text-xs mt-1.5 font-body'
const ERROR_CLASS = 'text-red-500 text-xs mt-1.5 flex items-center gap-1 font-body'

export function Field({
  label,
  error,
  hint,
  required = false,
  /** Optional explicit id — otherwise a stable one is generated. */
  id: idProp,
  className = '',
  labelClassName = LABEL_CLASS,
  children,
}) {
  const reactId = useId()
  const id = idProp || `field-${reactId}`
  const errorId = `${id}-error`
  const hintId = `${id}-hint`

  const describedBy = [error ? errorId : null, !error && hint ? hintId : null]
    .filter(Boolean)
    .join(' ')

  const ctx = {
    id,
    errorId,
    hintId,
    describedBy: describedBy || undefined,
    invalid: Boolean(error),
    required,
  }

  return (
    <FieldContext.Provider value={ctx}>
      <div className={className}>
        {label && (
          <label htmlFor={id} className={labelClassName}>
            {label}
            {required && (
              <>
                <span className="text-red-400 normal-case font-normal ml-0.5" aria-hidden="true">*</span>
                <span className="sr-only"> (required)</span>
              </>
            )}
          </label>
        )}
        {children}
        {hint && !error && <p id={hintId} className={HINT_CLASS}>{hint}</p>}
        {error && (
          <p id={errorId} role="alert" className={ERROR_CLASS}>
            <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  )
}

const baseControlClass = (invalid, extra) =>
  `w-full border rounded-xl px-4 py-3 text-sm font-body text-earth-800 placeholder-earth-400
   focus:outline-none focus:ring-2 focus:border-transparent transition-all bg-earth-50
   min-h-[44px] ${invalid ? 'border-red-300 focus:ring-red-300' : 'border-earth-200 focus:ring-brand-400'} ${extra}`

/**
 * Text input. Inside a <Field> it is automatically labelled, marked
 * aria-invalid on error and linked to its hint/error text.
 */
export const Input = forwardRef(function Input({ className = '', ...props }, ref) {
  const field = useField()
  return (
    <input
      ref={ref}
      id={props.id ?? field?.id}
      aria-invalid={field?.invalid || undefined}
      aria-describedby={props['aria-describedby'] ?? field?.describedBy}
      aria-required={field?.required || props.required || undefined}
      className={baseControlClass(field?.invalid, className)}
      {...props}
    />
  )
})

export const Textarea = forwardRef(function Textarea({ className = '', rows = 3, ...props }, ref) {
  const field = useField()
  return (
    <textarea
      ref={ref}
      rows={rows}
      id={props.id ?? field?.id}
      aria-invalid={field?.invalid || undefined}
      aria-describedby={props['aria-describedby'] ?? field?.describedBy}
      aria-required={field?.required || props.required || undefined}
      className={baseControlClass(field?.invalid, className)}
      {...props}
    />
  )
})

export const Select = forwardRef(function Select({ className = '', children, ...props }, ref) {
  const field = useField()
  return (
    <select
      ref={ref}
      id={props.id ?? field?.id}
      aria-invalid={field?.invalid || undefined}
      aria-describedby={props['aria-describedby'] ?? field?.describedBy}
      aria-required={field?.required || props.required || undefined}
      className={baseControlClass(field?.invalid, className)}
      {...props}
    >
      {children}
    </select>
  )
})


/**
 * Checkbox that is actually a checkbox. The previous "custom checkbox" was a
 * <div onClick> inside a <label> with no input element at all, so it was
 * invisible to keyboard users and assistive tech. This keeps the visual style
 * but uses a real (visually hidden) input, making it focusable and announceable.
 */
export function Checkbox({ checked, onChange, label, id: idProp, className = '' }) {
  const reactId = useId()
  const id = idProp || `checkbox-${reactId}`
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="relative flex items-center justify-center w-4 h-4 flex-shrink-0">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked, e)}
          className="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer m-0"
        />
        <span
          aria-hidden="true"
          className={`pointer-events-none w-4 h-4 rounded-md flex items-center justify-center border-2 transition-all
            peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400 peer-focus-visible:ring-offset-1
            ${checked ? 'bg-brand-500 border-brand-500 shadow-sm' : 'border-earth-300'}`}
        >
          {checked && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={3} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </span>
      </span>
      {label && (
        <label htmlFor={id} className={`text-sm font-body cursor-pointer leading-tight transition-colors ${
          checked ? 'text-brand-700 font-semibold' : 'text-earth-600'
        }`}>
          {label}
        </label>
      )}
    </div>
  )
}
