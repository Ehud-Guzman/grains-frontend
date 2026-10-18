import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./api', () => ({ default: { post: vi.fn(), get: vi.fn() } }))

import api from './api'
import { paymentService, STK_INITIATE_TIMEOUT } from './payment.service'

beforeEach(() => vi.clearAllMocks())

describe('paymentService.initiate', () => {
  it('waits longer than the app-wide 15s for Daraja before calling the prompt failed', async () => {
    api.post.mockResolvedValue({ data: {} })

    await paymentService.initiate('order1', '0712345678', '0712345678')

    const [url, body, config] = api.post.mock.calls[0]
    expect(url).toBe('/payments/mpesa/initiate')
    expect(body).toEqual({ orderId: 'order1', phone: '0712345678', contactPhone: '0712345678' })
    // The server allows up to ~40s (token + push); the default 15s reported "failed" for prompts that were sent.
    expect(config.timeout).toBe(STK_INITIATE_TIMEOUT)
    expect(STK_INITIATE_TIMEOUT).toBeGreaterThanOrEqual(40000)
  })
})
