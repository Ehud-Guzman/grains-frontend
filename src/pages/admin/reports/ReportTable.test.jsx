import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DataTable, { ReportViewContext } from './ReportTable'

const ROWS = Array.from({ length: 60 }, (_, i) => ({
  name: `Item ${String(i + 1).padStart(2, '0')}`, qty: i + 1, flag: i % 10 === 0, cost: i % 7 === 0 ? null : (i + 1) * 10,
}))
const HEADERS = [
  { label: 'Name', sort: r => r.name },
  { label: 'Qty', right: true, sort: r => r.qty },
  { label: 'Cost', right: true, sort: r => r.cost },
]
const renderRow = (r) => <tr key={r.name}><td>{r.name}</td><td>{r.qty}</td><td>{r.cost ?? '—'}</td></tr>
const names = () => screen.getAllByRole('row').slice(1).map(tr => within(tr).getAllByRole('cell')[0].textContent)

const table = (props = {}, ctx = { expandAll: false }) => render(
  <ReportViewContext.Provider value={ctx}>
    <DataTable title="Things" headers={HEADERS} rows={ROWS} renderRow={renderRow} {...props} />
  </ReportViewContext.Provider>,
)

describe('DataTable', () => {
  it('shows the first 25 rows and says how many there are', () => {
    table()
    expect(names()).toHaveLength(25)
    expect(screen.getByText('Showing 25 of 60')).toBeInTheDocument()
  })

  it('shows more in steps, or all at once', async () => {
    const user = userEvent.setup()
    table()
    await user.click(screen.getByRole('button', { name: 'Show 25 more' }))
    expect(names()).toHaveLength(50)
    await user.click(screen.getByRole('button', { name: 'Show 10 more' }))
    expect(names()).toHaveLength(60)
    expect(screen.queryByRole('button', { name: /show .* more/i })).not.toBeInTheDocument()
  })

  it('"Show all" opens everything', async () => {
    const user = userEvent.setup()
    table()
    await user.click(screen.getByRole('button', { name: 'Show all 60' }))
    expect(names()).toHaveLength(60)
  })

  it('has no footer or controls for a short table that asked for none', () => {
    table({ rows: ROWS.slice(0, 5) })
    expect(screen.queryByText(/showing/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })

  it('searches, counts the matches, and says when nothing matches', async () => {
    const user = userEvent.setup()
    table({ searchText: r => r.name })
    await user.type(screen.getByRole('searchbox'), 'item 07')
    expect(names()).toEqual(['Item 07'])
    expect(screen.getByText('1 of 60 match')).toBeInTheDocument()
    await user.clear(screen.getByRole('searchbox'))
    await user.type(screen.getByRole('searchbox'), 'zzz')
    expect(screen.getByText('Nothing matches')).toBeInTheDocument()
  })

  it('sorts by a column, flips on a second click, and marks the column for assistive tech', async () => {
    const user = userEvent.setup()
    table({ defaultSort: { label: 'Qty', dir: 'desc' } })
    expect(names()[0]).toBe('Item 60')
    expect(screen.getByRole('columnheader', { name: /qty/i })).toHaveAttribute('aria-sort', 'descending')
    await user.click(screen.getByRole('button', { name: /qty/i }))
    expect(names()[0]).toBe('Item 01')
    expect(screen.getByRole('columnheader', { name: /qty/i })).toHaveAttribute('aria-sort', 'ascending')
    await user.click(screen.getByRole('button', { name: /name/i }))        // a different column starts descending
    expect(names()[0]).toBe('Item 60')
  })

  it('keeps empty values at the bottom whichever way the column is sorted', async () => {
    const user = userEvent.setup()
    table({ rows: [{ name: 'A', qty: 1, cost: null }, { name: 'B', qty: 2, cost: 5 }, { name: 'C', qty: 3, cost: 9 }] })
    await user.click(screen.getByRole('button', { name: /cost/i }))   // descending
    expect(names()).toEqual(['C', 'B', 'A'])
    await user.click(screen.getByRole('button', { name: /cost/i }))   // ascending
    expect(names()).toEqual(['B', 'C', 'A'])
  })

  it('narrows with a filter chip and combines it with search', async () => {
    const user = userEvent.setup()
    table({ chips: [{ key: 'flagged', label: 'Flagged', test: r => r.flag }], searchText: r => r.name })
    await user.click(screen.getByRole('button', { name: 'Flagged' }))
    expect(names()).toHaveLength(6)                                    // items 1, 11, 21 … 51
    expect(screen.getByRole('button', { name: 'Flagged' })).toHaveAttribute('aria-pressed', 'true')
    await user.type(screen.getByRole('searchbox'), '21')
    expect(names()).toEqual(['Item 21'])
    await user.click(screen.getByRole('button', { name: 'All' }))
    expect(names()).toEqual(['Item 21'])                               // search still applies
  })

  it('shows every row when a print or PDF is being made', () => {
    table({}, { expandAll: true })
    expect(names()).toHaveLength(60)
  })

  it('puts every control behind data-no-print so none reaches the printed sheet', () => {
    const { container } = table({ searchText: r => r.name, chips: [{ key: 'f', label: 'F', test: () => true }] })
    const controls = [screen.getByRole('searchbox'), screen.getByRole('button', { name: 'Show all 60' }), screen.getByRole('button', { name: 'F' })]
    for (const el of controls) expect(el.closest('[data-no-print]')).not.toBeNull()
    expect(container.querySelector('table')).not.toBeNull()
  })

  it('lets the server page a list (customers): no client slicing, a Previous/Next pager', async () => {
    const user = userEvent.setup()
    const onPage = vi.fn()
    table({ rows: ROWS.slice(0, 50), pagination: { page: 2, pages: 4, total: 180, onPage } })
    expect(names()).toHaveLength(50)                                   // what it was given, all of it
    expect(screen.getByText('Page 2 of 4 · 180 in total')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(onPage).toHaveBeenCalledWith(3)
    await user.click(screen.getByRole('button', { name: /previous/i }))
    expect(onPage).toHaveBeenCalledWith(1)
  })

  it('disables Previous on the first page and Next on the last', () => {
    table({ rows: ROWS.slice(0, 5), pagination: { page: 1, pages: 1, total: 5, onPage: () => {} } })
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })
})
