import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import InstallAppButton from './InstallAppButton'

afterEach(() => { vi.restoreAllMocks() })

const fireInstallPrompt = (outcome = 'accepted') => {
  const event = new Event('beforeinstallprompt', { cancelable: true })
  event.prompt = vi.fn()
  event.userChoice = Promise.resolve({ outcome })
  act(() => { window.dispatchEvent(event) })
  return event
}

describe('InstallAppButton', () => {
  it('renders nothing when the browser offers no way to install', () => {
    const { container } = render(<InstallAppButton />)
    expect(container).toBeEmptyDOMElement()
  })

  it('appears once the browser offers the install prompt, and triggers it on click', async () => {
    render(<InstallAppButton />)
    const event = fireInstallPrompt()
    const button = await screen.findByRole('button', { name: /install the app/i })
    await act(async () => { fireEvent.click(button) })
    expect(event.prompt).toHaveBeenCalledTimes(1)
  })

  it('hides again after the app is installed', async () => {
    render(<InstallAppButton />)
    fireInstallPrompt()
    await screen.findByRole('button', { name: /install the app/i })
    act(() => { window.dispatchEvent(new Event('appinstalled')) })
    expect(screen.queryByRole('button', { name: /install the app/i })).not.toBeInTheDocument()
  })

  it('shows Add to Home Screen steps on iOS Safari', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1')
    render(<InstallAppButton />)
    fireEvent.click(await screen.findByRole('button', { name: /install the app/i }))
    expect(screen.getByRole('status')).toHaveTextContent(/add to home screen/i)
  })
})
