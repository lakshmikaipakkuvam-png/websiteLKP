import { useEffect, useRef, useState } from 'react'
import { Pencil, Trash2, X } from 'lucide-react'
import { IconImage, IconPlus, IconTrash, IconChevronDown, IconBox } from '../components/icons'
import AppLoader from '../components/AppLoader'

const inputClass =
  'w-full border-0 border-b-2 border-line bg-transparent px-0 py-3 text-base text-ink placeholder:text-dust focus:border-ink focus:outline-none transition-colors sm:text-lg'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:4000/api'
const MAX_PRODUCT_IMAGES = 8

async function readApiJson(response, fallbackMessage = 'The server returned an invalid response.') {
  const body = await response.text()

  if (!body) {
    return {}
  }

  try {
    return JSON.parse(body)
  } catch {
    throw new Error(fallbackMessage)
  }
}

function Field({ label, hint, children, span, required }) {
  return (
    <div className={span ? 'sm:col-span-2' : undefined}>
      <div className="mb-2.5 flex items-baseline justify-between">
        <label className="text-sm font-semibold tracking-tight text-ink sm:text-base">
          {label}
          {required ? <span className="text-signal"> *</span> : null}
        </label>
        {hint ? <span className="text-sm font-medium text-dust">{hint}</span> : null}
      </div>
      {children}
    </div>
  )
}

function SectionHeading({ children }) {
  return (
    <h2 className="mb-7 text-xl font-bold text-ink sm:text-2xl">{children}</h2>
  )
}

function ConfirmationModal({ open, title, message, confirmLabel = 'Delete', busy = false, onCancel, onConfirm }) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 backdrop-blur-[2px]" onClick={onCancel}>
      <section
        className="w-full max-w-md border border-line bg-surface p-6 shadow-lift"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-signal">Confirm action</p>
            <h2 id="confirmation-title" className="mt-2 text-2xl font-bold tracking-tight text-ink">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="text-ink transition-colors hover:text-signal disabled:opacity-50"
            aria-label="Close confirmation"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <p className="mt-4 text-base leading-7 text-muted">{message}</p>
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-11 border border-line px-5 text-sm font-bold text-ink transition-colors hover:border-ink disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="h-11 bg-signal px-5 text-sm font-bold text-white transition-colors hover:bg-clay disabled:opacity-60"
          >
            {busy ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}

const TABS = [
  { id: 'create', step: 1, label: 'Create new product' },
  { id: 'published', step: 2, label: 'Available products' },
  { id: 'draft', step: 3, label: 'Draft products' },
  { id: 'combo', step: 4, label: 'Combo offers' },
]

function Stepper({ activeTab, onSelect }) {
  return (
    <div className="mb-7 grid w-full grid-cols-[auto_minmax(24px,1fr)_auto_minmax(24px,1fr)_auto_minmax(24px,1fr)_auto] items-center gap-x-4 sm:mb-9 sm:gap-x-5 lg:gap-x-7">
      {TABS.map((tab, index) => (
        <div key={tab.id} className="contents">
          <button
            type="button"
            onClick={() => onSelect(tab.id)}
            className="flex min-w-0 items-center gap-2 text-left"
          >
            <span
              className={[
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold sm:h-9 sm:w-9 sm:text-sm',
                activeTab === tab.id ? 'bg-yellow text-ink' : 'bg-canvas text-ink/50',
              ].join(' ')}
            >
              {tab.step}
            </span>
            <span
              className={[
                'min-w-0 text-xs font-semibold leading-tight sm:text-sm xl:whitespace-nowrap',
                activeTab === tab.id ? 'text-ink' : 'text-ink/50',
              ].join(' ')}
            >
              {tab.label}
            </span>
          </button>
          {index < TABS.length - 1 ? (
            <span key={`${tab.id}-connector`} className="h-0.5 min-w-4 bg-yellow" aria-hidden="true" />
          ) : null}
        </div>
      ))}
    </div>
  )
}

const PRODUCT_TAGS = [
  { id: 'best-sellers', label: 'Best Sellers' },
  { id: 'new-arrivals', label: 'New Arrivals' },
  { id: 'current-offers', label: 'Current Offers' },
]
const OFFER_TYPES = [
  { value: 'none', label: 'Regular' },
  { value: 'limited_time', label: 'Limited time' },
  { value: 'festival', label: 'Festival' },
]
const OFFER_TYPE_VALUES = new Set(OFFER_TYPES.map((offerType) => offerType.value))

