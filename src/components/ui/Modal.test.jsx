import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Modal from './Modal'

describe('Modal', () => {
  it('renders a modal dialog with an accessible name', () => {
    render(
      <Modal onClose={() => {}} label="Add to list">
        <button type="button">OK</button>
      </Modal>,
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName('Add to list')
  })

  it('can take its name from a visible heading via labelledBy', () => {
    render(
      <Modal onClose={() => {}} labelledBy="modal-title">
        <h2 id="modal-title">Change Password</h2>
      </Modal>,
    )
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Change Password')
  })

  it('moves focus into the panel when it opens', async () => {
    render(
      <Modal onClose={() => {}} label="Test">
        <button type="button">First action</button>
      </Modal>,
    )

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'First action' })).toHaveFocus(),
    )
  })

  it('closes on Escape', async () => {
    const onClose = vi.fn()
    render(
      <Modal onClose={onClose} label="Test">
        <button type="button">First action</button>
      </Modal>,
    )

    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not close on Escape when dismissOnEscape is false', async () => {
    const onClose = vi.fn()
    render(
      <Modal onClose={onClose} label="Test" dismissOnEscape={false}>
        <button type="button">First action</button>
      </Modal>,
    )

    await userEvent.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
  })

  // The behaviour that was entirely missing before this component: 23 hand-rolled
  // overlays let a keyboard user Tab straight out into the page behind.
  //
  // Tab is dispatched at the document level (capture phase), which is exactly
  // where the trap listens, and `fireEvent` returns false when the handler called
  // preventDefault — so this asserts the trap actually intercepted the key
  // rather than merely that focus happened to move.
  it('wraps Tab from the last focusable element back to the first', async () => {
    render(
      <Modal onClose={() => {}} label="Test">
        <button type="button">First</button>
        <button type="button">Last</button>
      </Modal>,
    )

    const first = screen.getByRole('button', { name: 'First' })
    const last = screen.getByRole('button', { name: 'Last' })

    await waitFor(() => expect(first).toHaveFocus())

    // Tab off the end must wrap to the first, not escape the dialog.
    last.focus()
    expect(fireEvent.keyDown(document, { key: 'Tab' })).toBe(false)
    expect(first).toHaveFocus()

    // Shift+Tab off the start must wrap back to the last.
    first.focus()
    expect(fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })).toBe(false)
    expect(last).toHaveFocus()
  })

  it('leaves mid-list Tab presses alone so the browser moves focus normally', async () => {
    render(
      <Modal onClose={() => {}} label="Test">
        <button type="button">First</button>
        <button type="button">Middle</button>
        <button type="button">Last</button>
      </Modal>,
    )

    const middle = screen.getByRole('button', { name: 'Middle' })
    middle.focus()

    // Not at an edge → the trap must NOT preventDefault.
    expect(fireEvent.keyDown(document, { key: 'Tab' })).toBe(true)
  })

  it('locks body scroll while open and restores the previous value on close', () => {
    document.body.style.overflow = 'auto'

    const { unmount } = render(
      <Modal onClose={() => {}} label="Test">
        <button type="button">OK</button>
      </Modal>,
    )
    expect(document.body.style.overflow).toBe('hidden')

    unmount()
    expect(document.body.style.overflow).toBe('auto')
  })

  it('returns focus to the element that opened it', async () => {
    function Harness() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>Open dialog</button>
          {open && (
            <Modal onClose={() => setOpen(false)} label="Test">
              <button type="button">Inside</button>
            </Modal>
          )}
        </>
      )
    }

    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Open dialog' })
    trigger.focus()

    await userEvent.click(trigger)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()
  })
})
