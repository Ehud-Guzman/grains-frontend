// What a customer should read about an order's payment. The order pages used to print
// "Payment pending" for everything that was not paid — including a refund owed after a
// cancellation and a failed M-Pesa attempt.
export const paymentStatusDisplay = (order) => {
  const { paymentStatus, paymentMethod, status } = order || {}
  if (paymentStatus === 'paid') return { label: '✓ Paid', tone: 'text-green-600' }
  if (paymentStatus === 'refunded') return { label: 'Refund due — we will contact you', tone: 'text-blue-600' }
  if (status === 'cancelled' || status === 'rejected') return { label: 'Not charged', tone: 'text-earth-500' }
  if (paymentStatus === 'failed') return { label: 'Payment failed — try again', tone: 'text-red-600' }
  if (paymentMethod === 'pickup') return { label: 'Pay on pickup', tone: 'text-amber-600' }
  if (paymentMethod === 'delivery') return { label: 'Pay on delivery', tone: 'text-amber-600' }
  return { label: 'Payment pending', tone: 'text-amber-600' }
}
