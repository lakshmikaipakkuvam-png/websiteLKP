import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ChevronLeft, ChevronRight, MessageCircle, PackageCheck, Phone, RefreshCcw } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:4000/api'

const STATUS_OPTIONS = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  ...STATUS_OPTIONS,
]

const STATUS_STYLES = {
  confirmed: 'bg-yellow text-ink',
  preparing: 'bg-[#f3e8ff] text-[#6d28d9]',
  shipped: 'bg-[#e8f1ff] text-[#2457a6]',
  delivered: 'bg-[#e9fff2] text-[#0f8b4c]',
  cancelled: 'bg-[#fff1f1] text-[#b42318]',
}

const LEGACY_STATUS_LABELS = {
  processed: 'Confirmed',
  packed: 'Preparing',
  in_transit: 'Shipped',
}

function formatPrice(price) {
  return `Rs. ${Number(price ?? 0).toLocaleString('en-IN')}`
}

function formatDate(value) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function getStatusLabel(status) {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? LEGACY_STATUS_LABELS[status] ?? status
}

function formatPaymentLabel(payment) {
  if (!payment) {
    return 'Payment pending'
  }

  return payment.status === 'success' ? 'Paid' : payment.status
}

function getDigits(value) {
  return typeof value === 'string' ? value.replace(/\D/g, '') : ''
}

