let scriptPromise

export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay)
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    const fail = () => {
      clearTimeout(timer)
      script.remove()
      scriptPromise = undefined
      reject(new Error('Razorpay could not load. Check your connection and try again.'))
    }
    const timer = setTimeout(fail, 20000)
    script.onerror = fail
    script.onload = () => {
      if (!window.Razorpay) return fail()
      clearTimeout(timer)
      resolve(window.Razorpay)
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

export async function paymentRequest(apiUrl, path, payload) {
  let response
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000)
  try {
    response = await fetch(`${apiUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
  } catch {
    throw new Error('Could not reach the payment server. Check your connection and retry.')
  } finally {
    clearTimeout(timeout)
  }
  const result = await response.json().catch(() => null)
  if (!result || typeof result !== 'object') {
    throw new Error('The payment server is starting or unavailable. Please retry shortly.')
  }
  if (!response.ok) {
    const error = new Error(result.error ?? 'Payment could not be processed. Please retry.')
    error.status = response.status
    error.details = result.details
    throw error
  }
  return result
}

export function openRazorpayCheckout(Razorpay, paymentOrder, customer) {
  return new Promise((resolve, reject) => {
    let settled = false
    const checkout = new Razorpay({
      key: paymentOrder.key_id,
      amount: paymentOrder.amount,
      currency: paymentOrder.currency,
      order_id: paymentOrder.order_id,
      name: 'Lakshmi Kai Pakkuvam',
      description: 'Food order payment',
      prefill: { name: customer.customerName, contact: customer.phoneNumber },
      theme: { color: '#ae512c' },
      retry: { enabled: false },
      handler: (response) => {
        if (settled) return
        settled = true
        resolve(response)
      },
      modal: {
        ondismiss: () => {
          if (settled) return
          settled = true
          reject(new Error('Payment cancelled. Your cart is saved; you can try again.'))
        },
      },
    })
    checkout.on('payment.failed', () => {
      if (settled) return
      settled = true
      checkout.close()
      reject(new Error('Payment failed. Your cart is saved. Please try again or choose another payment method.'))
    })
    checkout.open()
  })
}

export async function verifyCheckoutPayment(apiUrl, orderId, response) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await paymentRequest(apiUrl, '/verify-payment', { orderId, ...response })
    } catch (error) {
      if ([400, 401, 404].includes(error.status) || attempt === 3) throw error
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }
  }
}
