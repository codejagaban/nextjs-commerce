// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CheckoutForm } from '@/components/forms/CheckoutForm'
import { ConfirmOrder } from '@/components/checkout/ConfirmOrder'

const mocks = vi.hoisted(() => ({
  confirmPayment: vi.fn(),
  confirmOrder: vi.fn(),
  clearCart: vi.fn(),
  push: vi.fn(),
  search: new URLSearchParams('payment_intent=pi_test&email=guest%2Btest%40example.com'),
}))
vi.mock('@stripe/react-stripe-js', () => ({
  useStripe: () => ({ confirmPayment: mocks.confirmPayment }),
  useElements: () => ({}),
  PaymentElement: ({ onReady }: { onReady: () => void }) => (
    <button type="button" onClick={onReady}>
      Load test payment form
    </button>
  ),
}))
vi.mock('@payloadcms/plugin-ecommerce/client/react', () => ({
  useCart: () => ({ cart: { id: 1, items: [] }, clearCart: mocks.clearCart }),
  usePayments: () => ({ confirmOrder: mocks.confirmOrder }),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => mocks.search,
}))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.clearCart.mockResolvedValue(undefined)
})
afterEach(cleanup)

describe('Checkout payment recovery', () => {
  it('waits for Stripe to load, then releases the processing state after a decline', async () => {
    const processing = vi.fn()
    mocks.confirmPayment.mockResolvedValue({ error: { message: 'Your card was declined.' } })
    render(<CheckoutForm setProcessingPayment={processing} />)
    expect((screen.getByRole('button', { name: 'Pay now' }) as HTMLButtonElement).disabled).toBe(
      true,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Load test payment form' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pay now' }))
    await screen.findByText('Your card was declined.')
    expect(processing).toHaveBeenLastCalledWith(false)
    expect(mocks.confirmOrder).not.toHaveBeenCalled()
    expect((screen.getByRole('button', { name: 'Pay now' }) as HTMLButtonElement).disabled).toBe(
      false,
    )
  })

  it('retries order confirmation without submitting another payment', async () => {
    mocks.confirmPayment.mockResolvedValue({
      paymentIntent: { id: 'pi_test', status: 'succeeded' },
    })
    mocks.confirmOrder
      .mockRejectedValueOnce(new Error('Temporary order error'))
      .mockResolvedValueOnce({ orderID: 42, accessToken: 'test-access' })
    render(<CheckoutForm customerEmail="guest+test@example.com" setProcessingPayment={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Load test payment form' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pay now' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Retry order confirmation' }))
    await waitFor(() => expect(mocks.push).toHaveBeenCalled())
    expect(mocks.confirmPayment).toHaveBeenCalledTimes(1)
    expect(mocks.confirmOrder).toHaveBeenCalledTimes(2)
    const returnURL = new URL(mocks.confirmPayment.mock.calls[0][0].confirmParams.return_url)
    expect(returnURL.searchParams.get('email')).toBe('guest+test@example.com')
    expect(mocks.push.mock.calls[0][0]).toContain('/orders/42?')
  })

  it('confirms a redirected guest payment even after the webhook emptied the cart', async () => {
    mocks.confirmOrder.mockResolvedValue({ orderID: 42, accessToken: 'test-access' })
    render(<ConfirmOrder />)
    await waitFor(() => expect(mocks.push).toHaveBeenCalled())
    expect(mocks.confirmOrder).toHaveBeenCalledWith('stripe', {
      additionalData: { paymentIntentID: 'pi_test', customerEmail: 'guest+test@example.com' },
    })
    expect(mocks.clearCart).toHaveBeenCalled()
  })

  it('shows a recovery action instead of spinning forever after confirmation fails', async () => {
    mocks.confirmOrder
      .mockRejectedValueOnce(new Error('Temporary order error'))
      .mockResolvedValueOnce({ orderID: 42 })
    render(<ConfirmOrder />)
    fireEvent.click(await screen.findByRole('button', { name: 'Retry order confirmation' }))
    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith('/orders/42?email=guest%2Btest%40example.com'),
    )
  })
})