function getWhatsappUrl(order) {
  const number = getDigits(order.whatsappNumber || order.phoneNumber)

  if (!number) {
    return ''
  }

  const message = `Hi ${order.customerName}, your Lakshmi Kai Pakkuvam order ${order.orderNumber} is ${getStatusLabel(order.status).toLowerCase()}.`
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [statusUpdating, setStatusUpdating] = useState('')
  const [trackingUpdating, setTrackingUpdating] = useState('')
  const [trackingInputs, setTrackingInputs] = useState({})
  const [statusFilter, setStatusFilter] = useState('all')

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  )

  const filteredOrders = useMemo(() => (
    statusFilter === 'all' ? orders : orders.filter((order) => order.status === statusFilter)
  ), [orders, statusFilter])

  const statusCounts = useMemo(() => (
    orders.reduce((counts, order) => {
      counts[order.status] = (counts[order.status] ?? 0) + 1
      return counts
    }, { all: orders.length })
  ), [orders])

  async function loadOrders() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/orders`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error ?? 'Orders could not be loaded.')
      }

      setOrders(result.orders ?? [])
      setSelectedOrderId((currentId) => (
        result.orders?.some((order) => order.id === currentId) ? currentId : ''
      ))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  useEffect(() => {
    setTrackingInputs((currentInputs) => {
      const nextInputs = { ...currentInputs }

      orders.forEach((order) => {
        if (nextInputs[order.id] === undefined) {
          nextInputs[order.id] = order.trackingId ?? ''
        }
      })

      return nextInputs
    })
  }, [orders])

  async function updateStatus(orderId, status) {
    setStatusUpdating(orderId)
    setError('')

    try {
      const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error ?? 'Order status could not be updated.')
      }

      setOrders((currentOrders) => currentOrders.map((order) => (
        order.id === orderId ? result.order : order
      )))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setStatusUpdating('')
    }
  }

  async function updateTrackingId(orderId) {
    setTrackingUpdating(orderId)
    setError('')

    try {
      const response = await fetch(`${API_URL}/orders/${orderId}/tracking`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingId: trackingInputs[orderId] ?? '' }),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error ?? 'Tracking ID could not be updated.')
      }

      setOrders((currentOrders) => currentOrders.map((order) => (
        order.id === orderId ? result.order : order
      )))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setTrackingUpdating('')
    }
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 font-[Poppins]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-muted">
            {filteredOrders.length} shown / {orders.length} total orders
          </p>
          {error ? <p className="mt-1 text-sm font-bold text-signal">{error}</p> : null}
        </div>
        <button
          type="button"
          onClick={loadOrders}
          disabled={loading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-none bg-yellow px-5 text-sm font-bold text-ink transition-colors hover:bg-yellow-dark disabled:cursor-not-allowed disabled:bg-dust"
        >
          <RefreshCcw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          Refresh
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_FILTER_OPTIONS.map((option) => {
          const active = statusFilter === option.value
          const count = statusCounts[option.value] ?? 0

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setStatusFilter(option.value)
                setSelectedOrderId('')
              }}
              className={[
                'inline-flex h-10 shrink-0 items-center gap-2 border px-4 text-sm font-extrabold transition-colors',
                active ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-muted hover:border-ink hover:text-ink',
              ].join(' ')}
            >
              <span>{option.label}</span>
              <span className={active ? 'text-white/75' : 'text-muted'}>{count}</span>
            </button>
          )
        })}
      </div>

      {selectedOrder ? (
        <section className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => setSelectedOrderId('')}
                className="mb-4 inline-flex h-10 items-center gap-2 text-sm font-extrabold text-muted transition-colors hover:text-ink"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to orders
              </button>
              <p className="text-sm font-bold text-muted">Order details</p>
              <h2 className="mt-1 text-2xl font-extrabold text-ink sm:text-3xl">{selectedOrder.orderNumber}</h2>
              <p className="mt-1 text-xs font-semibold text-muted">{formatDate(selectedOrder.createdAt)}</p>
            </div>
            <span className={`w-fit rounded-full px-3 py-1 text-xs font-extrabold ${STATUS_STYLES[selectedOrder.status] ?? 'bg-canvas text-ink'}`}>
              {getStatusLabel(selectedOrder.status)}
            </span>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="min-w-0 space-y-5">
              <section className="border border-line bg-surface p-4 sm:p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  {selectedOrder.payment ? (
                    <div className="md:col-span-2">
                      <p className="text-sm font-extrabold text-[#0f8b4c]">Payment success</p>
                      <p className="mt-1 break-all text-xs font-semibold text-muted">Payment ID: <span className="text-ink">{selectedOrder.payment.providerPaymentId}</span></p>
                      <p className="mt-1 break-all text-xs font-semibold text-muted">Order ID: <span className="text-ink">{selectedOrder.payment.providerOrderId}</span></p>
                    </div>
                  ) : (
                    <div className="md:col-span-2 text-sm font-extrabold text-signal">Payment record not found.</div>
                  )}

                  <div>
                    <p className="font-bold text-muted">Customer</p>
                    <p className="mt-1 font-extrabold text-ink">{selectedOrder.customerName}</p>
                    {selectedOrder.customer?.id ? (
                      <p className="mt-1 break-all text-xs font-semibold text-muted">Customer ID: <span className="text-ink">{selectedOrder.customer.id}</span></p>
                    ) : null}
                  </div>
                  <div>
                    <p className="font-bold text-muted">Contact</p>
                    <p className="mt-1 font-extrabold text-ink">{selectedOrder.phoneNumber}</p>
                    {selectedOrder.whatsappNumber ? <p className="mt-1 text-sm font-semibold text-muted">WhatsApp: {selectedOrder.whatsappNumber}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2 md:col-span-2">
                    {selectedOrder.phoneNumber ? (
                      <a href={`tel:${selectedOrder.phoneNumber}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-extrabold text-ink transition-colors hover:border-signal hover:text-signal">
                        <Phone className="h-4 w-4" />
                        Call
                      </a>
                    ) : null}
                    {getWhatsappUrl(selectedOrder) ? (
                      <a href={getWhatsappUrl(selectedOrder)} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-[#d7eedf] px-4 text-sm font-extrabold text-[#0f8b4c] transition-colors hover:bg-[#e9fff2]">
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp
                      </a>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="border border-line bg-surface p-4 sm:p-5">
                <h3 className="text-base font-extrabold text-ink">Delivery and billing</h3>
                <div className="mt-4 grid gap-5 md:grid-cols-2">
                  <div>
                    <p className="font-bold text-muted">Delivery address</p>
                    <p className="mt-1 whitespace-pre-wrap font-semibold leading-6 text-ink">{selectedOrder.deliveryAddress}</p>
                    {[selectedOrder.deliveryDistrict, selectedOrder.deliveryState].filter(Boolean).length > 0 ? (
                      <p className="mt-1 text-sm font-extrabold text-ink">{[selectedOrder.deliveryDistrict, selectedOrder.deliveryState].filter(Boolean).join(', ')}</p>
                    ) : null}
                    {selectedOrder.deliveryPincode ? <p className="mt-1 text-sm font-extrabold text-ink">PIN: {selectedOrder.deliveryPincode}</p> : null}
                  </div>
                  <div>
                    <p className="font-bold text-muted">Billing</p>
                    {selectedOrder.billingSameAsShipping !== false ? (
                      <p className="mt-1 font-semibold text-ink">Same as shipping address</p>
                    ) : (
                      <div className="mt-1 space-y-1 font-semibold leading-6 text-ink">
                        <p>{selectedOrder.billingName}</p>
                        <p className="whitespace-pre-wrap">{selectedOrder.billingAddress}</p>
                        <p>{[selectedOrder.billingCity, selectedOrder.billingState, selectedOrder.billingPincode].filter(Boolean).join(', ')}</p>
                        {selectedOrder.billingPhone ? <p>Phone: {selectedOrder.billingPhone}</p> : null}
                      </div>
                    )}
                  </div>
                  {selectedOrder.customerNotes ? (
                    <div className="md:col-span-2">
                      <p className="font-bold text-muted">Notes</p>
                      <p className="mt-1 whitespace-pre-wrap font-semibold leading-6 text-ink">{selectedOrder.customerNotes}</p>
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="border border-line bg-surface p-4 sm:p-5">
                <h3 className="text-base font-extrabold text-ink">Items</h3>
                <div className="mt-3 divide-y divide-line">
                  {(selectedOrder.items ?? []).map((item) => (
                    <div key={item.id} className="flex gap-3 py-3">
                      <div className="h-16 w-14 shrink-0 overflow-hidden bg-canvas">
                        {item.productImageUrl ? <img src={item.productImageUrl} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-extrabold uppercase leading-5 text-ink">{item.productName}</p>
                        <p className="mt-1 text-xs font-semibold text-muted">{[item.weightLabel, `Qty ${item.quantity}`].filter(Boolean).join(' | ')}</p>
                      </div>
                      <p className="text-sm font-extrabold text-ink">{formatPrice(item.lineTotal)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-line pt-4 text-base font-extrabold text-ink">
                  <span>Products total</span>
                  <span>{formatPrice(selectedOrder.subtotalAmount)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm font-bold text-muted">
                  <span>Delivery charge</span>
                  <span>{formatPrice(selectedOrder.deliveryCharge ?? 0)}</span>
                </div>
                {(selectedOrder.discountAmount ?? 0) > 0 ? (
                  <div className="mt-2 flex items-center justify-between text-sm font-bold text-[#0f8b4c]">
                    <span>Discount {selectedOrder.discountCode ? `(${selectedOrder.discountCode})` : ''}</span>
                    <span>-{formatPrice(selectedOrder.discountAmount)}</span>
                  </div>
                ) : null}
                <div className="mt-2 flex items-center justify-between text-base font-extrabold text-ink">
                  <span>Total</span>
                  <span>{formatPrice(selectedOrder.grandTotalAmount ?? selectedOrder.subtotalAmount)}</span>
                </div>
              </section>
            </div>

            <aside className="min-w-0 space-y-5">
              <section className="border border-line bg-surface p-4 sm:p-5">
                <label className="text-sm font-bold text-muted" htmlFor="order-status">Update status</label>
                <select
                  id="order-status"
                  value={selectedOrder.status}
                  onChange={(event) => updateStatus(selectedOrder.id, event.target.value)}
                  disabled={statusUpdating === selectedOrder.id}
                  className="mt-2 h-12 w-full border border-line bg-lifted px-3 text-sm font-extrabold text-ink outline-none focus:border-ink disabled:opacity-60"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {statusUpdating === selectedOrder.id ? (
                  <p className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-muted">
                    <CheckCircle2 className="h-4 w-4" />
                    Updating status
                  </p>
                ) : null}
              </section>

              <section className="border border-line bg-surface p-4 sm:p-5">
                <label className="text-sm font-bold text-muted" htmlFor="order-tracking-id">Tracking ID</label>
                <input
                  id="order-tracking-id"
                  type="text"
                  value={trackingInputs[selectedOrder.id] ?? selectedOrder.trackingId ?? ''}
                  onChange={(event) => setTrackingInputs((inputs) => ({ ...inputs, [selectedOrder.id]: event.target.value }))}
                  placeholder="Paste courier tracking ID"
                  className="mt-2 h-12 w-full border border-line bg-lifted px-3 text-sm font-extrabold text-ink outline-none focus:border-ink disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => updateTrackingId(selectedOrder.id)}
                  disabled={trackingUpdating === selectedOrder.id}
                  className="mt-3 h-10 w-full rounded-none bg-yellow px-4 text-sm font-bold text-ink transition-colors hover:bg-yellow-dark disabled:cursor-not-allowed disabled:bg-dust"
                >
                  {trackingUpdating === selectedOrder.id ? 'Saving...' : selectedOrder.trackingId ? 'Update tracking ID' : 'Save tracking ID'}
                </button>
                {selectedOrder.trackingId ? (
                  <p className="mt-2 break-all text-xs font-semibold text-muted">Current: <span className="text-ink">{selectedOrder.trackingId}</span></p>
                ) : (
                  <p className="mt-2 text-xs font-semibold text-muted">This will be shown in the customer My Orders screen.</p>
                )}
              </section>

              <section className="border border-line bg-surface p-4 sm:p-5">
                <p className="font-bold text-muted">Customer feedback</p>
                {selectedOrder.feedback ? (
                  <div className="mt-2">
                    <p className="text-sm font-extrabold text-ink">{selectedOrder.feedback.rating} / 5 stars</p>
                    {selectedOrder.feedback.message ? (
                      <p className="mt-2 whitespace-pre-wrap font-semibold leading-6 text-ink">{selectedOrder.feedback.message}</p>
                    ) : (
                      <p className="mt-2 text-sm font-semibold text-muted">No written feedback.</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-1 font-semibold text-muted">Feedback not submitted.</p>
                )}
              </section>
            </aside>
          </div>
        </section>
      ) : loading && orders.length === 0 ? (
        <div className="grid gap-4">
          <div className="h-96 animate-pulse bg-canvas" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex min-h-96 items-center justify-center border border-line bg-surface px-5 text-center">
          <div>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-canvas text-signal">
              <PackageCheck className="h-7 w-7" />
            </div>
            <p className="mt-4 text-xl font-bold text-ink">No orders yet</p>
            <p className="mt-2 text-sm font-medium text-muted">Incoming customer orders will appear here.</p>
          </div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex min-h-72 items-center justify-center border border-line bg-surface px-5 text-center">
          <div>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-canvas text-signal">
              <PackageCheck className="h-7 w-7" />
            </div>
            <p className="mt-4 text-xl font-bold text-ink">No {getStatusLabel(statusFilter).toLowerCase()} orders</p>
            <p className="mt-2 text-sm font-medium text-muted">Choose another status filter to continue tracking orders.</p>
          </div>
        </div>
      ) : (
        <div className="min-w-0">
          <section className="min-w-0 overflow-hidden border border-line bg-surface">
            <div className="hidden min-w-[900px] grid-cols-[150px_1.2fr_140px_120px_130px_120px_44px] border-b border-line bg-canvas px-4 py-4 text-xs font-extrabold uppercase tracking-[0.12em] text-muted md:grid">
              <span>Order</span>
              <span>Customer</span>
              <span>Total</span>
              <span>Payment</span>
              <span>Status</span>
              <span>Date</span>
              <span />
            </div>

            <div className="divide-y divide-line">
              {filteredOrders.map((order) => {
                const active = selectedOrder?.id === order.id

                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedOrderId(order.id)}
                    className={[
                      'grid w-full gap-3 px-4 py-4 text-left transition-colors md:min-w-[900px] md:grid-cols-[150px_1.2fr_140px_120px_130px_120px_44px] md:items-center',
                      active ? 'bg-[#fff8ef]' : 'bg-surface hover:bg-canvas/70',
                    ].join(' ')}
                  >
                    <div>
                      <p className="text-sm font-extrabold text-ink">{order.orderNumber}</p>
                      <p className="mt-1 text-xs font-semibold text-muted">{order.items?.length ?? 0} items</p>
                      {order.trackingId ? <p className="mt-1 truncate text-[11px] font-bold text-[#8a5f2f]">Track: {order.trackingId}</p> : null}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-ink">{order.customerName}</p>
                      <p className="mt-1 truncate text-xs font-semibold text-muted">{order.phoneNumber}</p>
                    </div>
                    <p className="text-sm font-extrabold text-ink">{formatPrice(order.grandTotalAmount ?? order.subtotalAmount)}</p>
                    <span className={`w-fit rounded-full px-3 py-1 text-xs font-extrabold ${order.payment?.status === 'success' ? 'bg-[#e9fff2] text-[#0f8b4c]' : 'bg-[#fff1f1] text-[#b42318]'}`}>
                      {formatPaymentLabel(order.payment)}
                    </span>
                    <span className={`w-fit rounded-full px-3 py-1 text-xs font-extrabold ${STATUS_STYLES[order.status] ?? 'bg-canvas text-ink'}`}>
                      {getStatusLabel(order.status)}
                    </span>
                    <p className="text-xs font-semibold text-muted">{formatDate(order.createdAt)}</p>
                    <ChevronRight className="hidden h-5 w-5 justify-self-end text-muted md:block" />
                  </button>
                )
              })}
            </div>
          </section>

          <aside className="hidden">
            {selectedOrder ? (
              <>
                <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
                  <div>
                    <p className="text-sm font-bold text-muted">Order details</p>
                    <h2 className="mt-1 text-2xl font-extrabold text-ink">{selectedOrder.orderNumber}</h2>
                    <p className="mt-1 text-xs font-semibold text-muted">{formatDate(selectedOrder.createdAt)}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${STATUS_STYLES[selectedOrder.status] ?? 'bg-canvas text-ink'}`}>
                    {getStatusLabel(selectedOrder.status)}
                  </span>
                </div>

                <div className="grid gap-3 border-b border-line py-4 text-sm">
                  {selectedOrder.payment ? (
                    <div className="rounded-2xl border border-[#d7eedf] bg-[#f3fff7] px-4 py-3">
                      <p className="text-sm font-extrabold text-[#0f8b4c]">Payment success</p>
                      <p className="mt-1 break-all text-xs font-semibold text-muted">Payment ID: <span className="text-ink">{selectedOrder.payment.providerPaymentId}</span></p>
                      <p className="mt-1 break-all text-xs font-semibold text-muted">Order ID: <span className="text-ink">{selectedOrder.payment.providerOrderId}</span></p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-[#ffd6cc] bg-[#fff7f2] px-4 py-3 text-sm font-extrabold text-signal">
                      Payment record not found.
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-muted">Customer</p>
                    <p className="mt-1 font-extrabold text-ink">{selectedOrder.customerName}</p>
                    {selectedOrder.customer?.id ? (
                      <p className="mt-1 break-all text-xs font-semibold text-muted">Customer ID: <span className="text-ink">{selectedOrder.customer.id}</span></p>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <div>
                      <p className="font-bold text-muted">Phone</p>
                      <p className="mt-1 font-extrabold text-ink">{selectedOrder.phoneNumber}</p>
                    </div>
                    {selectedOrder.whatsappNumber ? (
                      <div>
                        <p className="font-bold text-muted">WhatsApp</p>
                        <p className="mt-1 font-extrabold text-ink">{selectedOrder.whatsappNumber}</p>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedOrder.phoneNumber ? (
                      <a
                        href={`tel:${selectedOrder.phoneNumber}`}
                        className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-extrabold text-ink transition-colors hover:border-signal hover:text-signal"
                      >
                        <Phone className="h-4 w-4" />
                        Call
                      </a>
                    ) : null}
                    {getWhatsappUrl(selectedOrder) ? (
                      <a
                        href={getWhatsappUrl(selectedOrder)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 items-center gap-2 rounded-full border border-[#d7eedf] px-4 text-sm font-extrabold text-[#0f8b4c] transition-colors hover:bg-[#e9fff2]"
                      >
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp
                      </a>
                    ) : null}
                  </div>
                  <div>
                    <p className="font-bold text-muted">Address</p>
                    <p className="mt-1 whitespace-pre-wrap font-semibold leading-6 text-ink">{selectedOrder.deliveryAddress}</p>
                    {[selectedOrder.deliveryDistrict, selectedOrder.deliveryState].filter(Boolean).length > 0 ? (
                      <p className="mt-1 text-sm font-extrabold text-ink">
                        {[selectedOrder.deliveryDistrict, selectedOrder.deliveryState].filter(Boolean).join(', ')}
                      </p>
                    ) : null}
                    {selectedOrder.deliveryPincode ? (
                      <p className="mt-1 text-sm font-extrabold text-ink">PIN: {selectedOrder.deliveryPincode}</p>
                    ) : null}
                  </div>
                  <div>
                    <p className="font-bold text-muted">Billing</p>
                    {selectedOrder.billingSameAsShipping !== false ? (
                      <p className="mt-1 font-semibold text-ink">Same as shipping address</p>
                    ) : (
                      <div className="mt-1 space-y-1 font-semibold leading-6 text-ink">
                        <p>{selectedOrder.billingName}</p>
                        <p className="whitespace-pre-wrap">{selectedOrder.billingAddress}</p>
                        <p>{[selectedOrder.billingCity, selectedOrder.billingState, selectedOrder.billingPincode].filter(Boolean).join(', ')}</p>
                        {selectedOrder.billingPhone ? <p>Phone: {selectedOrder.billingPhone}</p> : null}
                      </div>
                    )}
                  </div>
                  {selectedOrder.customerNotes ? (
                    <div>
                      <p className="font-bold text-muted">Notes</p>
                      <p className="mt-1 whitespace-pre-wrap font-semibold leading-6 text-ink">{selectedOrder.customerNotes}</p>
                    </div>
                  ) : null}
                  <div>
                    <p className="font-bold text-muted">Customer feedback</p>
                    {selectedOrder.feedback ? (
                      <div className="mt-2 rounded-2xl border border-line bg-lifted px-4 py-3">
                        <p className="text-sm font-extrabold text-ink">{selectedOrder.feedback.rating} / 5 stars</p>
                        {selectedOrder.feedback.message ? (
                          <p className="mt-2 whitespace-pre-wrap font-semibold leading-6 text-ink">{selectedOrder.feedback.message}</p>
                        ) : (
                          <p className="mt-2 text-sm font-semibold text-muted">No written feedback.</p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-1 font-semibold text-muted">Feedback not submitted.</p>
                    )}
                  </div>
                </div>

                <div className="border-b border-line py-4">
                  <p className="text-sm font-bold text-muted">Items</p>
                  <div className="mt-3 divide-y divide-line">
                    {(selectedOrder.items ?? []).map((item) => (
                      <div key={item.id} className="flex gap-3 py-3">
                        <div className="h-16 w-14 shrink-0 overflow-hidden bg-canvas">
                          {item.productImageUrl ? (
                            <img src={item.productImageUrl} alt="" className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-extrabold uppercase leading-5 text-ink">{item.productName}</p>
                          <p className="mt-1 text-xs font-semibold text-muted">{[item.weightLabel, `Qty ${item.quantity}`].filter(Boolean).join(' | ')}</p>
                        </div>
                        <p className="text-sm font-extrabold text-ink">{formatPrice(item.lineTotal)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-line pt-4 text-base font-extrabold text-ink">
                    <span>Products total</span>
                    <span>{formatPrice(selectedOrder.subtotalAmount)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm font-bold text-muted">
                    <span>Delivery charge</span>
                    <span>{formatPrice(selectedOrder.deliveryCharge ?? 0)}</span>
                  </div>
                  {(selectedOrder.discountAmount ?? 0) > 0 ? (
                    <div className="mt-2 flex items-center justify-between text-sm font-bold text-[#0f8b4c]">
                      <span>Discount {selectedOrder.discountCode ? `(${selectedOrder.discountCode})` : ''}</span>
                      <span>-{formatPrice(selectedOrder.discountAmount)}</span>
                    </div>
                  ) : null}
                  <div className="mt-2 flex items-center justify-between text-base font-extrabold text-ink">
                    <span>Total</span>
                    <span>{formatPrice(selectedOrder.grandTotalAmount ?? selectedOrder.subtotalAmount)}</span>
                  </div>
                </div>

                <div className="pt-4">
                  <label className="text-sm font-bold text-muted" htmlFor="order-status">Update status</label>
                  <select
                    id="order-status"
                    value={selectedOrder.status}
                    onChange={(event) => updateStatus(selectedOrder.id, event.target.value)}
                    disabled={statusUpdating === selectedOrder.id}
                    className="mt-2 h-12 w-full border border-line bg-lifted px-3 text-sm font-extrabold text-ink outline-none focus:border-ink disabled:opacity-60"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  {statusUpdating === selectedOrder.id ? (
                    <p className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-muted">
                      <CheckCircle2 className="h-4 w-4" />
                      Updating status
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}
          </aside>
        </div>
      )}
    </div>
  )
}
