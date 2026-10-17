import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import QuantityStepper from './QuantityStepper'

function Harness({ start = 1, max = 100, onChange = () => {}, quickAdds }) {
  const [v, setV] = useState(start)
  return (
    <QuantityStepper value={v} max={max} quickAdds={quickAdds}
      onChange={(n) => { setV(n); onChange(n) }} />
  )
}
const box = () => screen.getByRole('textbox', { name: 'Quantity' })

describe('QuantityStepper', () => {
  it('lets a buyer type a bulk quantity instead of tapping +1 fifty times', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.change(box(), { target: { value: '50' } })
    fireEvent.blur(box())
    expect(onChange).toHaveBeenLastCalledWith(50)
    expect(box()).toHaveValue('50')
  })

  it('clamps to the available stock', () => {
    const onChange = vi.fn()
    render(<Harness max={30} onChange={onChange} />)
    fireEvent.change(box(), { target: { value: '500' } })
    fireEvent.blur(box())
    expect(onChange).toHaveBeenLastCalledWith(30)
  })

  it('keeps the old value when the box is cleared or not a number', () => {
    const onChange = vi.fn()
    render(<Harness start={7} onChange={onChange} />)
    fireEvent.change(box(), { target: { value: '' } })
    fireEvent.blur(box())
    expect(onChange).not.toHaveBeenCalled()
    expect(box()).toHaveValue('7')
  })

  it('strips non-digits and never goes below 1', () => {
    const onChange = vi.fn()
    render(<Harness start={5} onChange={onChange} />)
    fireEvent.change(box(), { target: { value: '-3' } })
    expect(box()).toHaveValue('3')
    fireEvent.change(box(), { target: { value: '0' } })
    fireEvent.blur(box())
    expect(onChange).toHaveBeenLastCalledWith(1)
  })

  it('commits on Enter', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.change(box(), { target: { value: '12' } })
    fireEvent.keyDown(box(), { key: 'Enter' })
    expect(onChange).toHaveBeenLastCalledWith(12)
  })

  it('has labelled +/- buttons that respect the limits', () => {
    render(<Harness start={1} max={2} />)
    expect(screen.getByRole('button', { name: /decrease quantity/i })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /increase quantity/i }))
    expect(box()).toHaveValue('2')
    expect(screen.getByRole('button', { name: /increase quantity/i })).toBeDisabled()
  })

  it('quick-add chips jump by 10 and 50, clamped to stock', () => {
    const onChange = vi.fn()
    render(<Harness max={55} quickAdds={[10, 50]} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add 50' }))
    expect(onChange).toHaveBeenLastCalledWith(51)
    fireEvent.click(screen.getByRole('button', { name: 'Add 10' }))
    expect(onChange).toHaveBeenLastCalledWith(55)
  })
})