function CategoryDropdown({ categories, value, onChange, onDelete }) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)
  const selected = categories.find((category) => category.id === value)

  useEffect(() => {
    function handlePointerDown(event) {
      if (!dropdownRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  return (
    <div ref={dropdownRef} className="relative">
      <input type="hidden" name="category" value={value} />
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={[
          inputClass,
          'flex items-center justify-between gap-4 pr-0 text-left',
          selected ? 'text-ink' : 'text-dust',
        ].join(' ')}
      >
        <span>{selected?.label ?? 'Select a category'}</span>
        <IconChevronDown
          className={[
            'h-5 w-5 shrink-0 text-muted transition-transform',
            open ? 'rotate-180' : '',
          ].join(' ')}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-3 overflow-hidden border-2 border-line bg-surface shadow-card"
        >
          {categories.length === 0 ? (
            <div className="px-4 py-5 text-base font-bold text-muted">
              Add a category first
            </div>
          ) : null}
          {categories.map((category) => {
            const active = category.id === value
            return (
              <div
                key={category.id}
                role="option"
                aria-selected={active}
                className={[
                  'grid grid-cols-[1fr_44px] items-center transition-colors hover:bg-canvas',
                  active ? 'bg-yellow text-ink' : 'text-ink',
                ].join(' ')}
              >
                <button
                  type="button"
                  onClick={() => {
                    onChange(category.id)
                    setOpen(false)
                  }}
                  className="min-w-0 px-4 py-3 text-left text-base font-bold"
                >
                  {category.label}
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onDelete(category.id)
                  }}
                  className="flex h-10 w-10 items-center justify-center text-signal hover:text-clay"
                  aria-label={`Delete ${category.label}`}
                >
                  <Trash2 className="h-5 w-5" strokeWidth={2.2} />
                </button>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function SubcategoryDropdown({ subcategories, value, onChange, onDelete, disabled }) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)
  const selected = subcategories.find((subcategory) => subcategory.id === value)

  useEffect(() => {
    function handlePointerDown(event) {
      if (!dropdownRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  return (
    <div ref={dropdownRef} className="relative">
      <input type="hidden" name="subcategory" value={value} />
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={[
          inputClass,
          'flex items-center justify-between gap-4 pr-0 text-left disabled:cursor-not-allowed disabled:text-dust',
          selected ? 'text-ink' : 'text-dust',
        ].join(' ')}
      >
        <span>{selected?.label ?? (disabled ? 'Select category first' : 'Select a subcategory')}</span>
        <IconChevronDown className={['h-5 w-5 shrink-0 text-muted transition-transform', open ? 'rotate-180' : ''].join(' ')} />
      </button>

      {open && !disabled ? (
        <div role="listbox" className="absolute left-0 right-0 top-full z-20 mt-3 overflow-hidden border-2 border-line bg-surface shadow-card">
          {subcategories.length === 0 ? (
            <div className="px-4 py-5 text-base font-bold text-muted">Add a subcategory first</div>
          ) : null}
          {subcategories.map((subcategory) => {
            const active = subcategory.id === value
            return (
              <div key={subcategory.id} role="option" aria-selected={active} className={['grid grid-cols-[1fr_44px] items-center transition-colors hover:bg-canvas', active ? 'bg-yellow text-ink' : 'text-ink'].join(' ')}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(subcategory.id)
                    setOpen(false)
                  }}
                  className="min-w-0 px-4 py-3 text-left text-base font-bold"
                >
                  {subcategory.label}
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onDelete(subcategory.id)
                  }}
                  className="flex h-10 w-10 items-center justify-center text-signal hover:text-clay"
                  aria-label={`Delete ${subcategory.label}`}
                >
                  <Trash2 className="h-5 w-5" strokeWidth={2.2} />
                </button>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function WeightUnitRadio({ value, onChange }) {
  return (
    <div className="flex h-[52px] items-center gap-5">
      {[
        { value: 'gram', label: 'gram' },
        { value: 'kg', label: 'Kg' },
      ].map((unit) => {
        const active = value === unit.value

        return (
          <label key={unit.value} className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink sm:text-base">
            <input
              type="radio"
              name="weightUnit"
              value={unit.value}
              checked={active}
              onChange={() => onChange(unit.value)}
              className="h-4 w-4 accent-yellow sm:h-5 sm:w-5"
            />
            {unit.label}
          </label>
        )
      })}
    </div>
  )
}

function OfferTypeRadio({ value, onChange, name }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {OFFER_TYPES.map((offerType) => {
        const active = value === offerType.value

        return (
          <label
            key={offerType.value}
            className={[
              'flex cursor-pointer items-center gap-2 py-1 text-sm font-semibold transition-colors',
              active ? 'text-ink' : 'text-muted hover:text-ink',
            ].join(' ')}
          >
            <input
              type="radio"
              name={name}
              value={offerType.value}
              checked={active}
              onChange={() => onChange(offerType.value)}
              className="h-4 w-4 accent-yellow"
            />
            <span>{offerType.label}</span>
          </label>
        )
      })}
    </div>
  )
}

function getCategoryLabel(category) {
  const selected = typeof category === 'string' ? category : category?.selected
  const selectedSubcategory = typeof category === 'string' ? '' : category?.subcategorySelected
  return [selected, selectedSubcategory].filter(Boolean).join(' / ') || '-'
}

function getPlacementLabels(productPlacement = {}) {
  return PRODUCT_TAGS
    .filter((tag) => productPlacement[tag.id.replaceAll('-', '_')])
    .map((tag) => tag.label)
}

function getOfferTypeLabel(offerType) {
  return OFFER_TYPES.find((item) => item.value === offerType)?.label ?? 'Regular'
}

function getSafeOfferType(value, fallback = 'none') {
  return OFFER_TYPE_VALUES.has(value) ? value : fallback
}

function formatQuantity(product) {
  const quantity = product.weightQtyFloat ?? product.weightQtyInteger

  if (quantity === null || quantity === undefined) {
    return '-'
  }

  return `${quantity} ${product.weightUnit === 'kg' ? 'Kg' : 'gram'}`
}

function ProductsTable({
  products,
  loading,
  error,
  emptyTitle,
  emptyDescription,
  onEdit,
  onDelete,
  onToggleActive,
  busyProductId,
}) {
  const PAGE_SIZE = 10
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageProducts = products.slice(pageStart, pageStart + PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [products.length])

  if (loading) {
    return <section className="min-h-[360px] border-t-2 border-line pt-12" />
  }

  if (error) {
    return (
      <section className="flex min-h-[360px] flex-col items-center justify-center gap-2 border-t-2 border-line pt-12 text-center">
        <h2 className="text-2xl font-bold tracking-[-0.02em] text-signal">Unable to load products</h2>
        <p className="text-base text-muted">{error}</p>
      </section>
    )
  }

  if (products.length === 0) {
    return (
      <section className="flex min-h-[420px] flex-col items-center justify-center gap-2 border-t-2 border-line pt-12 text-center">
        <h2 className="text-2xl font-bold tracking-[-0.02em] text-ink">{emptyTitle}</h2>
        <p className="text-base text-muted">{emptyDescription}</p>
      </section>
    )
  }

  return (
    <section className="border-t-2 border-line pt-8">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-[-0.02em] text-ink">Available products</h2>
        <span className="text-sm font-bold text-muted">
          Showing {pageStart + 1}-{Math.min(pageStart + PAGE_SIZE, products.length)} of {products.length} products
        </span>
      </div>

      <div className="overflow-x-auto border border-line bg-surface">
        <table className="min-w-[1080px] border-collapse text-left">
          <thead className="bg-canvas">
            <tr className="border-b border-line text-xs font-bold uppercase tracking-[0.06em] text-muted">
              <th className="w-[300px] px-5 py-4">Product</th>
              <th className="w-[170px] px-5 py-4">Category</th>
              <th className="w-[110px] px-5 py-4">Qty</th>
              <th className="w-[105px] px-5 py-4">Stock</th>
              <th className="w-[120px] px-5 py-4">MRP</th>
              <th className="w-[160px] px-5 py-4">Placement</th>
              <th className="sticky right-[100px] z-10 w-[100px] bg-canvas px-4 py-4 text-center shadow-[-12px_0_20px_rgba(20,20,19,0.04)]">Status</th>
              <th className="sticky right-0 z-10 w-[100px] bg-canvas px-4 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageProducts.map((product) => {
              const imageUrl = product.imageUrls?.[0]
              const placementLabels = getPlacementLabels(product.productPlacement)

              return (
                <tr key={product.id} className="border-b border-line last:border-b-0">
                  <td className="px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden bg-canvas">
                        {imageUrl ? (
                          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-semibold leading-snug text-ink">{product.productName}</p>
                        <p className="mt-1 text-sm leading-snug text-muted">{product.description ?? '-'}</p>
                        {product.offerType && product.offerType !== 'none' ? (
                          <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.08em] text-signal">{getOfferTypeLabel(product.offerType)}</p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-base font-semibold leading-snug text-ink">{getCategoryLabel(product.category)}</td>
                  <td className="px-5 py-4 text-base text-muted">{formatQuantity(product)}</td>
                  <td className="px-5 py-4 text-base text-muted">{product.stockNumber ?? '-'}</td>
                  <td className="px-5 py-4 text-base font-semibold text-ink">Rs. {product.price ?? '-'}</td>
                  <td className="px-5 py-4">
                    {placementLabels.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {placementLabels.map((label) => (
                          <span key={label} className="text-sm font-bold text-ink">
                            {label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-base text-muted">-</span>
                    )}
                  </td>
                  <td className="sticky right-[100px] bg-surface px-4 py-4 text-center shadow-[-12px_0_20px_rgba(20,20,19,0.04)]">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={product.active}
                      disabled={busyProductId === product.id}
                      onClick={() => onToggleActive(product)}
                      className={[
                        'relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60',
                        product.active ? 'bg-yellow' : 'bg-line',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'absolute left-1 top-1 h-5 w-5 rounded-full bg-surface shadow-card transition-transform',
                          product.active ? 'translate-x-5' : 'translate-x-0',
                        ].join(' ')}
                      />
                    </button>
                  </td>
                  <td className="sticky right-0 bg-surface px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(product)}
                        className="flex h-10 w-10 items-center justify-center text-ink hover:text-signal"
                        aria-label={`Edit ${product.productName}`}
                      >
                        <Pencil className="h-5 w-5" strokeWidth={2.2} />
                      </button>
                      <button
                        type="button"
                        disabled={busyProductId === product.id}
                        onClick={() => onDelete(product)}
                        className="flex h-10 w-10 items-center justify-center text-signal hover:text-clay disabled:opacity-60"
                        aria-label={`Delete ${product.productName}`}
                      >
                        <Trash2 className="h-5 w-5" strokeWidth={2.2} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 ? (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-muted">Page {currentPage} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={currentPage === 1}
              className="h-10 border border-line px-4 text-sm font-bold text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:text-dust"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={currentPage === totalPages}
              className="h-10 border border-line px-4 text-sm font-bold text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:text-dust"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function ComboOffersManager() {
  const [products, setProducts] = useState([])
  const [comboOffers, setComboOffers] = useState([])
  const [selectedProductIds, setSelectedProductIds] = useState([])
  const [image, setImage] = useState(null)
  const [comboOfferType, setComboOfferType] = useState('none')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busyComboId, setBusyComboId] = useState('')
  const [comboPendingDelete, setComboPendingDelete] = useState(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  async function loadComboData() {
    setLoading(true)
    setError('')

    try {
      const [productsResponse, combosResponse] = await Promise.all([
        fetch(`${API_URL}/products`),
        fetch(`${API_URL}/combo-offers`),
      ])
      const productsResult = await readApiJson(productsResponse, 'Products API returned an invalid response.')
      const combosResult = await readApiJson(combosResponse, 'Combo offers API returned an invalid response.')

      if (!productsResponse.ok) {
        throw new Error(productsResult.error ?? 'Products could not be loaded.')
      }

      if (!combosResponse.ok) {
        throw new Error(combosResult.error ?? 'Combo offers could not be loaded.')
      }

      setProducts((productsResult.products ?? []).filter((product) => product.active && !product.draft))
      setComboOffers(combosResult.comboOffers ?? [])
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadComboData()
  }, [])

  function toggleComboProduct(productId) {
    setSelectedProductIds((ids) => (
      ids.includes(productId) ? ids.filter((id) => id !== productId) : [...ids, productId]
    ))
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || !file.type.startsWith('image/')) {
      return
    }

    if (image?.url) {
      URL.revokeObjectURL(image.url)
    }

    setImage({
      file,
      url: URL.createObjectURL(file),
    })
  }

  async function uploadComboImage() {
    if (!image?.file) {
      return []
    }

    const formData = new FormData()
    formData.append('images', image.file)

    const response = await fetch(`${API_URL}/product-images`, {
      method: 'POST',
      body: formData,
    })
    const result = await readApiJson(response, 'Image upload API returned an invalid response.')

    if (!response.ok) {
      throw new Error(result.error ?? 'Unable to upload combo image.')
    }

    return result.imageUrls ?? []
  }

  async function saveComboOffer(form, draft) {
    setSaving(true)
    setError('')
    setStatus('')

    try {
      const formData = new FormData(form)
      const imageUrls = await uploadComboImage()
      const payload = {
        comboName: formData.get('comboName')?.trim() ?? '',
        description: formData.get('description')?.trim() ?? '',
        comboPrice: formData.get('comboPrice')?.trim() ?? '',
        offerType: getSafeOfferType(formData.get('comboOfferType'), comboOfferType),
        productIds: selectedProductIds,
        imageUrls,
        active: true,
      }

      const response = await fetch(`${API_URL}${draft ? '/combo-offers/drafts' : '/combo-offers'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await readApiJson(response, 'Combo offer API returned an invalid response.')

      if (!response.ok) {
        const details = result.details ? Object.values(result.details).join(' ') : ''
        throw new Error(details || result.error || 'Combo offer could not be saved.')
      }

      setComboOffers((offers) => [result.comboOffer, ...offers])
      setSelectedProductIds([])
      setComboOfferType('none')
      setImage(null)
      form.reset()
      setStatus(draft ? 'Combo draft saved successfully.' : 'Combo offer published successfully.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleComboSubmit(event) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)

    if (!formData.get('comboName')?.trim() || !formData.get('description')?.trim() || !formData.get('comboPrice')?.trim() || selectedProductIds.length < 2 || !image) {
      setError('Combo name, description, price, image, and at least two products are required.')
      return
    }

    await saveComboOffer(event.currentTarget, false)
  }

  async function handleComboDraft(event) {
    await saveComboOffer(event.currentTarget.form, true)
  }

  async function toggleComboActive(comboOffer) {
    setBusyComboId(comboOffer.id)
    setError('')

    try {
      const response = await fetch(`${API_URL}/combo-offers/${comboOffer.id}/active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !comboOffer.active }),
      })
      const result = await readApiJson(response, 'Combo offer status API returned an invalid response.')

      if (!response.ok) {
        throw new Error(result.error ?? 'Combo offer status could not be updated.')
      }

      setComboOffers((offers) => offers.map((offer) => (offer.id === comboOffer.id ? result.comboOffer : offer)))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyComboId('')
    }
  }

  function requestDeleteComboOffer(comboOffer) {
    setComboPendingDelete(comboOffer)
  }

  async function confirmDeleteComboOffer() {
    if (!comboPendingDelete) {
      return
    }

    const comboOffer = comboPendingDelete
    setBusyComboId(comboOffer.id)
    setError('')

    try {
      const response = await fetch(`${API_URL}/combo-offers/${comboOffer.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await readApiJson(response, 'Combo offer delete API returned an invalid response.')
        throw new Error(result.error ?? 'Combo offer could not be deleted.')
      }

      setComboOffers((offers) => offers.filter((offer) => offer.id !== comboOffer.id))
      setComboPendingDelete(null)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyComboId('')
    }
  }

  return (
    <section className="border-t-2 border-line pt-8">
      <AppLoader active={loading || saving || Boolean(busyComboId)} label="Processing combo offer" />
      <form className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.75fr)]" onSubmit={handleComboSubmit}>
        <div>
          <SectionHeading>Create combo offer</SectionHeading>
          <div className="grid grid-cols-1 gap-x-8 gap-y-7 sm:grid-cols-2">
            <Field label="Combo name" required>
              <input name="comboName" type="text" placeholder="e.g. Sambal Combo Pack" className={inputClass} />
            </Field>
            <Field label="Combo price" required>
              <input name="comboPrice" type="text" inputMode="numeric" pattern="[0-9]*" placeholder="Enter combo price" className={inputClass} />
            </Field>
            <div className="sm:col-span-2">
              <p className="mb-3 text-sm font-semibold text-ink sm:text-base">Offer type</p>
              <OfferTypeRadio name="comboOfferType" value={comboOfferType} onChange={setComboOfferType} />
            </div>
            <Field label="Description" span required>
              <textarea name="description" rows={3} placeholder="Describe what is included in this combo" className={`${inputClass} resize-none`} />
            </Field>
            <div className="sm:col-span-2">
              <p className="mb-3 text-sm font-semibold text-ink sm:text-base">Combo image <span className="text-signal">*</span></p>
              <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center border-2 border-dashed border-line bg-surface p-5 text-center hover:border-ink">
                {image ? (
                  <img src={image.url} alt="" className="h-40 w-full object-cover" />
                ) : (
                  <>
                    <IconImage className="h-8 w-8 text-muted" />
                    <span className="mt-2 text-sm font-semibold text-muted">Upload combo image</span>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleImageChange} className="sr-only" />
              </label>
            </div>
          </div>
        </div>

        <div>
          <SectionHeading>Select products</SectionHeading>
          <div className="max-h-[420px] overflow-y-auto border border-line bg-surface">
            {products.length === 0 ? (
              <p className="p-5 text-sm font-semibold text-muted">No active products available for combo offers.</p>
            ) : null}
            {products.map((product) => (
              <label key={product.id} className="flex cursor-pointer items-center gap-3 border-b border-line p-4 last:border-b-0 hover:bg-canvas">
                <input
                  type="checkbox"
                  checked={selectedProductIds.includes(product.id)}
                  onChange={() => toggleComboProduct(product.id)}
                  className="h-5 w-5 accent-signal"
                />
                <div className="h-12 w-12 shrink-0 overflow-hidden bg-canvas">
                  {product.imageUrls?.[0] ? <img src={product.imageUrls[0]} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{product.productName}</p>
                  <p className="text-xs font-semibold text-muted">Rs. {product.offerPrice && product.offerPrice < product.price ? product.offerPrice : product.price}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button type="button" disabled={saving} onClick={handleComboDraft} className="rounded-none bg-yellow px-4 py-2.5 text-sm font-semibold text-ink hover:bg-yellow-dark">
              Save draft
            </button>
            <button type="submit" disabled={saving} className="rounded-none bg-yellow px-4 py-2.5 text-sm font-semibold text-ink hover:bg-yellow-dark">
              Publish combo
            </button>
          </div>
          {error ? <p className="mt-3 text-sm font-bold text-signal">{error}</p> : null}
          {status ? <p className="mt-3 text-sm font-bold text-ink/70">{status}</p> : null}
        </div>
      </form>

      <div className="mt-10">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-2xl font-bold tracking-[-0.02em] text-ink">Combo offers</h2>
          <span className="text-sm font-bold text-muted">{comboOffers.length} combo offers</span>
        </div>
        <div className="overflow-x-auto border border-line bg-surface">
          <table className="min-w-[840px] border-collapse text-left">
            <thead className="bg-canvas">
              <tr className="border-b border-line text-xs font-bold uppercase tracking-[0.06em] text-muted">
                <th className="px-5 py-4">Combo</th>
                <th className="px-5 py-4">Products</th>
                <th className="px-5 py-4">Price</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {comboOffers.map((comboOffer) => (
                <tr key={comboOffer.id} className="border-b border-line last:border-b-0">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden bg-canvas">
                        {comboOffer.imageUrls?.[0] ? <img src={comboOffer.imageUrls[0]} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
                      <div>
                        <p className="text-base font-semibold text-ink">{comboOffer.comboName}</p>
                        <p className="text-sm text-muted">{comboOffer.description}</p>
                        {comboOffer.offerType && comboOffer.offerType !== 'none' ? (
                          <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.08em] text-signal">{getOfferTypeLabel(comboOffer.offerType)}</p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-base text-muted">{comboOffer.items?.length ?? 0}</td>
                  <td className="px-5 py-4 text-base font-semibold text-ink">Rs. {comboOffer.comboPrice ?? '-'}</td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={comboOffer.active}
                      disabled={busyComboId === comboOffer.id}
                      onClick={() => toggleComboActive(comboOffer)}
                      className={[
                        'relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60',
                        comboOffer.active ? 'bg-yellow' : 'bg-line',
                      ].join(' ')}
                    >
                      <span className={[
                        'absolute left-1 top-1 h-5 w-5 rounded-full bg-surface shadow-card transition-transform',
                        comboOffer.active ? 'translate-x-5' : 'translate-x-0',
                      ].join(' ')}
                      />
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={busyComboId === comboOffer.id}
                        onClick={() => requestDeleteComboOffer(comboOffer)}
                        className="flex h-10 w-10 items-center justify-center text-signal hover:text-clay disabled:opacity-60"
                        aria-label={`Delete ${comboOffer.comboName}`}
                      >
                        <Trash2 className="h-5 w-5" strokeWidth={2.2} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmationModal
        open={Boolean(comboPendingDelete)}
        title="Delete combo offer?"
        message={`Delete "${comboPendingDelete?.comboName ?? 'this combo offer'}"? This cannot be undone.`}
        busy={Boolean(busyComboId)}
        onCancel={() => setComboPendingDelete(null)}
        onConfirm={confirmDeleteComboOffer}
      />
    </section>
  )
}

export default function CreateProduct() {
  const [activeTab, setActiveTab] = useState('create')
  const [images, setImages] = useState([])
  const [tags, setTags] = useState([])
  const [categories, setCategories] = useState([])
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [, setCategoryLoading] = useState(false)
  const [categorySaving, setCategorySaving] = useState(false)
  const [categoryError, setCategoryError] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategoryLabel, setNewCategoryLabel] = useState('')
  const [addingSubcategory, setAddingSubcategory] = useState(false)
  const [newSubcategoryLabel, setNewSubcategoryLabel] = useState('')
  const [weightUnit, setWeightUnit] = useState('')
  const [offerType, setOfferType] = useState('none')
  const [editingProduct, setEditingProduct] = useState(null)
  const [formVersion, setFormVersion] = useState(0)
  const [submitError, setSubmitError] = useState('')
  const [submitStatus, setSubmitStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [availableProducts, setAvailableProducts] = useState([])
  const [availableLoading, setAvailableLoading] = useState(false)
  const [availableError, setAvailableError] = useState('')
  const [busyProductId, setBusyProductId] = useState('')
  const [productPendingDelete, setProductPendingDelete] = useState(null)
  const dbBusy = saving || categorySaving || availableLoading || Boolean(busyProductId)

  useEffect(() => {
    let cancelled = false

    async function loadCategories() {
      setCategoryLoading(true)
      setCategoryError('')

      try {
        const response = await fetch(`${API_URL}/categories`)
        const result = await readApiJson(response, 'Categories API returned an invalid response.')

        if (!response.ok) {
          throw new Error(result.error ?? 'Categories could not be loaded.')
        }

        if (!cancelled) {
          setCategories((result.categories ?? []).map((item) => ({
            id: item.id,
            label: item.name,
            slug: item.slug,
            subcategories: (item.subcategories ?? []).map((subcategoryItem) => ({
              id: subcategoryItem.id,
              label: subcategoryItem.name,
              slug: subcategoryItem.slug,
            })),
          })))
        }
      } catch (error) {
        if (!cancelled) {
          setCategoryError(error.message)
        }
      } finally {
        if (!cancelled) {
          setCategoryLoading(false)
        }
      }
    }

    loadCategories()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (activeTab !== 'published') {
      return
    }

    let cancelled = false

    async function loadAvailableProducts() {
      setAvailableLoading(true)
      setAvailableError('')

      try {
        const response = await fetch(`${API_URL}/products`)
        const result = await readApiJson(response, 'Products API returned an invalid response.')

        if (!response.ok) {
          throw new Error(result.error ?? 'Products could not be loaded.')
        }

        if (!cancelled) {
          setAvailableProducts(result.products ?? [])
        }
      } catch (error) {
        if (!cancelled) {
          setAvailableError(error.message)
        }
      } finally {
        if (!cancelled) {
          setAvailableLoading(false)
        }
      }
    }

    loadAvailableProducts()

    return () => {
      cancelled = true
    }
  }, [activeTab])

  useEffect(() => {
    if (!editingProduct || category) {
      return
    }

    const selectedCategory = editingProduct.category?.selected
    const selectedCategoryId = categories.find((item) => item.label === selectedCategory)?.id
    const selectedSubcategory = editingProduct.category?.subcategorySelected
    const selectedSubcategoryId = categories
      .flatMap((item) => item.subcategories ?? [])
      .find((item) => item.label === selectedSubcategory)?.id

    if (selectedCategoryId) {
      setCategory(selectedCategoryId)
    }
    if (selectedSubcategoryId) {
      setSubcategory(selectedSubcategoryId)
    }
  }, [categories, category, editingProduct])

  const selectedCategory = categories.find((item) => item.id === category)
  const selectedSubcategories = selectedCategory?.subcategories ?? []

  function toggleTag(id) {
    setTags((prev) => (prev.includes(id) ? prev.filter((tag) => tag !== id) : [...prev, id]))
  }

  function handleStartAddCategory() {
    setAddingCategory(true)
    setNewCategoryLabel('')
  }

  function handleCancelAddCategory() {
    setAddingCategory(false)
    setNewCategoryLabel('')
  }

  function handleStartAddSubcategory() {
    setAddingSubcategory(true)
    setNewSubcategoryLabel('')
  }

  function handleCancelAddSubcategory() {
    setAddingSubcategory(false)
    setNewSubcategoryLabel('')
  }

  async function handleAddCategory() {
    const label = newCategoryLabel.trim()

    if (!label) {
      return
    }

    setCategorySaving(true)
    setCategoryError('')

    try {
      const response = await fetch(`${API_URL}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: label }),
      })
      const result = await readApiJson(response, 'Category API returned an invalid response.')

      if (!response.ok) {
        const details = result.details ? Object.values(result.details).join(' ') : ''
        throw new Error(details || result.error || 'Category could not be saved.')
      }

      const nextCategory = { id: result.category.id, label: result.category.name }

      setCategories((prev) => {
        if (prev.some((item) => item.id === nextCategory.id)) {
          return prev.map((item) => (item.id === nextCategory.id ? nextCategory : item))
        }

        return [...prev, nextCategory]
      })
      setCategory(nextCategory.id)
      setSubcategory('')
      setAddingCategory(false)
      setNewCategoryLabel('')
    } catch (error) {
      setCategoryError(error.message)
    } finally {
      setCategorySaving(false)
    }
  }

  async function handleAddSubcategory() {
    const label = newSubcategoryLabel.trim()

    if (!label || !category) {
      return
    }

    setCategorySaving(true)
    setCategoryError('')

    try {
      const response = await fetch(`${API_URL}/categories/${category}/subcategories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: label }),
      })
      const result = await readApiJson(response, 'Subcategory API returned an invalid response.')

      if (!response.ok) {
        const details = result.details ? Object.values(result.details).join(' ') : ''
        throw new Error(details || result.error || 'Subcategory could not be saved.')
      }

      const nextSubcategory = { id: result.subcategory.id, label: result.subcategory.name, slug: result.subcategory.slug }

      setCategories((prev) => prev.map((item) => {
        if (item.id !== category) {
          return item
        }

        const subcategories = item.subcategories ?? []
        return {
          ...item,
          subcategories: subcategories.some((subcategoryItem) => subcategoryItem.id === nextSubcategory.id)
            ? subcategories.map((subcategoryItem) => (subcategoryItem.id === nextSubcategory.id ? nextSubcategory : subcategoryItem))
            : [...subcategories, nextSubcategory],
        }
      }))
      setSubcategory(nextSubcategory.id)
      setAddingSubcategory(false)
      setNewSubcategoryLabel('')
    } catch (error) {
      setCategoryError(error.message)
    } finally {
      setCategorySaving(false)
    }
  }

  async function handleDeleteCategory(id) {
    setCategorySaving(true)
    setCategoryError('')

    try {
      const response = await fetch(`${API_URL}/categories/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await readApiJson(response, 'Category delete API returned an invalid response.')
        throw new Error(result.error ?? 'Category could not be deleted.')
      }

      setCategories((prev) => prev.filter((item) => item.id !== id))

      if (category === id) {
        setCategory('')
        setSubcategory('')
      }
    } catch (error) {
      setCategoryError(error.message)
    } finally {
      setCategorySaving(false)
    }
  }

  async function handleDeleteSubcategory(id) {
    setCategorySaving(true)
    setCategoryError('')

    try {
      const response = await fetch(`${API_URL}/subcategories/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await readApiJson(response, 'Subcategory delete API returned an invalid response.')
        throw new Error(result.error ?? 'Subcategory could not be deleted.')
      }

      setCategories((prev) => prev.map((item) => ({
        ...item,
        subcategories: (item.subcategories ?? []).filter((subcategoryItem) => subcategoryItem.id !== id),
      })))

      if (subcategory === id) {
        setSubcategory('')
      }
    } catch (error) {
      setCategoryError(error.message)
    } finally {
      setCategorySaving(false)
    }
  }

  function addImageFiles(fileList) {
    const files = Array.from(fileList ?? []).filter((file) => file.type.startsWith('image/'))

    if (files.length === 0) {
      return
    }

    setImages((prev) => [
      ...prev,
      ...files
        .slice(0, Math.max(MAX_PRODUCT_IMAGES - prev.length, 0))
        .map((file) => ({
          id: crypto.randomUUID(),
          file,
          url: URL.createObjectURL(file),
        })),
    ])
  }

  function handleImages(e) {
    addImageFiles(e.target.files)
    e.target.value = ''
  }

  function handleImageDrop(e) {
    e.preventDefault()
    addImageFiles(e.dataTransfer.files)
  }

  function handleImageDragOver(e) {
    e.preventDefault()
  }

  function removeImage(id) {
    setImages((prev) => prev.filter((img) => img.id !== id))
  }

  function getProductPayload(form, imageUrls, draft) {
    const formData = new FormData(form)
    const selectedCategory = categories.find((item) => item.id === category)
    const selectedSubcategory = selectedCategory?.subcategories?.find((item) => item.id === subcategory)
    const selectedCategoryLabel = selectedCategory?.label ?? category
    const selectedSubcategoryLabel = selectedSubcategory?.label ?? ''

    return {
      category: {
        selected: selectedCategoryLabel,
        subcategorySelected: selectedSubcategoryLabel,
        options: categories.map((item) => item.label),
        subcategoryOptions: selectedCategory?.subcategories?.map((item) => item.label) ?? [],
      },
      categoryId: selectedCategory?.id ?? null,
      subcategoryId: selectedSubcategory?.id ?? null,
      productPlacement: {
        best_sellers: tags.includes('best-sellers'),
        new_arrivals: tags.includes('new-arrivals'),
        current_offers: tags.includes('current-offers'),
      },
      productName: formData.get('productName')?.trim() ?? '',
      weightQty: formData.get('weightQty')?.trim() ?? '',
      weightUnit,
      stockNumber: formData.get('stockNumber')?.trim() ?? '',
      description: formData.get('description')?.trim() ?? '',
      ingredient: formData.get('ingredient')?.trim() ?? '',
      storageText: formData.get('storageText')?.trim() ?? '',
      shelfText: formData.get('shelfText')?.trim() ?? '',
      price: formData.get('price')?.trim() ?? '',
      offerPrice: formData.get('offerPrice')?.trim() ?? '',
      offerType: getSafeOfferType(formData.get('productOfferType'), offerType),
      freeDelivery: formData.get('freeDelivery') === 'on',
      imageUrls,
      draft,
      active: editingProduct?.active ?? true,
    }
  }

  async function uploadImages() {
    const newImages = images.filter((image) => image.file)

    if (newImages.length === 0) {
      return []
    }

    const formData = new FormData()
    newImages.forEach((image) => formData.append('images', image.file))

    const response = await fetch(`${API_URL}/product-images`, {
      method: 'POST',
      body: formData,
    })

    const result = await readApiJson(response, 'Image upload API returned an invalid response.')

    if (!response.ok) {
      throw new Error(result.error ?? 'Unable to upload product images.')
    }

    return result.imageUrls
  }

  async function saveProduct(form, draft) {
    setSaving(true)
    setSubmitError('')
    setSubmitStatus('')

    try {
      const uploadedImageUrls = await uploadImages()
      const existingImageUrls = images.filter((image) => !image.file).map((image) => image.url)
      const imageUrls = [...existingImageUrls, ...uploadedImageUrls]
      const endpoint = editingProduct
        ? `${API_URL}/products/${editingProduct.id}`
        : `${API_URL}${draft ? '/products/drafts' : '/products'}`
      const response = await fetch(endpoint, {
        method: editingProduct ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getProductPayload(form, imageUrls, draft)),
      })

      const result = await readApiJson(response, 'Product API returned an invalid response.')

      if (!response.ok) {
        const details = result.details ? Object.values(result.details).join(' ') : ''
        throw new Error(details || result.error || 'Unable to save product.')
      }

      setSubmitStatus(editingProduct ? 'Product updated successfully.' : draft ? 'Draft saved successfully.' : 'Product published successfully.')
      form.reset()
      setImages([])
      setTags([])
      setCategory('')
      setSubcategory('')
      setWeightUnit('')
      setOfferType('none')
      setEditingProduct(null)
      setFormVersion((version) => version + 1)
    } catch (error) {
      setSubmitError(error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handlePublishSubmit(event) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const productName = formData.get('productName')?.trim()
    const weightQty = formData.get('weightQty')?.trim()
    const description = formData.get('description')?.trim()
    const price = formData.get('price')?.trim()

    if (!category || !productName || !weightQty || !weightUnit || !description || !price || images.length === 0) {
      setSubmitError('Category, product name, quantity, unit, description, price, and images are required to publish.')
      return
    }

    await saveProduct(event.currentTarget, false)
  }

  async function handleSaveDraft(event) {
    await saveProduct(event.currentTarget.form, true)
  }

  function handleEditProduct(product) {
    const placement = product.productPlacement ?? {}
    const selectedCategory = product.category?.selected
    const selectedCategoryId = categories.find((item) => item.label === selectedCategory)?.id ?? ''
    const selectedSubcategory = product.category?.subcategorySelected
    const selectedSubcategoryId = categories
      .flatMap((item) => item.subcategories ?? [])
      .find((item) => item.label === selectedSubcategory)?.id ?? ''
    const fallbackCategory = selectedCategory && !selectedCategoryId
      ? { id: selectedCategory, label: selectedCategory }
      : null

    if (fallbackCategory) {
      setCategories((currentCategories) => (
        currentCategories.some((item) => item.label === fallbackCategory.label)
          ? currentCategories
          : [...currentCategories, fallbackCategory]
      ))
    }

    setEditingProduct(product)
    setCategory(selectedCategoryId || fallbackCategory?.id || '')
    setSubcategory(product.subcategoryId || selectedSubcategoryId || '')
    setWeightUnit(product.weightUnit ?? '')
    setOfferType(product.offerType ?? 'none')
    setTags(PRODUCT_TAGS.filter((tag) => placement[tag.id.replaceAll('-', '_')]).map((tag) => tag.id))
    setImages((product.imageUrls ?? []).map((url) => ({ id: url, url })))
    setSubmitError('')
    setSubmitStatus('')
    setFormVersion((version) => version + 1)
    setActiveTab('create')
  }

  function requestDeleteProduct(product) {
    setProductPendingDelete(product)
  }

  async function confirmDeleteProduct() {
    if (!productPendingDelete) {
      return
    }

    const product = productPendingDelete
    setBusyProductId(product.id)
    setAvailableError('')

    try {
      const response = await fetch(`${API_URL}/products/${product.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await readApiJson(response, 'Product delete API returned an invalid response.')
        throw new Error(result.error ?? 'Product could not be deleted.')
      }

      setAvailableProducts((products) => products.filter((item) => item.id !== product.id))
      setProductPendingDelete(null)
    } catch (error) {
      setAvailableError(error.message)
    } finally {
      setBusyProductId('')
    }
  }

  async function handleToggleProductActive(product) {
    setBusyProductId(product.id)
    setAvailableError('')

    try {
      const response = await fetch(`${API_URL}/products/${product.id}/active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !product.active }),
      })
      const result = await readApiJson(response, 'Product status API returned an invalid response.')

      if (!response.ok) {
        throw new Error(result.error ?? 'Product status could not be updated.')
      }

      setAvailableProducts((products) => products.map((item) => (item.id === product.id ? result.product : item)))
    } catch (error) {
      setAvailableError(error.message)
    } finally {
      setBusyProductId('')
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col pb-4 font-[Poppins] sm:pb-16">
      <AppLoader active={dbBusy} label="Processing request" />
      <Stepper activeTab={activeTab} onSelect={setActiveTab} />

      {activeTab === 'published' ? (
        <ProductsTable
          products={availableProducts}
          loading={availableLoading}
          error={availableError}
          emptyTitle="No available products yet"
          emptyDescription="Available products will appear here."
          onEdit={handleEditProduct}
          onDelete={requestDeleteProduct}
          onToggleActive={handleToggleProductActive}
          busyProductId={busyProductId}
        />
      ) : activeTab === 'draft' ? (
        <section className="flex min-h-[420px] flex-col items-center justify-center gap-2 border-t-2 border-line pt-12 text-center">
          <h2 className="text-2xl font-bold tracking-[-0.02em] text-ink">No draft products yet</h2>
          <p className="text-base text-muted">Products saved as draft will appear here.</p>
        </section>
      ) : activeTab === 'combo' ? (
        <ComboOffersManager />
      ) : (
    <form key={formVersion} className="flex flex-col" onSubmit={handlePublishSubmit}>
      <div className="sticky top-0 z-10 -mx-4 mb-8 flex flex-col items-stretch gap-4 border-b border-line bg-lifted/95 px-4 py-4 backdrop-blur-sm sm:-mx-7 sm:mb-9 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-7 lg:-mx-8 lg:px-8 xl:-mx-10 xl:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <IconBox className="h-6 w-6 shrink-0 text-ink" />
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-ink sm:text-xl">{editingProduct ? 'Edit product' : 'New product'}</h1>
            <p className="text-sm text-muted sm:text-base">{editingProduct ? 'Update the product details below' : 'Fill in the details below to list a product'}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <button
            type="button"
            disabled={saving}
            onClick={handleSaveDraft}
            className="rounded-none bg-yellow px-4 py-2.5 text-sm font-semibold text-ink hover:bg-yellow-dark sm:px-5"
          >
            {saving ? 'Saving...' : 'Save as draft'}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-none bg-yellow px-4 py-2.5 text-sm font-semibold text-ink hover:bg-yellow-dark sm:px-6"
          >
            {saving ? 'Publishing...' : editingProduct ? 'Update product' : 'Publish product'}
          </button>
        </div>
        {submitError ? (
          <p className="text-sm font-bold text-signal sm:basis-full sm:text-right">{submitError}</p>
        ) : null}
        {submitStatus ? (
          <p className="text-sm font-bold text-ink/70 sm:basis-full sm:text-right">{submitStatus}</p>
        ) : null}
      </div>

      <section className="border-t-2 border-line pt-9">
        <div className="flex flex-col items-stretch gap-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-8">
          <div className="w-full max-w-lg flex-1">
            <Field label="Category" required>
              <CategoryDropdown
                categories={categories}
                value={category}
                onChange={(nextCategory) => {
                  setCategory(nextCategory)
                  setSubcategory('')
                }}
                onDelete={handleDeleteCategory}
              />
              {categoryError ? <p className="mt-2 text-sm font-bold text-signal">{categoryError}</p> : null}
            </Field>
          </div>

          {addingCategory ? (
            <div className="flex w-full max-w-lg flex-1 items-end gap-3">
              <div className="flex-1">
                <Field label="New category">
                  <input
                    type="text"
                    value={newCategoryLabel}
                    onChange={(event) => setNewCategoryLabel(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        handleAddCategory()
                      }
                    }}
                    autoFocus
                    placeholder="e.g. Burmese foods"
                    className={inputClass}
                  />
                </Field>
              </div>
              <button
                type="button"
                onClick={handleAddCategory}
                disabled={categorySaving}
                className="px-2 py-2.5 text-sm font-semibold text-signal hover:text-clay sm:text-base"
              >
                Add
              </button>
              <button
                type="button"
                onClick={handleCancelAddCategory}
                className="px-2 py-2.5 text-sm font-semibold text-muted hover:text-ink sm:text-base"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStartAddCategory}
              className="flex items-center gap-2 text-sm font-semibold text-signal hover:text-clay sm:pb-3 sm:text-base"
            >
              <IconPlus className="h-5 w-5" />
              Add new category
            </button>
          )}
        </div>
        <div className="mt-8 flex flex-col items-stretch gap-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-8">
          <div className="w-full max-w-lg flex-1">
            <Field label="Subcategory" hint="optional">
              <SubcategoryDropdown
                subcategories={selectedSubcategories}
                value={subcategory}
                onChange={setSubcategory}
                onDelete={handleDeleteSubcategory}
                disabled={!category}
              />
            </Field>
          </div>

          {addingSubcategory ? (
            <div className="flex w-full max-w-lg flex-1 items-end gap-3">
              <div className="flex-1">
                <Field label="New subcategory">
                  <input
                    type="text"
                    value={newSubcategoryLabel}
                    onChange={(event) => setNewSubcategoryLabel(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        handleAddSubcategory()
                      }
                    }}
                    autoFocus
                    placeholder="e.g. Veg Sambal"
                    className={inputClass}
                  />
                </Field>
              </div>
              <button type="button" onClick={handleAddSubcategory} disabled={categorySaving || !category} className="px-2 py-2.5 text-sm font-semibold text-signal hover:text-clay disabled:text-dust sm:text-base">
                Add
              </button>
              <button type="button" onClick={handleCancelAddSubcategory} className="px-2 py-2.5 text-sm font-semibold text-muted hover:text-ink sm:text-base">
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStartAddSubcategory}
              disabled={!category}
              className="flex items-center gap-2 text-sm font-semibold text-signal hover:text-clay disabled:cursor-not-allowed disabled:text-dust sm:pb-3 sm:text-base"
            >
              <IconPlus className="h-5 w-5" />
              Add subcategory
            </button>
          )}
        </div>
      </section>

      <section className="border-t-2 border-line pt-9">
        <span className="text-base font-bold tracking-tight text-ink">Product placement</span>
        <div className="mt-4 flex flex-col divide-y-2 divide-line">
          {PRODUCT_TAGS.map((tag) => {
            const active = tags.includes(tag.id)
            return (
              <label
                key={tag.id}
                className="flex items-center justify-between gap-6 py-3.5 first:pt-0"
              >
                <span className="text-base font-semibold text-ink">{tag.label}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={active}
                  onClick={() => toggleTag(tag.id)}
                  className={[
                    'relative h-8 w-14 shrink-0 rounded-full transition-colors',
                    active ? 'bg-yellow' : 'bg-line',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'absolute left-1 top-1 h-6 w-6 rounded-full bg-surface shadow-card transition-transform',
                      active ? 'translate-x-6' : 'translate-x-0',
                    ].join(' ')}
                  />
                </button>
              </label>
            )
          })}
        </div>
      </section>

      <section className="border-t-2 border-line pt-9">
        <span className="text-base font-bold tracking-tight text-ink">Offer type</span>
        <p className="mt-2 text-sm font-medium text-muted">Use this to trigger customer-facing limited-time or festival offer banners.</p>
        <div className="mt-4">
          <OfferTypeRadio name="productOfferType" value={offerType} onChange={setOfferType} />
        </div>
      </section>

      <section className="border-t-2 border-line pt-9">
        <label className="flex items-center justify-between gap-6">
          <span>
            <span className="block text-base font-bold tracking-tight text-ink">Free delivery</span>
            <span className="mt-1 block text-sm font-medium text-muted">If enabled, delivery charge becomes zero when the order contains only free-delivery items.</span>
          </span>
          <input
            name="freeDelivery"
            type="checkbox"
            defaultChecked={Boolean(editingProduct?.freeDelivery)}
            className="h-5 w-5 shrink-0 accent-yellow"
          />
        </label>
      </section>

      <section className="border-t-2 border-line pt-9 pb-2">
        <SectionHeading>Product details</SectionHeading>
        <div className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2">
          <Field label="Product name" span required>
            <input name="productName" type="text" defaultValue={editingProduct?.productName ?? ''} placeholder="e.g. Chinna Kunni Sambal" className={inputClass} />
          </Field>

          <Field label="Weight / quantity" hint="per unit" required>
            <div className="grid grid-cols-[1fr_130px] gap-5">
              <input name="weightQty" type="text" inputMode="decimal" pattern="[0-9]*[.]?[0-9]*" defaultValue={editingProduct?.weightQtyFloat ?? editingProduct?.weightQtyInteger ?? ''} placeholder="e.g. 500" className={inputClass} />
              <div>
                <WeightUnitRadio value={weightUnit} onChange={setWeightUnit} />
              </div>
            </div>
          </Field>

          <Field label="Stock availability" hint="optional">
            <input name="stockNumber" type="text" inputMode="numeric" pattern="[0-9]*" defaultValue={editingProduct?.stockNumber ?? ''} placeholder="Units in stock" className={inputClass} />
          </Field>

          <Field label="Detailed description" span required>
            <textarea
              name="description"
              defaultValue={editingProduct?.description ?? ''}
              rows={3}
              placeholder="Describe the product, its origin, and key selling points"
              className={`${inputClass} resize-none`}
            />
          </Field>

          <Field label="Ingredients" span hint="comma separated">
            <textarea
              name="ingredient"
              defaultValue={editingProduct?.ingredient ?? ''}
              rows={2}
              placeholder="e.g. dry fish, spices, etc."
              className={`${inputClass} resize-none`}
            />
          </Field>

          <Field label="Storage instructions" hint="optional">
            <input name="storageText" type="text" defaultValue={editingProduct?.storageText ?? ''} placeholder="e.g. Store in a cool, dry place" className={inputClass} />
          </Field>

          <Field label="Shelf life / best-before" hint="optional">
            <input name="shelfText" type="text" defaultValue={editingProduct?.shelfText ?? ''} placeholder="e.g. 9 months from packaging" className={inputClass} />
          </Field>
        </div>
      </section>

      <section className="border-t-2 border-line pt-9 pb-2">
        <SectionHeading>Pricing</SectionHeading>
        <div className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2">
          <Field label="MRP" hint="incl. tax" required>
            <div className="relative">
              <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-lg font-bold text-muted sm:text-xl">
                ₹
              </span>
              <input
                name="price"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                defaultValue={editingProduct?.price ?? ''}
                placeholder="0"
                className={`${inputClass} pl-6 font-bold`}
              />
            </div>
          </Field>

          <Field label="Offer price" hint="optional">
            <div className="relative">
              <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-lg font-bold text-muted sm:text-xl">
                ₹
              </span>
              <input
                name="offerPrice"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                defaultValue={editingProduct?.offerPrice ?? ''}
                placeholder="0"
                className={`${inputClass} pl-6 font-bold`}
              />
            </div>
          </Field>
        </div>
      </section>

      <section className="border-t-2 border-line pt-9">
        <div className="mb-7 flex flex-wrap items-baseline justify-between gap-3">
          <SectionHeading>Product images <span className="text-signal">*</span></SectionHeading>
          <span className="text-sm font-bold text-muted">{images.length}/{MAX_PRODUCT_IMAGES} uploaded</span>
        </div>

        <div className="flex flex-col gap-6">
          <label
            onDrop={handleImageDrop}
            onDragOver={handleImageDragOver}
            className={[
              'flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2.5 border-2 border-dashed border-line bg-canvas px-6 py-8 text-center transition-colors hover:border-ink/30',
              images.length >= MAX_PRODUCT_IMAGES ? 'pointer-events-none opacity-60' : '',
            ].join(' ')}
          >
            <IconImage className="h-8 w-8 text-muted" />
            <span className="text-base font-semibold text-ink">
              {images.length >= MAX_PRODUCT_IMAGES ? 'Maximum images added' : 'Upload multiple product images'}
            </span>
            <span className="max-w-md text-sm font-medium text-muted">
              Select multiple images at once or drag and drop them here. JPEG, PNG, and WEBP are supported.
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={images.length >= MAX_PRODUCT_IMAGES}
              className="hidden"
              onChange={handleImages}
            />
          </label>

          {images.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {images.map((img, index) => (
                <div
                  key={img.id}
              className="group relative aspect-square overflow-hidden border-2 border-line bg-canvas"
                >
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                  {index === 0 ? (
                    <span className="absolute left-2 top-2 bg-yellow px-2.5 py-1 text-xs font-bold text-ink">
                      Primary
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center bg-yellow text-ink opacity-100 transition-colors hover:bg-yellow-dark sm:opacity-0 sm:group-hover:opacity-100"
                    aria-label="Remove image"
                  >
                    <IconTrash className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>
      </form>
      )}
      <ConfirmationModal
        open={Boolean(productPendingDelete)}
        title="Delete product?"
        message={`Delete "${productPendingDelete?.productName ?? 'this product'}"? This cannot be undone.`}
        busy={Boolean(busyProductId)}
        onCancel={() => setProductPendingDelete(null)}
        onConfirm={confirmDeleteProduct}
      />
    </div>
  )
}
