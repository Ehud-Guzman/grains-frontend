import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Field, Input, Select, Textarea, Checkbox } from './Field'

describe('Field — label and error wiring', () => {
  // The whole point of this component: before it existed the app had 92 <label>
  // and 0 htmlFor, so no form control in the app had an accessible name and no
  // error was ever announced.
  it('binds the label to the control via htmlFor/id', () => {
    render(
      <Field label="Full name">
        <Input />
      </Field>,
    )

    const input = screen.getByLabelText('Full name')
    expect(input).toBeInTheDocument()
    expect(input.id).toBeTruthy()
  })

  it('announces required in the accessible name, not just visually', () => {
    render(
      <Field label="Phone" required>
        <Input />
      </Field>,
    )

    // getByLabelText matches the computed accessible name, which includes the
    // sr-only "(required)" text.
    expect(screen.getByLabelText(/Phone/)).toHaveAttribute('aria-required', 'true')
  })

  it('marks the control invalid and links it to the error, which is role="alert"', () => {
    render(
      <Field label="Email" error="Enter a valid email address">
        <Input />
      </Field>,
    )

    const input = screen.getByLabelText('Email')
    const alert = screen.getByRole('alert')

    expect(alert).toHaveTextContent('Enter a valid email address')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input.getAttribute('aria-describedby')).toBe(alert.id)
  })

  it('links hint text when there is no error, and drops the hint when there is one', () => {
    const { rerender } = render(
      <Field label="KRA PIN" hint="One letter, nine digits, one letter">
        <Input />
      </Field>,
    )

    const hint = screen.getByText('One letter, nine digits, one letter')
    expect(screen.getByLabelText('KRA PIN').getAttribute('aria-describedby')).toBe(hint.id)

    rerender(
      <Field label="KRA PIN" hint="One letter, nine digits, one letter" error="Invalid PIN">
        <Input />
      </Field>,
    )
    expect(screen.queryByText('One letter, nine digits, one letter')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid PIN')
  })

  it('wires Select and Textarea the same way', () => {
    render(
      <>
        <Field label="Preferred rider">
          <Select><option>None</option></Select>
        </Field>
        <Field label="Notes">
          <Textarea />
        </Field>
      </>,
    )

    expect(screen.getByLabelText('Preferred rider').tagName).toBe('SELECT')
    expect(screen.getByLabelText('Notes').tagName).toBe('TEXTAREA')
  })

  it('lets an explicit id win over the generated one', () => {
    render(
      <Field label="Name" id="checkout-name">
        <Input />
      </Field>,
    )
    expect(screen.getByLabelText('Name')).toHaveAttribute('id', 'checkout-name')
  })
})

describe('Checkbox', () => {
  // Previously a <div onClick> inside a <label> with no input at all — invisible
  // to keyboard and assistive tech.
  it('renders a real, focusable, labelled checkbox', async () => {
    const onChange = vi.fn()
    render(<Checkbox checked={false} onChange={onChange} label="In stock only" />)

    const box = screen.getByRole('checkbox', { name: 'In stock only' })
    expect(box).not.toBeChecked()

    await userEvent.click(box)
    expect(onChange).toHaveBeenCalledWith(true, expect.anything())
  })

  it('reflects the checked state to assistive tech', () => {
    render(<Checkbox checked onChange={() => {}} label="In stock only" />)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })
})
