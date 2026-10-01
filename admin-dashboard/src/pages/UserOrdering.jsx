import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Home, ListFilter, Maximize2, Minus, Moon, PackageCheck, Plus, Share2, Star, Sun, Tag, Trash2, X } from 'lucide-react'
import { IconSearch, IconShoppingBag } from '../components/icons'
import bannerImageSrc from '../../images/Banner1.png'
import footerImageSrc from '../../images/image.png'
import festivalOfferImageSrc from '../../images/festival.png'
import limitedOfferImageSrc from '../../images/limited.png'
import noPreserveImageSrc from '../../images/no preserve.png'
import traditionalImageSrc from '../../images/traditional.png'
import madeWithImageSrc from '../../images/made with.png'
import founderImageSrc from '../../images/IMG_2566.PNG'
import indianStatesDistricts from '../data/indian-states-districts.json'

const BRAND_LOGO_SRC = '/brand-logo.jpg'
const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:4000/api'
const CART_STORAGE_KEY = 'lkp_guest_cart'
const LAST_DELIVERY_STORAGE_KEY = 'lkp_last_delivery'
const CUSTOMER_PHONE_STORAGE_KEY = 'lkp_customer_phone'
const THEME_STORAGE_KEY = 'lkp_theme_mode'
const SOCIAL_ICON_URLS = {
  whatsapp: 'https://cdn.simpleicons.org/whatsapp/25D366',
  instagram: 'https://cdn.simpleicons.org/instagram/E4405F',
}
const FOOTER_BADGES = [
  { src: noPreserveImageSrc, alt: 'No preservatives' },
  { src: traditionalImageSrc, alt: 'Traditional' },
  { src: madeWithImageSrc, alt: 'Made with care' },
]
const PROMO_OFFER_TYPES = new Set(['limited_time', 'festival'])

const PRODUCT_TABS = [
  { id: 'all', label: 'Home', icon: Home },
  { id: 'products', label: 'All Products', icon: ClipboardList },
  { id: 'offers', label: 'Offers', icon: Tag },
  { id: 'my-orders', label: 'My Orders', icon: PackageCheck },
]

const EMPTY_ORDER_FORM = {
  customerName: '',
  phoneNumber: '',
  whatsappNumber: '',
  deliveryAddress: '',
  deliveryState: '',
  deliveryDistrict: '',
  deliveryPincode: '',
  customerNotes: '',
  billingSameAsShipping: true,
  billingName: '',
  billingAddress: '',
  billingCity: '',
  billingState: '',
  billingPincode: '',
  billingPhone: '',
  discountCode: '',
}

function createSlug(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function readStoredCartItems() {
  try {
    const storedValue = window.localStorage.getItem(CART_STORAGE_KEY)
    const parsedValue = JSON.parse(storedValue ?? '[]')

    if (!Array.isArray(parsedValue)) {
      return []
    }

    return parsedValue
      .filter((item) => (
        ['product', 'combo'].includes(item.type ?? 'product')
        && typeof (item.type === 'combo' ? item.comboOfferId : item.productId) === 'string'
        && Number.isInteger(Number(item.quantity))
        && Number(item.quantity) > 0
      ))
      .map((item) => ({
        type: item.type ?? 'product',
        productId: item.productId,
        comboOfferId: item.comboOfferId,
        quantity: Number(item.quantity),
      }))
  } catch {
    return []
  }
}

function writeStoredCartItems(cartItems) {
  const storagePayload = cartItems.map((item) => ({
    type: item.type ?? 'product',
    productId: item.product?.id,
    comboOfferId: item.comboOffer?.id,
    quantity: item.quantity,
  }))

  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(storagePayload))
}

function readStoredDeliveryAddress() {
  try {
    const storedValue = window.localStorage.getItem(LAST_DELIVERY_STORAGE_KEY)
    const parsedValue = JSON.parse(storedValue ?? 'null')

    if (!parsedValue || typeof parsedValue !== 'object') {
      return null
    }

    const address = typeof parsedValue.address === 'string' ? parsedValue.address.trim() : ''
    const pincode = typeof parsedValue.pincode === 'string' ? parsedValue.pincode.trim() : ''
    const state = typeof parsedValue.state === 'string' ? parsedValue.state.trim() : ''
    const district = typeof parsedValue.district === 'string' ? parsedValue.district.trim() : ''

    if (!address) {
      return null
    }

    return { address, pincode, state, district }
  } catch {
    return null
  }
}

function writeStoredDeliveryAddress(orderForm) {
  const address = orderForm.deliveryAddress.trim()

  if (!address) {
    return
  }

  window.localStorage.setItem(LAST_DELIVERY_STORAGE_KEY, JSON.stringify({
    address,
    pincode: orderForm.deliveryPincode.trim(),
    state: orderForm.deliveryState.trim(),
    district: orderForm.deliveryDistrict.trim(),
  }))
}

function readStoredCustomerPhone() {
  try {
    return window.localStorage.getItem(CUSTOMER_PHONE_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

function readStoredThemeMode() {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function writeStoredCustomerPhone(phoneNumber) {
  const normalizedPhoneNumber = normalizePhoneInput(phoneNumber)

  if (!normalizedPhoneNumber) {
    return
  }

  window.localStorage.setItem(CUSTOMER_PHONE_STORAGE_KEY, normalizedPhoneNumber)
}

function normalizePhoneInput(value) {
  return value.replace(/\D/g, '').slice(0, 10)
}

function normalizeLocationText(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ')
}

function getEstimatedDeliveryCharge(profile, orderForm) {
  const locationText = normalizeLocationText(`${orderForm.deliveryDistrict} ${orderForm.deliveryState}`)

  if (!orderForm.deliveryDistrict.trim() || !orderForm.deliveryState.trim()) {
    return null
  }

  if (locationText.includes('chennai') || locationText.includes('madras')) {
    return Number(profile?.deliveryChennaiAmount ?? 50)
  }

  if (locationText.includes('bangalore') || locationText.includes('bengaluru')) {
    return Number(profile?.deliveryBangaloreAmount ?? 70)
  }

  return Number(profile?.deliveryDefaultAmount ?? 60)
}

function cartHasPaidDeliveryItems(cartItems) {
  return cartItems.some((item) => {
    if (item.type === 'combo') {
      return !item.comboOffer?.freeDelivery
    }

    return !item.product?.freeDelivery
  })
}

function normalizeDiscountCode(value) {
  return String(value ?? '').trim().toUpperCase()
}

function normalizeBusinessProfile(profile) {
  if (!profile || typeof profile !== 'object') {
    return null
  }

  return {
    ...profile,
    instagramLink: profile.instagramLink ?? profile.instagram_link ?? '',
    facebookLink: profile.facebookLink ?? profile.facebook_link ?? '',
    deliveryChennaiAmount: profile.deliveryChennaiAmount ?? profile.delivery_chennai_amount ?? 50,
    deliveryBangaloreAmount: profile.deliveryBangaloreAmount ?? profile.delivery_bangalore_amount ?? 70,
    deliveryDefaultAmount: profile.deliveryDefaultAmount ?? profile.delivery_default_amount ?? 60,
    discountEnabled: Boolean(profile.discountEnabled ?? profile.discount_enabled),
    discountCode: profile.discountCode ?? profile.discount_code ?? '',
    discountType: profile.discountType ?? profile.discount_type ?? 'amount',
    discountValue: profile.discountValue ?? profile.discount_value ?? 0,
    discountMinOrderAmount: profile.discountMinOrderAmount ?? profile.discount_min_order_amount ?? 0,
  }
}

function getEstimatedDiscount(profile, orderForm, subtotalAmount) {
  const requestedCode = normalizeDiscountCode(orderForm.discountCode)
  const configuredCode = normalizeDiscountCode(profile?.discountCode)

  if (!requestedCode || !profile?.discountEnabled || !configuredCode || requestedCode !== configuredCode) {
    return { code: '', amount: 0, valid: false }
  }

  const minimumOrderAmount = Number(profile.discountMinOrderAmount ?? 0)

  if (subtotalAmount < minimumOrderAmount) {
    return { code: configuredCode, amount: 0, valid: false }
  }

  const discountValue = Number(profile.discountValue ?? 0)
  const amount = profile.discountType === 'percent'
    ? Math.floor((subtotalAmount * Math.min(discountValue, 100)) / 100)
    : discountValue

  return {
    code: configuredCode,
    amount: Math.min(Math.max(amount, 0), subtotalAmount),
    valid: true,
  }
}

function SearchableLocationDropdown({ value, options, placeholder, disabled = false, onChange, autoComplete }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)

  useEffect(() => {
    setQuery(value)
  }, [value])

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeLocationText(query)

    if (!normalizedQuery) {
      return options.slice(0, 80)
    }

    return options
      .filter((option) => normalizeLocationText(option).includes(normalizedQuery))
      .slice(0, 80)
  }, [options, query])

  function selectOption(option) {
    onChange(option)
    setQuery(option)
    setOpen(false)
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={open ? query : value}
        onFocus={() => {
          if (!disabled) {
            setQuery(value)
            setOpen(true)
          }
        }}
        onBlur={() => {
          window.setTimeout(() => {
            setQuery(value)
            setOpen(false)
          }, 120)
        }}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && filteredOptions[0]) {
            event.preventDefault()
            selectOption(filteredOptions[0])
          }

          if (event.key === 'Escape') {
            setOpen(false)
            setQuery(value)
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        className="h-13 w-full rounded-2xl border border-[#d9d9d9] bg-white px-4 pr-11 text-base font-medium text-black outline-none transition-colors placeholder:text-[#6b7280] focus:border-signal disabled:cursor-not-allowed disabled:bg-[#f4f4f4] disabled:text-[#9ca3af] md:h-[58px]"
        autoComplete={autoComplete}
      />
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6b7280]" />
      {open && !disabled ? (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-[#d9d9d9] bg-white py-2 shadow-[0_18px_48px_rgba(20,20,19,0.14)]">
          {filteredOptions.length === 0 ? (
            <p className="px-4 py-3 text-sm font-semibold text-[#6b7280]">No matching option</p>
          ) : null}
          {filteredOptions.map((option) => (
            <button
              key={option}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectOption(option)}
              className={[
                'block w-full px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-[#fff5f1]',
                option === value ? 'text-signal' : 'text-black',
              ].join(' ')}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

async function fetchCustomerOrders(phoneNumber) {
  const response = await fetch(`${API_URL}/customer-orders?phoneNumber=${encodeURIComponent(phoneNumber)}`)
  const contentType = response.headers.get('content-type') ?? ''

  if (!contentType.includes('application/json')) {
    throw new Error('API is not reachable. Please restart the backend and check VITE_API_URL.')
  }

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error ?? 'Orders could not be loaded.')
  }

  return result.orders ?? []
}

function getViewportMode(width) {
  if (width >= 1280) {
    return 'desktop'
  }

  if (width >= 768) {
    return 'tablet'
  }

  return 'mobile'
}

function useViewportMode() {
  const [viewportMode, setViewportMode] = useState(() => getViewportMode(window.innerWidth))

  useEffect(() => {
    function handleResize() {
      setViewportMode(getViewportMode(window.innerWidth))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return viewportMode
}

const LAYOUT_BY_VIEWPORT = {
  mobile: {
    shell: 'max-w-md px-3 pb-28 pt-3',
    hero: 'h-48',
    tabTop: 'top-[65px]',
    grid: 'grid-cols-2 gap-x-3 gap-y-7',
    productCard: 'min-h-52',
  },
  tablet: {
    shell: 'max-w-3xl px-6 pb-28 pt-6',
    hero: 'h-64',
    tabTop: 'top-[73px]',
    grid: 'grid-cols-3 gap-x-5 gap-y-10',
    productCard: 'min-h-64',
  },
  desktop: {
    shell: 'w-full max-w-none px-8 pb-12 pt-8 xl:px-12 2xl:px-16',
    hero: 'h-80',
    tabTop: 'top-[73px]',
    grid: 'grid-cols-4 gap-x-9 gap-y-14 xl:grid-cols-5 2xl:grid-cols-6',
    productCard: 'min-h-72',
  },
}

export default function UserOrdering() {
  const [activeTab, setActiveTab] = useState('all')
  const [activeCategorySlug, setActiveCategorySlug] = useState('all')
  const [activeSubcategorySlug, setActiveSubcategorySlug] = useState('all')
  const [expandedCategoryIds, setExpandedCategoryIds] = useState([])
  const [themeMode, setThemeMode] = useState(() => readStoredThemeMode())
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState([])
  const [comboOffers, setComboOffers] = useState([])
  const [specialOfferProducts, setSpecialOfferProducts] = useState([])
  const [specialOfferCombos, setSpecialOfferCombos] = useState([])
  const [customerReviews, setCustomerReviews] = useState([])
  const [categories, setCategories] = useState([])
  const [cartItems, setCartItems] = useState([])
  const [cartHydrated, setCartHydrated] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [categoryFilterOpen, setCategoryFilterOpen] = useState(false)
  const [promoPopupOpen, setPromoPopupOpen] = useState(false)
  const [promoPopupSeen, setPromoPopupSeen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedComboOffer, setSelectedComboOffer] = useState(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [detailQuantity, setDetailQuantity] = useState(1)
  const [openDetailSection, setOpenDetailSection] = useState('about')
  const [orderForm, setOrderForm] = useState(EMPTY_ORDER_FORM)
  const [orderErrors, setOrderErrors] = useState({})
  const [discountStatus, setDiscountStatus] = useState('')
  const [orderSubmitting, setOrderSubmitting] = useState(false)
  const [placedOrder, setPlacedOrder] = useState(null)
  const [feedbackRating, setFeedbackRating] = useState(5)
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)
  const [feedbackStatus, setFeedbackStatus] = useState('')
  const [feedbackError, setFeedbackError] = useState('')
  const [myOrdersPhone, setMyOrdersPhone] = useState(() => readStoredCustomerPhone())
  const [myOrders, setMyOrders] = useState([])
  const [myOrdersLoading, setMyOrdersLoading] = useState(false)
  const [myOrdersError, setMyOrdersError] = useState('')
  const [addedProductId, setAddedProductId] = useState('')
  const [businessProfile, setBusinessProfile] = useState(null)
  const [lastDeliveryAddress, setLastDeliveryAddress] = useState(() => readStoredDeliveryAddress())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const viewportMode = useViewportMode()
  const layout = useMemo(() => LAYOUT_BY_VIEWPORT[viewportMode], [viewportMode])
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0)
  const cartTotal = cartItems.reduce((total, item) => {
    const price = getCartItemPrice(item)
    return total + (price ?? 0) * item.quantity
  }, 0)
  const estimatedDeliveryCharge = cartItems.length > 0 && !cartHasPaidDeliveryItems(cartItems)
    ? 0
    : getEstimatedDeliveryCharge(businessProfile, orderForm)
  const estimatedDiscount = getEstimatedDiscount(businessProfile, orderForm, cartTotal)
  const checkoutGrandTotal = Math.max(cartTotal + (estimatedDeliveryCharge ?? 0) - estimatedDiscount.amount, 0)
  const addedCartItem = cartItems.find((item) => getCartItemKey(item) === addedProductId)

  const activeCategoryName = useMemo(() => (
    categories.find((category) => category.slug === activeCategorySlug)?.name ?? ''
  ), [activeCategorySlug, categories])
  const activeSubcategoryName = useMemo(() => (
    categories
      .flatMap((category) => category.subcategories ?? [])
      .find((subcategory) => subcategory.slug === activeSubcategorySlug)?.name ?? ''
  ), [activeSubcategorySlug, categories])
  const stateOptions = useMemo(() => indianStatesDistricts.map((item) => item.state), [])
  const districtOptions = useMemo(() => {
    const selectedState = indianStatesDistricts.find((item) => item.state === orderForm.deliveryState)
    return selectedState?.districts ?? []
  }, [orderForm.deliveryState])

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeMode)
    } catch {
      // Local storage can be unavailable; theme still works for this page session.
    }
  }, [themeMode])

  useEffect(() => {
    window.localStorage.removeItem('lkp_customer_orders_cache')
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadCategories() {
      try {
        const response = await fetch(`${API_URL}/categories`)
        const result = await response.json()

        if (!response.ok) {
          return
        }

        if (!cancelled) {
          setCategories((result.categories ?? [])
            .filter((category) => category.name)
            .map((category) => ({
              ...category,
              slug: category.slug || createSlug(category.name),
              subcategories: (category.subcategories ?? []).map((subcategory) => ({
                ...subcategory,
                slug: subcategory.slug || createSlug(subcategory.name),
              })),
            })))
        }
      } catch {
        if (!cancelled) {
          setCategories([])
        }
      }
    }

    loadCategories()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (activeCategorySlug === 'all') {
      return
    }

    if (!categories.some((category) => category.slug === activeCategorySlug)) {
      setActiveCategorySlug('all')
      setActiveSubcategorySlug('all')
      setActiveSubcategorySlug('all')
    }
  }, [activeCategorySlug, categories])

  useEffect(() => {
    let cancelled = false

    async function loadProducts() {
      if (['profile', 'my-orders'].includes(activeTab)) {
        setLoading(false)
        setError('')
        return
      }

      setLoading(true)
      setError('')

      try {
        const productFilter = ['offers', 'hot-selling', 'new-launched'].includes(activeTab) ? activeTab : 'all'
        const [response, combosResponse] = await Promise.all([
          fetch(activeTab === 'combo-offers' ? `${API_URL}/combo-offers/public` : `${API_URL}/products/public?filter=${productFilter}`),
          fetch(`${API_URL}/combo-offers/public`),
        ])
        const result = await response.json()
        const combosResult = await combosResponse.json()

        if (!response.ok) {
          throw new Error(result.error ?? 'Products could not be loaded.')
        }

        if (!combosResponse.ok) {
          throw new Error(combosResult.error ?? 'Combo offers could not be loaded.')
        }

        if (!cancelled) {
          const nextProducts = result.products ?? []
          const nextComboOffers = activeTab === 'combo-offers' ? result.comboOffers ?? [] : combosResult.comboOffers ?? []

          if (activeTab === 'combo-offers') {
            setComboOffers(nextComboOffers)
          } else {
            setProducts(nextProducts)
            setComboOffers(nextComboOffers)
          }

          if (activeTab === 'all') {
            const storedCartItems = readStoredCartItems()

            if (storedCartItems.length > 0) {
              const productsById = new Map(nextProducts.map((product) => [product.id, product]))
              const combosById = new Map(nextComboOffers.map((comboOffer) => [comboOffer.id, comboOffer]))
              const restoredCartItems = storedCartItems
                .map((item) => {
                  if (item.type === 'combo') {
                    const comboOffer = combosById.get(item.comboOfferId)
                    return comboOffer ? { type: 'combo', comboOffer, quantity: item.quantity } : null
                  }

                  const product = productsById.get(item.productId)
                  return product ? { type: 'product', product, quantity: item.quantity } : null
                })
                .filter(Boolean)

              setCartItems(restoredCartItems)
              writeStoredCartItems(restoredCartItems)
            }

            setCartHydrated(true)
          }
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadProducts()

    return () => {
      cancelled = true
    }
  }, [activeTab])

  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      try {
        const response = await fetch(`${API_URL}/profile`)
        const result = await response.json()

        if (!response.ok) {
          return
        }

        if (!cancelled) {
          setBusinessProfile(normalizeBusinessProfile(result.profile))
        }
      } catch {
        if (!cancelled) {
          setBusinessProfile(null)
        }
      }
    }

    loadProfile()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadCustomerReviews() {
      try {
        const response = await fetch(`${API_URL}/feedback-reviews/public`)
        const result = await response.json()

        if (!response.ok) {
          return
        }

        if (!cancelled) {
          setCustomerReviews((result.reviews ?? [])
            .filter((review) => review.message || review.imageUrls?.length > 0)
            .slice(0, 4))
        }
      } catch {
        if (!cancelled) {
          setCustomerReviews([])
        }
      }
    }

    loadCustomerReviews()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (activeTab !== 'my-orders') {
      return
    }

    let cancelled = false
    const storedPhoneNumber = normalizePhoneInput(readStoredCustomerPhone())

    setMyOrdersPhone(storedPhoneNumber)
    setMyOrdersError('')

    if (storedPhoneNumber.length !== 10) {
      setMyOrders([])
      return
    }

    async function loadLiveMyOrders() {
      setMyOrdersLoading(true)

      try {
        const orders = await fetchCustomerOrders(storedPhoneNumber)

        if (!cancelled) {
          setMyOrders(orders)
        }
      } catch (requestError) {
        if (!cancelled) {
          setMyOrders([])
          setMyOrdersError(requestError.message)
        }
      } finally {
        if (!cancelled) {
          setMyOrdersLoading(false)
        }
      }
    }

    loadLiveMyOrders()

    return () => {
      cancelled = true
    }
  }, [activeTab])

  useEffect(() => {
    let cancelled = false

    async function loadSpecialOffers() {
      try {
        const response = await fetch(`${API_URL}/special-offers/public`)
        const result = await response.json()

        if (!response.ok) {
          return
        }

        if (!cancelled) {
          setSpecialOfferProducts(result.products ?? [])
          setSpecialOfferCombos(result.comboOffers ?? [])
        }
      } catch {
        if (!cancelled) {
          setSpecialOfferProducts([])
          setSpecialOfferCombos([])
        }
      }
    }

    loadSpecialOffers()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedProduct && !selectedComboOffer) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        closeProductDetail()
        closeComboDetail()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedComboOffer, selectedProduct])

  useEffect(() => {
    if (cartItems.length > 0) {
      setPlacedOrder(null)
    }

    if (cartHydrated) {
      writeStoredCartItems(cartItems)
    }
  }, [cartHydrated, cartItems])

  const visibleProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const selectedCategory = activeCategorySlug === 'all' ? '' : activeCategoryName
    const selectedSubcategory = activeSubcategorySlug === 'all' ? '' : activeSubcategoryName

    return products.filter((product) => {
      const category = getCategoryLabel(product)
      const subcategory = getSubcategoryLabel(product)
      const matchesCategory = !selectedCategory || createSlug(category) === activeCategorySlug
      const matchesSubcategory = !selectedSubcategory || createSlug(subcategory) === activeSubcategorySlug
      const matchesSearch = !query || [
        product.productName,
        product.description,
        product.ingredient,
        product.storageText,
        product.shelfText,
        category,
        subcategory,
        formatQuantity(product),
      ].some((value) => value?.toLowerCase().includes(query))

      return matchesCategory && matchesSubcategory && matchesSearch
    })
  }, [activeCategoryName, activeCategorySlug, activeSubcategoryName, activeSubcategorySlug, products, searchQuery])

  const universalProductResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) {
      return []
    }

    return products.filter((product) => {
      const category = getCategoryLabel(product)
      const subcategory = getSubcategoryLabel(product)

      return [
        product.productName,
        product.description,
        product.ingredient,
        product.storageText,
        product.shelfText,
        category,
        subcategory,
        formatQuantity(product),
      ].some((value) => value?.toLowerCase().includes(query))
    })
  }, [products, searchQuery])

  const visibleComboOffers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) {
      return comboOffers
    }

    return comboOffers.filter((comboOffer) => (
      [comboOffer.comboName, comboOffer.description].some((value) => value?.toLowerCase().includes(query))
      || comboOffer.items?.some((item) => item.productName?.toLowerCase().includes(query))
    ))
  }, [comboOffers, searchQuery])
  const hasUniversalSearch = searchQuery.trim().length > 0
  const universalResultsCount = universalProductResults.length + visibleComboOffers.length

  const promotionalOffers = useMemo(() => {
    const productOffers = specialOfferProducts
      .filter((product) => PROMO_OFFER_TYPES.has(product.offerType))
      .map((product) => ({
        id: `product:${product.id}`,
        type: 'product',
        name: product.productName,
        description: getCategoryLabel(product),
        imageUrl: product.imageUrls?.[0],
        offerType: product.offerType,
        price: getProductPrice(product),
      }))
    const comboPromotions = specialOfferCombos
      .filter((comboOffer) => PROMO_OFFER_TYPES.has(comboOffer.offerType))
      .map((comboOffer) => ({
        id: `combo:${comboOffer.id}`,
        type: 'combo',
        name: comboOffer.comboName,
        description: `${comboOffer.items?.length ?? comboOffer.productIds?.length ?? 0} products`,
        imageUrl: comboOffer.imageUrls?.[0],
        offerType: comboOffer.offerType,
        price: comboOffer.comboPrice,
      }))

    return [...productOffers, ...comboPromotions]
  }, [specialOfferCombos, specialOfferProducts])
  const promoPopupImageSrc = promotionalOffers.some((offer) => offer.offerType === 'limited_time')
    ? limitedOfferImageSrc
    : festivalOfferImageSrc

  useEffect(() => {
    if (!loading && !promoPopupSeen && promotionalOffers.length > 0) {
      setPromoPopupOpen(true)
      setPromoPopupSeen(true)
    }
  }, [loading, promoPopupSeen, promotionalOffers.length])

  const offerProducts = useMemo(() => {
    const offersById = new Map()

    products
      .filter((product) => (
        (product.offerPrice && product.offerPrice < product.price)
        || product.productPlacement?.current_offers
        || PROMO_OFFER_TYPES.has(product.offerType)
      ))
      .forEach((product) => offersById.set(product.id, product))

    specialOfferProducts.forEach((product) => offersById.set(product.id, product))

    return [...offersById.values()]
  }, [products, specialOfferProducts])

  const hotSellingProducts = useMemo(() => products.filter((product) => (
    product.productPlacement?.best_sellers
  )), [products])

  const newLaunchProducts = useMemo(() => products.filter((product) => (
    product.productPlacement?.new_arrivals
  )), [products])

  const featuredProducts = useMemo(() => products.slice(0, 8), [products])
  const showHomeSections = activeTab === 'all' && activeCategorySlug === 'all' && searchQuery.trim().length === 0

  function formatQuantity(product) {
    const quantity = product.weightQtyFloat ?? product.weightQtyInteger

    if (!quantity) {
      return ''
    }

    return `${quantity} ${product.weightUnit === 'kg' ? 'Kg' : 'gram'}`
  }

  function getCategoryLabel(product) {
    if (typeof product.category === 'string') {
      return product.category
    }

    return product.category?.selected ?? product.category?.name ?? ''
  }

  function getSubcategoryLabel(product) {
    if (typeof product.category === 'string') {
      return ''
    }

    return product.category?.subcategorySelected ?? product.category?.subcategoryName ?? ''
  }

  function formatPrice(price) {
    if (price === null || price === undefined || price === '') {
      return ''
    }

    return `Rs. ${Number(price).toLocaleString('en-IN')}`
  }

  function formatOrderDate(value) {
    if (!value) {
      return ''
    }

    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  }

  function getOrderStatusLabel(status) {
    const labels = {
      confirmed: 'Confirmed',
      preparing: 'Preparing',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      processed: 'Confirmed',
      packed: 'Preparing',
      in_transit: 'Shipped',
    }

    return labels[status] ?? status
  }

  function getOrderStatusClass(status) {
    const classes = {
      confirmed: 'border-[#8a5200] text-[#8a5200]',
      preparing: 'border-[#6d28d9] text-[#6d28d9]',
      shipped: 'border-[#2457a6] text-[#2457a6]',
      delivered: 'border-[#0f8b4c] text-[#0f8b4c]',
      cancelled: 'border-[#b42318] text-[#b42318]',
      processed: 'border-[#8a5200] text-[#8a5200]',
      packed: 'border-[#6d28d9] text-[#6d28d9]',
      in_transit: 'border-[#2457a6] text-[#2457a6]',
    }

    return classes[status] ?? 'border-[#eadfce] text-[#1f2418]'
  }

  function getOfferPercent(product) {
    if (!product.offerPrice || !product.price || product.offerPrice >= product.price) {
      return null
    }

    return Math.round(((product.price - product.offerPrice) / product.price) * 100)
  }

  function getProductOfferTypeLabel(offerType) {
    if (offerType === 'limited_time') {
      return 'Limited time'
    }

    if (offerType === 'festival') {
      return 'Festival'
    }

    return ''
  }

  function getProductPrice(product) {
    return product.offerPrice && product.offerPrice < product.price ? product.offerPrice : product.price
  }

  function isProductOrderable(product) {
    return Boolean(product?.active) && product?.stockNumber !== 0
  }

  function isComboOrderable(comboOffer) {
    return Boolean(comboOffer?.active)
  }

  function renderProductTile(product, { compact = false } = {}) {
    const imageUrl = product.imageUrls?.[0]
    const hasOffer = product.offerPrice && product.offerPrice < product.price
    const categoryLabel = getCategoryLabel(product)
    const quantityLabel = formatQuantity(product)
    const offerPercent = getOfferPercent(product)
    const offerTypeLabel = getProductOfferTypeLabel(product.offerType)
    const orderable = isProductOrderable(product)

    return (
      <article key={product.id} className={compact ? 'w-36 shrink-0 md:w-44' : 'group min-w-0'}>
        <button
          type="button"
          onClick={() => openProductDetail(product)}
          className={[
            'relative block w-full overflow-hidden rounded-xl bg-[#f4efe4] text-left transition duration-300 focus:outline-none focus:ring-2 focus:ring-[#31542a]/25',
            compact ? 'aspect-square border border-[#e7decf]' : 'aspect-[4/5] shadow-card hover:-translate-y-0.5 hover:shadow-pop',
          ].join(' ')}
          aria-label={`View ${product.productName}`}
        >
          <img
            src={imageUrl || BRAND_LOGO_SRC}
            alt={product.productName}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
          {offerPercent || offerTypeLabel ? (
            <div className="absolute left-2 top-2 flex max-w-[calc(100%-1rem)] flex-wrap gap-1.5">
              {offerPercent ? (
                <span className="rounded-md bg-[#496b2f] px-2 py-1 text-[10px] font-extrabold text-white shadow-card md:text-xs">
                  {offerPercent}% Off
                </span>
              ) : null}
              {offerTypeLabel ? (
                <span className="rounded-md bg-[#cf4500] px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.06em] text-white shadow-card md:text-xs">
                  {offerTypeLabel}
                </span>
              ) : null}
            </div>
          ) : null}
          {!orderable ? (
            <span className="absolute bottom-2 left-2 rounded-md bg-[#1f2418] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-white shadow-card md:text-xs">
              Out of stock
            </span>
          ) : null}
        </button>
        <div className={compact ? 'pt-2' : 'pt-3'}>
          {categoryLabel ? (
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.08em] text-[#6b7a48]">{categoryLabel}</p>
          ) : null}
          <h2 className={[
            'mt-1 line-clamp-2 font-extrabold leading-5 text-[#1f2418]',
            compact ? 'min-h-10 text-xs' : 'min-h-10 text-[13px] md:min-h-12 md:text-base md:leading-6 lg:min-h-14 lg:text-lg lg:leading-7',
          ].join(' ')}
          >
            <button type="button" onClick={() => openProductDetail(product)} className="text-left hover:text-[#31542a]">
              {product.productName}
            </button>
          </h2>
          {quantityLabel ? (
            <p className="mt-0.5 text-[11px] font-medium text-[#757264] md:text-xs lg:text-sm">{quantityLabel}</p>
          ) : null}
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-sm font-extrabold text-[#1f2418] md:text-base lg:text-lg">{formatPrice(hasOffer ? product.offerPrice : product.price)}</span>
            {hasOffer ? (
              <span className="text-xs font-bold text-[#8c8677] line-through md:text-sm">{formatPrice(product.price)}</span>
            ) : null}
          </div>
          {!compact ? (
            <button
              type="button"
              onClick={() => addToCart(product)}
              disabled={!orderable}
              className="mt-2 inline-flex h-9 items-center rounded-full bg-[#31542a] px-4 text-xs font-extrabold text-white transition-colors hover:bg-[#243f1f] disabled:cursor-not-allowed disabled:bg-[#d8d3ca] disabled:text-muted lg:h-11 lg:px-5 lg:text-sm"
            >
              Add to cart
            </button>
          ) : null}
        </div>
      </article>
    )
  }

  function renderProductSection(title, items, tabId) {
    if (items.length === 0) {
      return null
    }

    return (
      <section className="mt-7" aria-label={title}>
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-base font-extrabold text-[#1f2418] md:text-xl lg:text-3xl">{title}</h2>
          <button
            type="button"
            onClick={() => setActiveTab(tabId)}
            className="text-xs font-bold text-[#31542a] hover:text-[#243f1f] md:text-sm lg:text-base"
          >
            View all
          </button>
        </div>
        <div className="-mx-3 flex gap-3 overflow-x-auto px-3 pb-1 md:-mx-1 md:px-1">
          {items.slice(0, 8).map((product) => renderProductTile(product, { compact: true }))}
        </div>
      </section>
    )
  }

  function renderComboSection() {
    if (comboOffers.length === 0) {
      return null
    }

    return (
      <section className="mt-7" aria-label="Combos">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-base font-extrabold text-[#1f2418] md:text-xl lg:text-3xl">Combos</h2>
          <button
            type="button"
            onClick={() => setActiveTab('combo-offers')}
            className="text-xs font-bold text-[#31542a] hover:text-[#243f1f] md:text-sm lg:text-base"
          >
            View all
          </button>
        </div>
        <div className="space-y-5 md:grid md:grid-cols-2 md:gap-6 md:space-y-0 xl:grid-cols-3">
          {comboOffers.slice(0, 4).map((comboOffer) => (
            <article key={comboOffer.id} className="flex gap-3 lg:gap-5">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#f4efe4] lg:h-36 lg:w-36">
                <button type="button" onClick={() => openComboDetail(comboOffer)} className="block h-full w-full" aria-label={`View ${comboOffer.comboName}`}>
                  <img src={comboOffer.imageUrls?.[0] || BRAND_LOGO_SRC} alt={comboOffer.comboName} className="h-full w-full object-cover" />
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#6b7a48] lg:text-sm">{comboOffer.items?.length ?? 0} products</p>
                {!isComboOrderable(comboOffer) ? <p className="mt-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-signal">Out of stock</p> : null}
                <h3 className="mt-1 line-clamp-2 text-sm font-extrabold text-[#1f2418] lg:text-xl lg:leading-7">
                  <button type="button" onClick={() => openComboDetail(comboOffer)} className="text-left hover:text-[#31542a]">
                    {comboOffer.comboName}
                  </button>
                </h3>
                <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-[#757264] lg:line-clamp-4 lg:text-base lg:leading-7">{comboOffer.description}</p>
                <div className="mt-2 flex items-center justify-between gap-2 lg:mt-4">
                  <span className="text-sm font-extrabold text-[#1f2418] lg:text-xl">{formatPrice(comboOffer.comboPrice)}</span>
                  <button
                    type="button"
                    onClick={() => addComboToCart(comboOffer)}
                    disabled={!isComboOrderable(comboOffer)}
                    className="rounded-full bg-[#31542a] px-3 py-1.5 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:bg-[#d8d3ca] disabled:text-muted lg:px-5 lg:py-2.5 lg:text-sm"
                  >
                    Add to cart
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    )
  }

  function renderDiscountTicker() {
    if (!businessProfile?.discountEnabled || !businessProfile.discountCode) {
      return null
    }

    const discountLabel = businessProfile.discountType === 'percent'
      ? `${businessProfile.discountValue}% off`
      : `${formatPrice(businessProfile.discountValue)} off`
    const minimumOrderLabel = Number(businessProfile.discountMinOrderAmount) > 0
      ? `on orders above ${formatPrice(businessProfile.discountMinOrderAmount)}`
      : 'on your order'
    const tickerText = `Exclusive saving: use code ${businessProfile.discountCode} and get ${discountLabel} ${minimumOrderLabel}`

    return (
      <button
        type="button"
        onClick={() => {
          updateOrderField('discountCode', businessProfile.discountCode)
          setCartOpen(true)
        }}
        className="group mb-3 flex h-9 w-full items-center overflow-hidden border-y border-[#e1d4bd] bg-transparent text-left focus:outline-none lg:mb-4 lg:h-11"
        aria-label={`Use discount code ${businessProfile.discountCode}`}
      >
        <div className="coupon-code-marquee flex min-w-max items-center gap-7 whitespace-nowrap text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#8a3b0b] lg:text-sm">
          {Array.from({ length: 4 }).map((_, index) => (
            <span key={index} className="flex items-center gap-3">
              <Tag className="h-3.5 w-3.5 shrink-0 text-[#31542a] lg:h-4 lg:w-4" />
              <span>{tickerText}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#31542a]" />
            </span>
          ))}
        </div>
      </button>
    )
  }

  function renderFooterImageSection() {
    const whatsappLink = getWhatsappLink()
    const instagramLink = businessProfile?.instagramLink

    return (
      <section className="-mx-3 mb-[-2.75rem] mt-7 overflow-hidden bg-[#25351f] pb-11 shadow-card md:-mx-6 md:mb-[-2.75rem] md:pb-11 lg:-mx-8 lg:mb-[-1.5rem] lg:pb-6 xl:-mx-12 2xl:-mx-16" aria-label="Lakshmi Kai Pakkuvam food tradition">
        <img
          src={footerImageSrc}
          alt="Bringing the taste of tradition to your home"
          className="h-auto w-full object-cover"
        />
        <div className="flex items-center justify-center gap-4 px-3 py-4 md:gap-8 md:px-6 md:py-6">
          {FOOTER_BADGES.map((badge) => (
            <div key={badge.src} className="h-20 w-20 overflow-hidden rounded-full md:h-28 md:w-28">
              <img src={badge.src} alt={badge.alt} className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-4 px-4 pb-5 pt-1 md:flex-row md:items-end md:justify-between md:px-6 md:pb-6">
          <div className="min-w-0 text-white">
            <h2 className="text-base font-extrabold md:text-xl">{businessProfile?.name ?? 'Lakshmi Kai Pakkuvam'}</h2>
            <div className="mt-2 space-y-1 text-xs font-semibold leading-5 text-white/75 md:text-sm">
              {businessProfile?.number ? <p>Contact: <span className="text-white">{businessProfile.number}</span></p> : null}
              {businessProfile?.whatsapp ? <p>WhatsApp: <span className="text-white">{businessProfile.whatsapp}</span></p> : null}
              {businessProfile?.address ? <p className="max-w-2xl">Address: <span className="text-white">{businessProfile.address}</span></p> : null}
            </div>
          </div>
          {whatsappLink || instagramLink ? (
            <div className="flex justify-end gap-2">
              {whatsappLink ? (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:-translate-y-0.5 md:h-12 md:w-12"
                  aria-label="Open WhatsApp chat"
                >
                  <img src={SOCIAL_ICON_URLS.whatsapp} alt="" className="h-5 w-5 md:h-6 md:w-6" />
                </a>
              ) : null}
              {instagramLink ? (
                <a
                  href={instagramLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:-translate-y-0.5 md:h-12 md:w-12"
                  aria-label="Open Instagram profile"
                >
                  <img src={SOCIAL_ICON_URLS.instagram} alt="" className="h-5 w-5 md:h-6 md:w-6" />
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="border-t border-white/10 px-4 pb-4 pt-4 text-center md:px-6">
          <p className="text-xs font-semibold text-white/55 md:text-sm">
            Made with love by{' '}
            <a
              href="https://linkedin.com/company/zyvocorp/?viewAsMember=true"
              target="_blank"
              rel="noreferrer"
              className="font-extrabold text-white transition-colors hover:text-[#d9bd8a]"
            >
              Zyvo
            </a>
          </p>
          <p className="mt-2 text-[11px] font-semibold text-white/45 md:text-xs">
            Licensed © {new Date().getFullYear()} Lakshmi Kai Pakkuvam.
          </p>
        </div>
      </section>
    )
  }

  function renderFoundationSection() {
    return (
      <section className="mt-8 border-y border-[#e7dcc9] py-6 md:mt-10 md:py-8" aria-labelledby="foundation-heading">
        <div className="grid gap-5 md:grid-cols-[140px_0.8fr_1.1fr] md:items-center">
          <div className="h-24 w-24 overflow-hidden rounded-full border border-[#d9bd8a] bg-[#1d1510] shadow-card md:h-32 md:w-32">
            <img src={founderImageSrc} alt="Lakshmi Kai Pakkuvam founder and family legacy" className="h-full w-full object-cover object-top" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#8a5f2f] md:text-xs">Meet the founder</p>
            <h2 id="foundation-heading" className="mt-2 text-2xl font-black leading-tight text-[#1f2418] md:text-3xl">
              Rooted in family. Carried forward with love.
            </h2>
          </div>
          <div className="space-y-3 text-sm font-semibold leading-6 text-[#625d4f] md:text-[15px] md:leading-7">
            <p>
              Lakshmi Kai Pakkuvam was founded by Harini Ganesan, a 22-year-old entrepreneur, as a tribute to her grandmother Lakshmi and the Burmese flavours that shaped her childhood.
            </p>
            <p>
              With her mother Indhra carrying forward the family recipes and food knowledge, Harini is bringing authentic cultural flavours to Tamil Nadu with care, trust and value.
            </p>
          </div>
        </div>
      </section>
    )
  }

  function renderCustomerReviewsSection() {
    if (customerReviews.length === 0) {
      return null
    }

    const marqueeReviews = customerReviews.length > 1
      ? [...customerReviews, ...customerReviews]
      : customerReviews

    return (
      <section className="mt-8 overflow-hidden border-y border-[#e7dcc9] py-6 md:mt-10 md:py-8 lg:py-12" aria-labelledby="customer-reviews-heading">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#8a5f2f] md:text-xs lg:text-sm">Customer reviews</p>
            <h2 id="customer-reviews-heading" className="mt-2 text-2xl font-black leading-tight text-[#1f2418] md:text-3xl lg:text-5xl">
              Loved by verified customers
            </h2>
          </div>
        </div>
        <div className="overflow-hidden">
          <div className={`${customerReviews.length > 1 ? 'customer-review-marquee' : ''} flex w-max gap-4 md:gap-5 lg:gap-7`}>
            {marqueeReviews.map((review, index) => {
              const rating = Math.min(5, Math.max(1, Number(review.rating) || 5))
              const customerName = review.customerName?.trim() || 'Customer'

              return (
                <article
                  key={`${review.id}-${index}`}
                  className="w-[285px] shrink-0 border-l-2 border-[#d9bd8a] bg-white/35 px-4 py-4 backdrop-blur-sm md:w-[360px] md:px-5 lg:w-[430px] lg:px-7 lg:py-6"
                >
                  <div className="flex items-center gap-1 text-[#d98600]" aria-label={`${rating} out of 5 stars`}>
                    {Array.from({ length: 5 }).map((_, starIndex) => (
                      <Star
                        key={starIndex}
                        className={starIndex < rating ? 'h-4 w-4 fill-current md:h-5 md:w-5 lg:h-7 lg:w-7' : 'h-4 w-4 text-[#d8cbbb] md:h-5 md:w-5 lg:h-7 lg:w-7'}
                        strokeWidth={2.4}
                      />
                    ))}
                    <span className="ml-2 text-xs font-extrabold text-[#1f2418] lg:text-base">{rating}/5</span>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-[#413d34] md:text-[15px] md:leading-7 lg:mt-5 lg:text-xl lg:leading-9">
                    {review.message ? `"${review.message}"` : 'Shared by customer'}
                  </p>
                  {review.imageUrls?.length > 0 ? (
                    <div className="mt-3 flex gap-2 overflow-hidden">
                      {review.imageUrls.slice(0, 2).map((imageUrl) => (
                        <img key={imageUrl} src={imageUrl} alt="" className="h-24 w-24 rounded-xl border border-[#eadfce] object-cover md:h-28 md:w-28 lg:h-36 lg:w-36" />
                      ))}
                    </div>
                  ) : null}
                  <p className="mt-3 text-xs font-extrabold uppercase tracking-[0.08em] text-[#8a5f2f] lg:mt-5 lg:text-sm">
                    - {customerName}, verified customer
                  </p>
                </article>
              )
            })}
          </div>
        </div>
      </section>
    )
  }

  function renderProfilePage() {
    return (
      <div className="rounded-3xl border border-[#e8decd] bg-white p-5 shadow-card md:p-7">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-full bg-[#f3eadc]">
            <img src={BRAND_LOGO_SRC} alt="" className="h-full w-full object-cover object-top" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold text-[#1f2418]">{businessProfile?.name ?? 'Lakshmi Kai Pakkuvam'}</h2>
            <p className="mt-1 text-sm font-medium leading-6 text-[#74715f]">Authentic homemade Burmese delicacies, sambals, dry fish and vegetarian favourites.</p>
          </div>
        </div>
        <div className="mt-6 space-y-3 text-sm font-semibold text-[#1f2418]">
          {businessProfile?.number ? <p>Contact: {businessProfile.number}</p> : null}
          {businessProfile?.whatsapp ? <p>WhatsApp: {businessProfile.whatsapp}</p> : null}
          {businessProfile?.address ? <p>Address: {businessProfile.address}</p> : null}
        </div>
      </div>
    )
  }

  function renderMyOrdersPage() {
    const hasSavedPhoneNumber = normalizePhoneInput(myOrdersPhone).length === 10

    return (
      <div className="space-y-5">
        <div className="border-b border-[#e8decd] pb-5 md:pb-7">
          <h2 className="text-xl font-extrabold text-[#1f2418]">My Orders</h2>
          <p className="mt-2 text-sm font-medium leading-6 text-[#74715f]">
            Live order updates and courier tracking details appear here after the admin updates your order.
          </p>
          {myOrdersError ? <p className="mt-3 text-sm font-bold text-signal">{myOrdersError}</p> : null}
        </div>

        {!hasSavedPhoneNumber ? (
          <div className="flex min-h-56 items-center justify-center px-5 text-center">
            <div className="max-w-xs">
              <div className="mx-auto flex h-14 w-14 items-center justify-center text-[#31542a]">
                <PackageCheck className="h-7 w-7" />
              </div>
              <p className="mt-4 text-lg font-extrabold text-[#1f2418]">No order phone found</p>
              <p className="mt-2 text-sm font-medium leading-6 text-[#74715f]">Place an order once and your orders will appear here automatically.</p>
            </div>
          </div>
        ) : myOrdersLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse border-b border-[#eadfce]" />
            ))}
          </div>
        ) : myOrders.length === 0 ? (
          <div className="flex min-h-56 items-center justify-center px-5 text-center">
            <div className="max-w-xs">
              <div className="mx-auto flex h-14 w-14 items-center justify-center text-[#31542a]">
                <PackageCheck className="h-7 w-7" />
              </div>
              <p className="mt-4 text-lg font-extrabold text-[#1f2418]">No orders found</p>
              <p className="mt-2 text-sm font-medium leading-6 text-[#74715f]">Orders placed with this phone number will appear here.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {myOrders.map((order) => (
              <article key={order.id} className="border-b border-[#eadfce] pb-5 last:border-b-0">
                <div className="flex flex-wrap items-start justify-between gap-3 pb-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#74715f]">{formatOrderDate(order.createdAt)}</p>
                    <h3 className="mt-1 text-lg font-extrabold text-[#1f2418]">{order.orderNumber}</h3>
                  </div>
                  <span className={`rounded-full border px-3 py-1.5 text-xs font-extrabold ${getOrderStatusClass(order.status)}`}>
                    {getOrderStatusLabel(order.status)}
                  </span>
                </div>
                <div>
                  <div className="space-y-3">
                    {(order.items ?? []).map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <div className="h-16 w-14 shrink-0 overflow-hidden">
                          <img src={item.productImageUrl || BRAND_LOGO_SRC} alt="" className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-extrabold uppercase leading-5 text-[#1f2418]">{item.productName}</p>
                          <p className="mt-1 text-xs font-semibold text-[#74715f]">{[item.weightLabel, `Qty ${item.quantity}`].filter(Boolean).join(' / ')}</p>
                        </div>
                        <p className="text-sm font-extrabold text-[#1f2418]">{formatPrice(item.lineTotal)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-[#eadfce] pt-4 text-base font-extrabold text-[#1f2418]">
                    <span>Products total</span>
                    <span>{formatPrice(order.subtotalAmount)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm font-bold text-[#74715f]">
                    <span>Delivery charge</span>
                    <span>{formatPrice(order.deliveryCharge ?? 0)}</span>
                  </div>
                  {(order.discountAmount ?? 0) > 0 ? (
                    <div className="mt-2 flex items-center justify-between text-sm font-bold text-[#0f8b4c]">
                      <span>Discount {order.discountCode ? `(${order.discountCode})` : ''}</span>
                      <span>-{formatPrice(order.discountAmount)}</span>
                    </div>
                  ) : null}
                  <div className="mt-2 flex items-center justify-between text-base font-extrabold text-[#1f2418]">
                    <span>Total</span>
                    <span>{formatPrice(order.grandTotalAmount ?? order.subtotalAmount)}</span>
                  </div>
                  {order.payment?.status === 'success' ? (
                    <p className="mt-3 text-xs font-extrabold text-[#0f8b4c]">
                      Payment successful
                    </p>
                  ) : null}
                  <div className="mt-3 border-l-2 border-[#d9bd8a] pl-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8a5f2f]">Tracking ID</p>
                    <p className="mt-1 break-all text-sm font-extrabold text-[#1f2418]">
                      {order.trackingId || 'Will be updated after dispatch'}
                    </p>
                  </div>
                  {[order.deliveryDistrict, order.deliveryState, order.deliveryPincode].filter(Boolean).length > 0 ? (
                    <p className="mt-2 text-xs font-semibold text-[#74715f]">
                      Delivery: {[order.deliveryDistrict, order.deliveryState, order.deliveryPincode].filter(Boolean).join(' / ')}
                    </p>
                  ) : null}
                  {order.feedback ? (
                    <p className="mt-2 text-xs font-semibold text-[#74715f]">Feedback submitted: {order.feedback.rating} / 5 stars</p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    )
  }

  function selectCategory(categorySlug, subcategorySlug = 'all') {
    setActiveCategorySlug(categorySlug)
    setActiveSubcategorySlug(subcategorySlug)
    setActiveTab('products')
    setCategoryFilterOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openPromotionalOffers() {
    setPromoPopupOpen(false)
    setActiveCategorySlug('all')
    setActiveSubcategorySlug('all')
    setActiveTab(promotionalOffers.some((offer) => offer.type === 'product') ? 'offers' : 'combo-offers')
  }

  function getCartItemKey(item) {
    return item.type === 'combo' ? `combo:${item.comboOffer.id}` : `product:${item.product.id}`
  }

  function getCartItemName(item) {
    return item.type === 'combo' ? item.comboOffer.comboName : item.product.productName
  }

  function getCartItemImage(item) {
    return item.type === 'combo' ? item.comboOffer.imageUrls?.[0] : item.product.imageUrls?.[0]
  }

  function getCartItemPrice(item) {
    return item.type === 'combo' ? item.comboOffer.comboPrice : getProductPrice(item.product)
  }

  function getCartItemQuantityLabel(item) {
    return item.type === 'combo' ? `${item.comboOffer.items?.length ?? 0} products` : formatQuantity(item.product)
  }

  function getContactNumber() {
    return businessProfile?.whatsapp || businessProfile?.number || ''
  }

  function getWhatsappLink(orderNumber) {
    const contactNumber = getContactNumber().replace(/\D/g, '')

    if (!contactNumber) {
      return ''
    }

    const message = orderNumber
      ? `Hi Lakshmi Kai Pakkuvam, I placed order ${orderNumber}.`
      : 'Hi Lakshmi Kai Pakkuvam, I need help with my order.'

    return `https://wa.me/${contactNumber}?text=${encodeURIComponent(message)}`
  }

  function addToCart(product, quantity = 1) {
    if (!isProductOrderable(product)) {
      return
    }

    const safeQuantity = Math.max(1, Number(quantity) || 1)
    const key = `product:${product.id}`

    setCartItems((items) => {
      const existing = items.find((item) => getCartItemKey(item) === key)

      if (existing) {
        return items.map((item) => (
          getCartItemKey(item) === key ? { ...item, quantity: item.quantity + safeQuantity } : item
        ))
      }

      return [...items, { type: 'product', product, quantity: safeQuantity }]
    })

    setAddedProductId(key)
  }

  function addComboToCart(comboOffer, quantity = 1) {
    if (!isComboOrderable(comboOffer)) {
      return
    }

    const safeQuantity = Math.max(1, Number(quantity) || 1)
    const key = `combo:${comboOffer.id}`

    setCartItems((items) => {
      const existing = items.find((item) => getCartItemKey(item) === key)

      if (existing) {
        return items.map((item) => (
          getCartItemKey(item) === key ? { ...item, quantity: item.quantity + safeQuantity } : item
        ))
      }

      return [...items, { type: 'combo', comboOffer, quantity: safeQuantity }]
    })

    setAddedProductId(key)
  }

  function openProductDetail(product) {
    setSelectedProduct(product)
    setSelectedComboOffer(null)
    setSelectedImageIndex(0)
    setDetailQuantity(1)
    setOpenDetailSection('about')
  }

  function closeProductDetail() {
    setSelectedProduct(null)
  }

  function openComboDetail(comboOffer) {
    setSelectedComboOffer(comboOffer)
    setSelectedProduct(null)
    setSelectedImageIndex(0)
    setDetailQuantity(1)
    setOpenDetailSection('about')
  }

  function closeComboDetail() {
    setSelectedComboOffer(null)
  }

  function updateDetailQuantity(nextQuantity) {
    const maxQuantity = selectedProduct?.stockNumber > 0 ? selectedProduct.stockNumber : 99
    const safeQuantity = Math.min(maxQuantity, Math.max(1, nextQuantity))
    setDetailQuantity(safeQuantity)
  }

  function addDetailProductToCart() {
    if (!selectedProduct) {
      return
    }

    addToCart(selectedProduct, detailQuantity)
  }

  function addDetailComboToCart() {
    if (!selectedComboOffer) {
      return
    }

    addComboToCart(selectedComboOffer, detailQuantity)
  }

  function handleBuyNow() {
    addDetailProductToCart()
  }

  function handleComboBuyNow() {
    addDetailComboToCart()
  }

  async function shareProduct(product) {
    const shareData = {
      title: product.productName,
      text: product.description || product.productName,
      url: window.location.href,
    }

    if (navigator.share) {
      await navigator.share(shareData)
      return
    }

    await navigator.clipboard?.writeText(window.location.href)
  }

  async function shareComboOffer(comboOffer) {
    const shareData = {
      title: comboOffer.comboName,
      text: comboOffer.description || comboOffer.comboName,
      url: window.location.href,
    }

    if (navigator.share) {
      await navigator.share(shareData)
      return
    }

    await navigator.clipboard?.writeText(window.location.href)
  }

  const selectedImages = selectedProduct
    ? (selectedProduct.imageUrls?.length ? selectedProduct.imageUrls : [BRAND_LOGO_SRC])
    : []
  const selectedImage = selectedImages[selectedImageIndex] ?? selectedImages[0]
  const selectedHasOffer = Boolean(selectedProduct?.offerPrice && selectedProduct.offerPrice < selectedProduct.price)
  const selectedOfferPercent = selectedProduct ? getOfferPercent(selectedProduct) : null
  const selectedOfferTypeLabel = selectedProduct ? getProductOfferTypeLabel(selectedProduct.offerType) : ''
  const selectedPrice = selectedProduct ? getProductPrice(selectedProduct) : null
  const selectedQuantityLabel = selectedProduct ? formatQuantity(selectedProduct) : ''
  const selectedCategoryLabel = selectedProduct ? getCategoryLabel(selectedProduct) : ''
  const selectedCanOrder = isProductOrderable(selectedProduct)
  const selectedStockLabel = selectedCanOrder ? 'In stock' : 'Out of stock'
  const detailSections = selectedProduct
    ? [
        { id: 'about', title: 'About the product', content: selectedProduct.description },
        { id: 'ingredients', title: 'Ingredients', content: selectedProduct.ingredient },
        { id: 'storage', title: 'Storage instructions', content: selectedProduct.storageText },
        { id: 'shelf-life', title: 'Shelf life', content: selectedProduct.shelfText },
      ].filter((section) => section.content?.trim())
    : []
  const selectedComboImages = selectedComboOffer
    ? (selectedComboOffer.imageUrls?.length ? selectedComboOffer.imageUrls : [BRAND_LOGO_SRC])
    : []
  const selectedComboImage = selectedComboImages[selectedImageIndex] ?? selectedComboImages[0]
  const selectedComboProductsCount = selectedComboOffer?.items?.length ?? selectedComboOffer?.productIds?.length ?? 0
  const selectedComboCanOrder = isComboOrderable(selectedComboOffer)
  const comboDetailSections = selectedComboOffer
    ? [
        { id: 'about', title: 'About this combo', content: selectedComboOffer.description },
        {
          id: 'items',
          title: 'Combo includes',
          content: selectedComboOffer.items?.map((item) => `${item.productName}${item.weightLabel ? ` - ${item.weightLabel}` : ''}`).join('\n'),
        },
      ].filter((section) => section.content?.trim())
    : []

  function updateCartQuantity(itemKey, nextQuantity) {
    if (nextQuantity <= 0) {
      setCartItems((items) => items.filter((item) => getCartItemKey(item) !== itemKey))
      return
    }

    setCartItems((items) => items.map((item) => (
      getCartItemKey(item) === itemKey ? { ...item, quantity: nextQuantity } : item
    )))
  }

  function updateOrderField(field, value) {
    const nextValue = field === 'discountCode' ? normalizeDiscountCode(value) : value
    setOrderForm((form) => ({
      ...form,
      [field]: nextValue,
      ...(field === 'deliveryState' && form.deliveryState !== nextValue ? { deliveryDistrict: '' } : {}),
    }))
    if (field === 'discountCode') {
      setDiscountStatus('')
    }
    setOrderErrors((errors) => {
      if (!errors[field] && !(field === 'deliveryState' && errors.deliveryDistrict)) {
        return errors
      }

      const nextErrors = { ...errors }
      delete nextErrors[field]
      if (field === 'deliveryState') {
        delete nextErrors.deliveryDistrict
      }
      return nextErrors
    })
  }

  function applyDiscountCode() {
    if (!orderForm.discountCode.trim()) {
      setDiscountStatus('Enter a discount code.')
      return
    }

    if (!businessProfile?.discountEnabled) {
      setDiscountStatus('No discount code is active right now.')
      return
    }

    if (estimatedDiscount.valid) {
      setDiscountStatus(`Discount applied: ${formatPrice(estimatedDiscount.amount)} off.`)
      return
    }

    if (normalizeDiscountCode(orderForm.discountCode) === normalizeDiscountCode(businessProfile.discountCode)) {
      setDiscountStatus(`Minimum order required: ${formatPrice(businessProfile.discountMinOrderAmount ?? 0)}.`)
      return
    }

    setDiscountStatus('Invalid discount code.')
  }

  function validateOrderForm() {
    const details = {}

    if (!orderForm.customerName.trim()) {
      details.customerName = 'Name is required.'
    }

    if (!orderForm.phoneNumber.trim()) {
      details.phoneNumber = 'Phone number is required.'
    }

    if (!orderForm.deliveryAddress.trim()) {
      details.deliveryAddress = 'Address is required.'
    }

    if (!orderForm.deliveryState.trim()) {
      details.deliveryState = 'State is required.'
    }

    if (!orderForm.deliveryDistrict.trim()) {
      details.deliveryDistrict = 'District is required.'
    }

    if (!orderForm.deliveryPincode.trim()) {
      details.deliveryPincode = 'PIN code is required.'
    }

    if (!orderForm.billingSameAsShipping) {
      if (!orderForm.billingName.trim()) {
        details.billingName = 'Billing name is required.'
      }

      if (!orderForm.billingAddress.trim()) {
        details.billingAddress = 'Billing address is required.'
      }

      if (!orderForm.billingCity.trim()) {
        details.billingCity = 'Billing city is required.'
      }

      if (!orderForm.billingState.trim()) {
        details.billingState = 'Billing state is required.'
      }

      if (!orderForm.billingPincode.trim()) {
        details.billingPincode = 'Billing PIN code is required.'
      }
    }

    if (cartItems.length === 0) {
      details.items = 'Add at least one product.'
    }

    return details
  }

  async function submitOrder(event) {
    event.preventDefault()

    const validationErrors = validateOrderForm()

    if (Object.keys(validationErrors).length > 0) {
      setOrderErrors(validationErrors)
      return
    }

    setOrderSubmitting(true)
    setOrderErrors({})

    try {
      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...orderForm,
          items: cartItems.map((item) => (
            item.type === 'combo'
              ? { type: 'combo', comboOfferId: item.comboOffer.id, quantity: item.quantity }
              : { type: 'product', productId: item.product.id, quantity: item.quantity }
          )),
        }),
      })
      const result = await response.json()

      if (!response.ok) {
        const message = result.error ?? 'Order could not be placed.'
        setOrderErrors({ form: message, ...(result.details ?? {}) })
        return
      }

      const paymentResponse = await fetch(`${API_URL}/payments/test-success`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: result.order.id }),
      })
      const paymentResult = await paymentResponse.json()

      if (!paymentResponse.ok) {
        const message = paymentResult.error ?? 'Test payment could not be completed.'
        setOrderErrors({ form: message, ...(paymentResult.details ?? {}) })
        return
      }

      writeStoredDeliveryAddress(orderForm)
      writeStoredCustomerPhone(orderForm.phoneNumber)
      setMyOrdersPhone(normalizePhoneInput(orderForm.phoneNumber))
      setMyOrders([{ ...result.order, payment: paymentResult.payment }])
      setLastDeliveryAddress(readStoredDeliveryAddress())
      setPlacedOrder({ ...result.order, payment: paymentResult.payment })
      setCartItems([])
      setOrderForm(EMPTY_ORDER_FORM)
      setFeedbackRating(5)
      setFeedbackMessage('')
      setFeedbackStatus('')
      setFeedbackError('')
    } catch {
      setOrderErrors({ form: 'Order could not be placed. Please try again.' })
    } finally {
      setOrderSubmitting(false)
    }
  }

  async function submitFeedback(event) {
    event.preventDefault()

    if (!placedOrder?.id || !placedOrder?.payment?.id) {
      setFeedbackError('Payment details are missing for this order.')
      return
    }

    setFeedbackSubmitting(true)
    setFeedbackError('')
    setFeedbackStatus('')

    try {
      const response = await fetch(`${API_URL}/feedback-reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: placedOrder.id,
          paymentId: placedOrder.payment.id,
          rating: feedbackRating,
          message: feedbackMessage,
        }),
      })
      const result = await response.json()

      if (!response.ok) {
        const message = result.error ?? 'Feedback could not be submitted.'
        setFeedbackError(message)
        return
      }

      setPlacedOrder((order) => ({ ...order, feedback: result.feedback }))
      setFeedbackStatus('Thank you for your feedback.')
    } catch {
      setFeedbackError('Feedback could not be submitted. Please try again.')
    } finally {
      setFeedbackSubmitting(false)
    }
  }

  function clearPlacedOrder(nextView) {
    setPlacedOrder(null)
    setFeedbackRating(5)
    setFeedbackMessage('')
    setFeedbackStatus('')
    setFeedbackError('')

    if (nextView === 'cart') {
      setCartOpen(false)
      return
    }

    setCheckoutOpen(false)
  }

  function renderOrderSuccess(nextView) {
    return (
      <div className="w-full max-w-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e9fff2] text-[#0f8b4c] shadow-card">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <p className="mt-5 text-2xl font-extrabold text-ink">Payment successful</p>
        <p className="mt-2 text-sm font-medium leading-6 text-muted">
          Your order number is <span className="font-extrabold text-ink">{placedOrder.orderNumber}</span>.
        </p>
        {placedOrder.payment?.providerPaymentId ? (
          <p className="mt-2 break-all text-xs font-semibold text-muted">
            Payment ID: <span className="text-ink">{placedOrder.payment.providerPaymentId}</span>
          </p>
        ) : null}

        {placedOrder.feedback ? (
          <div className="mt-6 rounded-3xl border border-[#d7eedf] bg-[#f3fff7] px-5 py-4 text-center">
            <p className="text-sm font-extrabold text-[#0f8b4c]">Feedback submitted</p>
            <p className="mt-1 text-sm font-medium text-muted">Thanks for helping us improve.</p>
          </div>
        ) : (
          <form onSubmit={submitFeedback} className="mt-6 rounded-3xl border border-[#eadfce] bg-white px-5 py-5 text-left shadow-card">
            <p className="text-center text-base font-extrabold text-ink">How was your experience?</p>
            <div className="mt-4 flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setFeedbackRating(rating)}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-[#f7a21b] transition-transform hover:scale-105"
                  aria-label={`${rating} star rating`}
                >
                  <Star className={rating <= feedbackRating ? 'h-7 w-7 fill-current' : 'h-7 w-7'} />
                </button>
              ))}
            </div>
            <textarea
              value={feedbackMessage}
              onChange={(event) => setFeedbackMessage(event.target.value)}
              placeholder="Write your feedback (optional)"
              className="mt-4 min-h-24 w-full resize-none rounded-2xl border border-[#eadfce] bg-[#fffaf3] px-4 py-3 text-sm font-medium text-ink outline-none placeholder:text-muted focus:border-signal"
            />
            {feedbackError ? <p className="mt-2 text-sm font-bold text-signal">{feedbackError}</p> : null}
            {feedbackStatus ? <p className="mt-2 text-sm font-bold text-[#0f8b4c]">{feedbackStatus}</p> : null}
            <button
              type="submit"
              disabled={feedbackSubmitting}
              className="mt-4 h-11 w-full rounded-full bg-ink text-sm font-extrabold uppercase tracking-[0.08em] text-white transition-colors hover:bg-signal disabled:cursor-not-allowed disabled:bg-muted"
            >
              {feedbackSubmitting ? 'Submitting...' : 'Submit feedback'}
            </button>
          </form>
        )}

        {businessProfile?.number ? (
          <p className="mt-5 text-sm font-semibold text-muted">
            Contact: <span className="text-ink">{businessProfile.number}</span>
          </p>
        ) : null}
        <div className="mt-5 flex flex-col gap-3">
          {getWhatsappLink(placedOrder.orderNumber) ? (
            <a
              href={getWhatsappLink(placedOrder.orderNumber)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#0f8b4c] px-7 text-sm font-extrabold uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#0b6c3a]"
            >
              WhatsApp business
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => clearPlacedOrder(nextView)}
            className="h-12 rounded-full bg-ink px-7 text-sm font-extrabold uppercase tracking-[0.08em] text-white transition-colors hover:bg-signal"
          >
            Continue shopping
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`user-ordering-app user-ordering-app--${viewportMode} user-ordering-theme--${themeMode} min-h-screen bg-[#fbf7ec] font-[Poppins] text-[#1f2418]`}>
      <header className="sticky top-0 z-30 bg-[#fbf7ec]/95 px-4 py-3 backdrop-blur-md md:px-6">
        <div className="mx-auto flex w-full max-w-none items-center justify-between gap-3 xl:px-6 2xl:px-10">
          {activeTab === 'all' ? (
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f3eadc] text-[#8a3b0b] focus:outline-none focus:ring-2 focus:ring-[#8a3b0b]/25 lg:h-12 lg:w-12"
                aria-label="Home"
              >
                <img src={BRAND_LOGO_SRC} alt="" className="h-full w-full rounded-full object-cover object-top" />
              </button>
              <div className="min-w-0">
                {lastDeliveryAddress ? (
                  <>
                    <p className="text-[10px] font-medium text-[#74715f] lg:text-sm">Deliver to</p>
                    <p className="truncate text-xs font-extrabold text-[#1f2418] md:text-sm lg:text-lg">
                      {[lastDeliveryAddress.address, lastDeliveryAddress.district, lastDeliveryAddress.state, lastDeliveryAddress.pincode].filter(Boolean).join(' - ')}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] font-medium text-[#74715f] lg:text-sm">Lakshmi Kai Pakkuvam</p>
                    <p className="truncate text-xs font-extrabold text-[#1f2418] md:text-sm lg:text-lg">Authentic homemade food</p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveCategorySlug('all')
                  setActiveSubcategorySlug('all')
                  setActiveTab('all')
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#1f2418] hover:bg-[#f3eadc]"
                aria-label="Back to home"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h1 className="truncate text-base font-extrabold text-[#1f2418] md:text-lg">
                {activeTab === 'products'
                  ? 'All Products'
                  : activeTab === 'hot-selling'
                    ? 'Hot Sale'
                    : activeTab === 'new-launched'
                      ? 'New Launches'
                      : activeTab === 'combo-offers'
                        ? 'Combos'
                        : activeTab === 'profile'
                          ? 'Profile'
                          : activeTab === 'my-orders'
                            ? 'My Orders'
                            : 'Offers'}
              </h1>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setThemeMode((mode) => (mode === 'dark' ? 'light' : 'dark'))}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#1f2418] hover:bg-[#f3eadc]"
              aria-label={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {themeMode === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <div className="hidden items-center gap-1 rounded-full border border-[#e8decd] bg-white/55 px-2 py-1 shadow-card backdrop-blur-md lg:flex">
              {PRODUCT_TABS.map((tab) => {
                const Icon = tab.icon
                const active = activeTab === tab.id || (tab.id === 'products' && ['hot-selling', 'new-launched', 'combo-offers'].includes(activeTab))

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveCategorySlug('all')
                      setActiveSubcategorySlug('all')
                      setActiveTab(tab.id)
                    }}
                    className={[
                      'flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-extrabold transition-colors lg:h-11 lg:px-4 lg:text-sm',
                      active ? 'bg-[#fff3df] text-[#8a3b0b]' : 'text-[#74715f] hover:text-[#31542a]',
                    ].join(' ')}
                  >
                    <Icon className="h-4 w-4 shrink-0 lg:h-5 lg:w-5" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#1f2418] hover:bg-[#f3eadc]"
              aria-label="Open cart"
            >
              <IconShoppingBag className="h-5 w-5" />
              {cartCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#8a3b0b] px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </header>

      <main className={`mx-auto flex ${layout.shell} flex-col`}>
        {activeTab === 'all' ? (
          <>
            {renderDiscountTicker()}
            <div className="relative">
              <IconSearch className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#1f2418]" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search authentic sea dry food dishes..."
                className="h-12 w-full rounded-2xl border border-[#e8decd] bg-white px-4 pr-11 text-sm font-medium text-[#1f2418] outline-none placeholder:text-[#74715f] focus:border-[#31542a] lg:h-16 lg:px-6 lg:pr-14 lg:text-lg"
              />
            </div>
            <button
              type="button"
              onClick={() => setCategoryFilterOpen(true)}
              className="mt-3 flex h-10 w-fit items-center gap-2 border-b-2 border-[#31542a] px-0 text-xs font-extrabold uppercase tracking-[0.1em] text-[#31542a] transition-colors hover:border-[#cf4500] hover:text-[#cf4500] focus:outline-none md:text-sm lg:mt-5 lg:h-12 lg:text-base"
              aria-label="Open categories filter"
            >
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#8a3b0b] opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-[#8a3b0b]" />
              </span>
              <ListFilter className="h-4 w-4 md:h-5 md:w-5" />
              <span>Categories</span>
            </button>
            <section className="-mx-3 mt-4 overflow-hidden bg-[#25351f] shadow-card md:-mx-6 lg:-mx-8 xl:-mx-12 2xl:-mx-16">
              <div className="relative">
                <img
                  src={bannerImageSrc}
                  alt="Lakshmi Kai Pakkuvam authentic food products"
                  className="h-auto w-full object-cover"
                />
              </div>
            </section>
          </>
        ) : null}

        {!['all', 'combo-offers', 'profile', 'my-orders'].includes(activeTab) && categories.length > 0 ? (
          <button
            type="button"
            onClick={() => setCategoryFilterOpen(true)}
            className="mt-4 inline-flex h-10 w-fit items-center gap-2 border-b-2 border-[#31542a] px-0 text-xs font-extrabold uppercase tracking-[0.1em] text-[#31542a] transition-colors hover:border-[#cf4500] hover:text-[#cf4500] md:text-sm"
          >
            <ListFilter className="h-4 w-4" />
            {activeCategorySlug === 'all' ? 'Categories' : [activeCategoryName, activeSubcategoryName].filter(Boolean).join(' / ')}
          </button>
        ) : null}

        <section className="pt-4" aria-labelledby={`${activeTab}-products`}>
          <h1 id={`${activeTab}-products`} className="sr-only">
            {PRODUCT_TABS.find((tab) => tab.id === activeTab)?.label}
          </h1>

          {loading ? (
            <div className={`grid ${layout.grid}`}>
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="overflow-hidden rounded-2xl border border-[#eadfce] bg-white shadow-card">
                  <div className="aspect-square bg-[#f3eadc]" />
                  <div className="space-y-3 p-3 md:p-4">
                    <div className="h-3.5 w-11/12 rounded-full bg-[#eadfce]" />
                    <div className="h-3 w-2/3 rounded-full bg-[#eadfce]" />
                    <div className="h-8 rounded-full bg-[#eadfce]" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex min-h-48 items-center justify-center rounded-2xl border border-[#eadfce] bg-white px-4 text-center shadow-card">
              <div>
                <p className="text-base font-bold text-ink">Products could not be loaded</p>
                <p className="mt-2 text-sm font-semibold text-signal">{error}</p>
              </div>
            </div>
          ) : activeTab === 'profile' ? (
            renderProfilePage()
          ) : activeTab === 'my-orders' ? (
            renderMyOrdersPage()
          ) : hasUniversalSearch ? (
            universalResultsCount === 0 ? (
              <div className="flex min-h-56 items-center justify-center rounded-2xl border border-[#eadfce] bg-white px-5 text-center shadow-card">
                <div className="max-w-sm">
                  <p className="text-lg font-bold text-ink">No matches found</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-muted">Try searching product names, categories, ingredients, or combo names.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {universalProductResults.length > 0 ? (
                  <section aria-label="Product search results">
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                      <h2 className="text-base font-extrabold text-[#1f2418] md:text-xl">Products</h2>
                      <span className="text-xs font-bold text-muted md:text-sm">{universalProductResults.length} found</span>
                    </div>
                    <div className={`grid ${layout.grid}`}>
                      {universalProductResults.map((product) => renderProductTile(product))}
                    </div>
                  </section>
                ) : null}
                {visibleComboOffers.length > 0 ? (
                  <section aria-label="Combo search results">
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                      <h2 className="text-base font-extrabold text-[#1f2418] md:text-xl">Combos</h2>
                      <span className="text-xs font-bold text-muted md:text-sm">{visibleComboOffers.length} found</span>
                    </div>
                    <div className={`grid ${layout.grid}`}>
                      {visibleComboOffers.map((comboOffer) => {
                        const imageUrl = comboOffer.imageUrls?.[0]
                        const productsCount = comboOffer.items?.length ?? comboOffer.productIds?.length ?? 0

                        return (
                          <article key={comboOffer.id} className="group min-w-0">
                            <button type="button" onClick={() => openComboDetail(comboOffer)} className="relative block aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[#f5eadb] text-left shadow-card transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-pop" aria-label={`View ${comboOffer.comboName}`}>
                              <img src={imageUrl || BRAND_LOGO_SRC} alt={comboOffer.comboName} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                              <span className="absolute left-3 top-3 rounded-full bg-ink px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-white shadow-card md:left-4 md:top-4 md:text-xs">Combo</span>
                              {!isComboOrderable(comboOffer) ? <span className="absolute bottom-3 left-3 rounded-md bg-[#1f2418] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-white shadow-card md:text-xs">Out of stock</span> : null}
                            </button>
                            <div className="pt-3">
                              <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-signal/75 md:text-xs">{productsCount} products</p>
                              <h2 className="mt-1 line-clamp-2 min-h-10 text-[13px] font-extrabold uppercase leading-5 tracking-[0.02em] text-[#363331] md:min-h-12 md:text-base md:leading-6">
                                <button type="button" onClick={() => openComboDetail(comboOffer)} className="text-left hover:text-[#31542a]">{comboOffer.comboName}</button>
                              </h2>
                              <p className="mt-1 line-clamp-2 min-h-10 text-xs font-medium leading-5 text-muted md:text-sm">{comboOffer.description}</p>
                              <p className="mt-1.5 text-sm font-extrabold text-[#363331] md:text-base">{formatPrice(comboOffer.comboPrice)}</p>
                              <button type="button" onClick={() => addComboToCart(comboOffer)} disabled={!isComboOrderable(comboOffer)} className="mt-2 text-xs font-extrabold uppercase tracking-[0.08em] text-signal underline decoration-signal/35 underline-offset-4 transition-colors hover:text-clay disabled:cursor-not-allowed disabled:text-muted md:text-sm">Add to bag</button>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  </section>
                ) : null}
              </div>
            )
          ) : showHomeSections ? (
            <div>
              {renderProductSection('Featured Products', featuredProducts, 'products')}
              {renderProductSection('Hot Selling', hotSellingProducts, 'hot-selling')}
              {renderProductSection('New Launches', newLaunchProducts, 'new-launched')}
              {renderProductSection('Offers', offerProducts, 'offers')}
              {renderComboSection()}
              {renderCustomerReviewsSection()}
              {renderFoundationSection()}
              {renderFooterImageSection()}
            </div>
          ) : activeTab === 'combo-offers' ? (
            visibleComboOffers.length === 0 ? (
              <div className="flex min-h-56 items-center justify-center rounded-2xl border border-[#eadfce] bg-white px-5 text-center shadow-card">
                <div className="max-w-sm">
                  <p className="text-lg font-bold text-ink">No combo offers available right now</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-muted">Combo specials will appear here once they are published.</p>
                </div>
              </div>
            ) : (
              <div className={`grid ${layout.grid}`}>
                {visibleComboOffers.map((comboOffer) => {
                  const imageUrl = comboOffer.imageUrls?.[0]
                  const productsCount = comboOffer.items?.length ?? comboOffer.productIds?.length ?? 0

                  return (
                    <article key={comboOffer.id} className="group min-w-0">
                      <button type="button" onClick={() => openComboDetail(comboOffer)} className="relative block aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[#f5eadb] text-left shadow-card transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-pop" aria-label={`View ${comboOffer.comboName}`}>
                        <img
                          src={imageUrl || BRAND_LOGO_SRC}
                          alt={comboOffer.comboName}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                        />
                        <span className="absolute left-3 top-3 rounded-full bg-ink px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-white shadow-card md:left-4 md:top-4 md:text-xs">
                          Combo
                        </span>
                        {!isComboOrderable(comboOffer) ? (
                          <span className="absolute bottom-3 left-3 rounded-md bg-[#1f2418] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-white shadow-card md:text-xs">
                            Out of stock
                          </span>
                        ) : null}
                      </button>
                      <div className="pt-3">
                        <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-signal/75 md:text-xs">
                          {productsCount} products
                        </p>
                        <h2 className="mt-1 line-clamp-2 min-h-10 text-[13px] font-extrabold uppercase leading-5 tracking-[0.02em] text-[#363331] md:min-h-12 md:text-base md:leading-6">
                          <button type="button" onClick={() => openComboDetail(comboOffer)} className="text-left hover:text-[#31542a]">
                            {comboOffer.comboName}
                          </button>
                        </h2>
                        <p className="mt-1 line-clamp-2 min-h-10 text-xs font-medium leading-5 text-muted md:text-sm">
                          {comboOffer.description}
                        </p>
                        <div className="mt-1.5">
                          <span className="text-sm font-extrabold text-[#363331] md:text-base">
                            {formatPrice(comboOffer.comboPrice)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => addComboToCart(comboOffer)}
                          disabled={!isComboOrderable(comboOffer)}
                          className="mt-2 text-xs font-extrabold uppercase tracking-[0.08em] text-signal underline decoration-signal/35 underline-offset-4 transition-colors hover:text-clay disabled:cursor-not-allowed disabled:text-muted md:text-sm"
                        >
                          Add to bag
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )
          ) : visibleProducts.length === 0 ? (
            <div className="flex min-h-56 items-center justify-center rounded-2xl border border-[#eadfce] bg-white px-5 text-center shadow-card">
              <div className="max-w-sm">
                <p className="text-lg font-bold text-ink">
                  {activeCategorySlug === 'all' ? 'No products available right now' : `No products in ${activeCategoryName} yet`}
                </p>
                <p className="mt-2 text-sm font-medium leading-6 text-muted">
                  {activeCategorySlug === 'all'
                    ? 'Fresh homemade specials will appear here once they are added.'
                    : 'Choose another category or check again after new products are added.'}
                </p>
              </div>
            </div>
          ) : (
            <div className={`grid ${layout.grid}`}>
              {visibleProducts.map((product) => renderProductTile(product))}
            </div>
          )}
        </section>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#e8decd] bg-[#fbf7ec]/95 px-2 pb-2 pt-1.5 backdrop-blur-md md:left-1/2 md:max-w-3xl md:-translate-x-1/2 md:rounded-t-3xl md:border md:border-b-0 md:px-4 lg:hidden" aria-label="Primary navigation">
        <div className="grid grid-cols-4 gap-1">
          {PRODUCT_TABS.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id || (tab.id === 'products' && ['hot-selling', 'new-launched', 'combo-offers'].includes(activeTab))

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveCategorySlug('all')
                  setActiveSubcategorySlug('all')
                  setActiveTab(tab.id)
                }}
                className={[
                  'flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl text-[9px] font-semibold transition-colors min-[380px]:text-[10px] md:min-h-14 md:text-xs',
                  active ? 'text-[#8a3b0b]' : 'text-[#74715f] hover:text-[#31542a]',
                ].join(' ')}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="max-w-full whitespace-nowrap">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {promoPopupOpen && promotionalOffers.length > 0 ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-[2px]" onClick={() => setPromoPopupOpen(false)}>
          <div
            className="relative w-full max-w-sm md:max-w-md"
            aria-label="Festival and limited time offers"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPromoPopupOpen(false)}
              className="absolute -right-1 -top-9 z-10 text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.45)] transition-transform hover:scale-110 focus:outline-none md:-right-7 md:-top-7"
              aria-label="Close festival offer"
            >
              <X className="h-8 w-8" strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={openPromotionalOffers}
              className="block w-full overflow-hidden shadow-lift focus:outline-none focus:ring-2 focus:ring-white/70"
              aria-label="View festival and limited time offers"
            >
              <img
                src={promoPopupImageSrc}
                alt={promotionalOffers.some((offer) => offer.offerType === 'limited_time') ? 'Limited time offers' : 'Festival offers'}
                className="h-auto max-h-[78vh] w-full object-contain"
              />
            </button>
          </div>
        </div>
      ) : null}

      {categoryFilterOpen ? (
        <div className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px]" onClick={() => setCategoryFilterOpen(false)}>
          <aside
            className="absolute bottom-0 left-0 top-0 flex h-full w-[88vw] max-w-sm flex-col bg-[#fffaf3] shadow-lift md:w-[380px]"
            aria-label="Filter products by category"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#eadfce] bg-white px-5 py-5">
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-signal">Browse by</p>
                <h2 className="truncate text-xl font-extrabold text-ink">Categories</h2>
              </div>
              <button
                type="button"
                onClick={() => setCategoryFilterOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center text-ink transition-colors hover:text-signal"
                aria-label="Close categories filter"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <button
                type="button"
                onClick={() => selectCategory('all')}
                className={[
                  'mb-3 flex w-full items-center justify-between gap-3 border-l-4 px-3 py-3 text-left transition-colors',
                  activeCategorySlug === 'all'
                    ? 'border-[#31542a] bg-white text-[#1f2418]'
                    : 'border-transparent bg-white text-[#5f5b4f] hover:border-[#31542a]/50 hover:text-[#1f2418]',
                ].join(' ')}
              >
                <span className="text-sm font-extrabold uppercase tracking-[0.04em]">All products</span>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </button>
              {categories.length === 0 ? (
                <div className="border border-[#eadfce] bg-white px-4 py-6 text-center">
                  <p className="text-sm font-extrabold text-ink">No categories available</p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-muted">Categories will appear here once they are added in admin.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#eadfce] border-y border-[#eadfce] bg-white">
                  {categories.map((category) => {
                    const active = category.slug === activeCategorySlug && activeSubcategorySlug === 'all'
                    const expanded = expandedCategoryIds.includes(category.id)
                    const subcategories = category.subcategories ?? []

                    return (
                      <div key={category.id}>
                        <div className={[
                          'grid grid-cols-[minmax(0,1fr)_44px] border-l-4 transition-colors',
                          active ? 'border-[#31542a] bg-white text-[#1f2418]' : 'border-transparent text-[#5f5b4f] hover:border-[#31542a]/50 hover:bg-[#fff7ed] hover:text-[#1f2418]',
                        ].join(' ')}
                        >
                          <button type="button" onClick={() => selectCategory(category.slug)} className="min-w-0 px-3 py-4 text-left">
                            <span className="block truncate text-sm font-extrabold uppercase tracking-[0.04em] md:text-base">{category.name}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpandedCategoryIds((ids) => (ids.includes(category.id) ? ids.filter((id) => id !== category.id) : [...ids, category.id]))}
                            className="flex h-full items-center justify-center"
                            aria-label={`Show ${category.name} subcategories`}
                          >
                            {subcategories.length > 0 ? (
                              <ChevronDown className={expanded ? 'h-4 w-4 rotate-180 transition-transform' : 'h-4 w-4 transition-transform'} />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        {expanded && subcategories.length > 0 ? (
                          <div className="bg-[#fffaf3] py-1 pl-5">
                            {subcategories.map((subcategory) => {
                              const subcategoryActive = activeCategorySlug === category.slug && activeSubcategorySlug === subcategory.slug

                              return (
                                <button
                                  key={subcategory.id}
                                  type="button"
                                  onClick={() => selectCategory(category.slug, subcategory.slug)}
                                  className={[
                                    'flex w-full items-center justify-between gap-3 border-l-2 px-3 py-3 text-left transition-colors',
                                    subcategoryActive ? 'border-[#8a3b0b] text-[#1f2418]' : 'border-transparent text-[#6f6a5e] hover:border-[#8a3b0b]/50 hover:text-[#1f2418]',
                                  ].join(' ')}
                                >
                                  <span className="min-w-0 truncate text-xs font-extrabold uppercase tracking-[0.06em] md:text-sm">{subcategory.name}</span>
                                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                                </button>
                              )
                            })}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </aside>
        </div>
      ) : null}

      {selectedProduct ? (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-[#fffaf3] font-[Poppins] text-ink">
          <div className="sticky top-0 z-20 border-b border-[#eadfce] bg-[#fffaf3]/95 px-3 py-3 backdrop-blur-xl md:px-6">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
              <button
                type="button"
                onClick={closeProductDetail}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#eadfce] bg-white text-ink transition-colors hover:border-signal hover:text-signal"
                aria-label="Close product details"
              >
                <X className="h-5 w-5" />
              </button>
              <p className="min-w-0 flex-1 truncate text-center text-sm font-bold uppercase tracking-[0.08em] text-[#363331] md:hidden">
                {selectedProduct.productName}
              </p>
              <button
                type="button"
                onClick={() => shareProduct(selectedProduct).catch(() => undefined)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#eadfce] bg-white text-ink transition-colors hover:border-signal hover:text-signal"
                aria-label="Share product"
              >
                <Share2 className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          <div className="mx-auto grid max-w-7xl gap-6 px-3 py-4 pb-10 md:grid-cols-[minmax(420px,0.9fr)_minmax(360px,0.8fr)] md:px-6 md:py-8 lg:grid-cols-[minmax(520px,1fr)_minmax(420px,0.75fr)] lg:gap-12 xl:grid-cols-[minmax(640px,1fr)_minmax(460px,0.65fr)]">
            <section className="min-w-0 md:sticky md:top-24 md:self-start" aria-label="Product images">
              <div className={selectedImages.length > 1 ? 'grid gap-3 md:grid-cols-[76px_minmax(0,1fr)] lg:grid-cols-[92px_minmax(0,1fr)]' : 'grid gap-3'}>
                {selectedImages.length > 1 ? (
                  <div className="order-2 flex gap-2 overflow-x-auto pb-1 md:order-1 md:flex-col md:overflow-visible md:pb-0">
                    {selectedImages.map((imageUrl, index) => (
                      <button
                        key={`${imageUrl}-${index}`}
                        type="button"
                        onClick={() => setSelectedImageIndex(index)}
                        className={[
                          'h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-[#f5eadb] transition-colors md:h-20 md:w-full lg:h-24',
                          selectedImageIndex === index ? 'border-ink' : 'border-[#eadfce] hover:border-signal',
                        ].join(' ')}
                        aria-label={`Show product image ${index + 1}`}
                      >
                        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="order-1 md:order-2">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#f5eadb] shadow-card md:h-[calc(100vh-150px)] md:max-h-[760px] md:min-h-[520px] md:aspect-auto">
                    <img src={selectedImage} alt={selectedProduct.productName} className="h-full w-full object-contain" />
                    {selectedOfferPercent || selectedOfferTypeLabel ? (
                      <div className="absolute left-4 top-4 flex max-w-[calc(100%-2rem)] flex-wrap gap-2">
                        {selectedOfferPercent ? (
                          <span className="rounded bg-[#ff5b49] px-3 py-1.5 text-sm font-extrabold text-white shadow-card">
                            -{selectedOfferPercent}%
                          </span>
                        ) : null}
                        {selectedOfferTypeLabel ? (
                          <span className="rounded bg-[#cf4500] px-3 py-1.5 text-sm font-extrabold uppercase tracking-[0.06em] text-white shadow-card">
                            {selectedOfferTypeLabel}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    {selectedImages.length > 1 ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setSelectedImageIndex((index) => (index === 0 ? selectedImages.length - 1 : index - 1))}
                          className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-ink shadow-card transition-colors hover:text-signal"
                          aria-label="Previous product image"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedImageIndex((index) => (index + 1) % selectedImages.length)}
                          className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-ink shadow-card transition-colors hover:text-signal"
                          aria-label="Next product image"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => window.open(selectedImage, '_blank', 'noopener,noreferrer')}
                      className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-ink shadow-card transition-colors hover:text-signal"
                      aria-label="Open product image"
                    >
                      <Maximize2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="min-w-0 md:pt-1" aria-label="Product details">
              {selectedCategoryLabel ? (
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-signal/80">{selectedCategoryLabel}</p>
              ) : null}
              <h1 className="mt-2 text-2xl font-extrabold uppercase leading-tight tracking-[0.03em] text-[#32302e] md:text-4xl">
                {selectedProduct.productName}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[#eadfce] pb-5">
                {selectedHasOffer ? (
                  <span className="text-lg font-bold text-muted line-through md:text-2xl">{formatPrice(selectedProduct.price)}</span>
                ) : null}
                <span className="text-2xl font-extrabold text-[#32302e] md:text-3xl">{formatPrice(selectedPrice)}</span>
                {selectedQuantityLabel ? (
                  <span className="rounded-full border border-[#eadfce] bg-white px-3 py-1 text-sm font-bold text-muted">
                    {selectedQuantityLabel}
                  </span>
                ) : null}
              </div>

              <div className="mt-5 flex items-center gap-3 text-base font-bold">
                <CheckCircle2 className={selectedCanOrder ? 'h-5 w-5 text-[#0f8b4c]' : 'h-5 w-5 text-muted'} />
                <span className={selectedCanOrder ? 'text-[#0f8b4c]' : 'text-muted'}>{selectedStockLabel}</span>
              </div>

              <div className="mt-6 flex gap-3">
                <div className="flex h-12 w-32 shrink-0 items-center justify-between rounded-full border border-[#eadfce] bg-white px-3 md:h-14 md:w-44 md:px-5">
                  <button
                    type="button"
                    onClick={() => updateDetailQuantity(detailQuantity - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-ink transition-colors hover:bg-[#fff2e5] disabled:text-muted md:h-9 md:w-9"
                    disabled={detailQuantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4 md:h-5 md:w-5" />
                  </button>
                  <span className="text-base font-extrabold text-ink md:text-lg">{detailQuantity}</span>
                  <button
                    type="button"
                    onClick={() => updateDetailQuantity(detailQuantity + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-ink transition-colors hover:bg-[#fff2e5] md:h-9 md:w-9"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4 md:h-5 md:w-5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={addDetailProductToCart}
                  disabled={!selectedCanOrder}
                  className="flex h-12 flex-1 items-center justify-center whitespace-nowrap rounded-full bg-[#e9e7e3] px-4 text-xs font-extrabold uppercase tracking-[0.06em] text-[#363331] transition-colors hover:bg-[#ddd8d0] disabled:cursor-not-allowed disabled:text-muted md:h-14 md:px-6 md:text-sm md:tracking-[0.08em]"
                >
                  Add to cart
                </button>
              </div>

              <button
                type="button"
                onClick={handleBuyNow}
                disabled={!selectedCanOrder}
                className="mt-3 flex h-12 w-full items-center justify-center rounded-full bg-[#333333] px-6 text-sm font-extrabold uppercase tracking-[0.08em] text-white transition-colors hover:bg-signal disabled:cursor-not-allowed disabled:bg-muted md:h-14"
              >
                Buy it now
              </button>

              <div className="mt-5 flex flex-wrap gap-3 border-b border-[#eadfce] pb-5">
                <button
                  type="button"
                  onClick={() => shareProduct(selectedProduct).catch(() => undefined)}
                  className="inline-flex h-12 items-center gap-3 rounded-full border border-[#eadfce] bg-white px-4 text-sm font-bold text-[#363331] transition-colors hover:border-signal hover:text-signal"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff8ef]">
                    <Share2 className="h-4 w-4" />
                  </span>
                  Share
                </button>
              </div>

              {detailSections.length > 0 ? (
                <div className="mt-6 divide-y divide-[#eadfce]">
                  {detailSections.map((section) => {
                    const open = openDetailSection === section.id

                    return (
                      <div key={section.id} className="py-1">
                        <button
                          type="button"
                          onClick={() => setOpenDetailSection(open ? '' : section.id)}
                          className={[
                            'flex w-full items-center justify-between py-4 text-left text-sm font-extrabold uppercase tracking-[0.12em] transition-colors md:text-base',
                            open ? 'text-ink' : 'text-[#32302e] hover:text-signal',
                          ].join(' ')}
                        >
                          <span>{section.title}</span>
                          <Plus className={open ? 'h-5 w-5 rotate-45 transition-transform' : 'h-5 w-5 transition-transform'} />
                        </button>
                        {open ? (
                          <p className="pb-5 pt-2 text-sm font-medium leading-7 text-muted md:text-base">
                            {section.content}
                          </p>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </section>
          </div>
        </div>
      ) : null}

      {selectedComboOffer ? (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-[#fffaf3] font-[Poppins] text-ink">
          <div className="sticky top-0 z-20 border-b border-[#eadfce] bg-[#fffaf3]/95 px-3 py-3 backdrop-blur-xl md:px-6">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
              <button
                type="button"
                onClick={closeComboDetail}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#eadfce] bg-white text-ink transition-colors hover:border-signal hover:text-signal"
                aria-label="Close combo details"
              >
                <X className="h-5 w-5" />
              </button>
              <p className="min-w-0 flex-1 truncate text-center text-sm font-bold uppercase tracking-[0.08em] text-[#363331] md:hidden">
                {selectedComboOffer.comboName}
              </p>
              <button
                type="button"
                onClick={() => shareComboOffer(selectedComboOffer).catch(() => undefined)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#eadfce] bg-white text-ink transition-colors hover:border-signal hover:text-signal"
                aria-label="Share combo"
              >
                <Share2 className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          <div className="mx-auto grid max-w-7xl gap-6 px-3 py-4 pb-10 md:grid-cols-[minmax(420px,0.9fr)_minmax(360px,0.8fr)] md:px-6 md:py-8 lg:grid-cols-[minmax(520px,1fr)_minmax(420px,0.75fr)] lg:gap-12 xl:grid-cols-[minmax(640px,1fr)_minmax(460px,0.65fr)]">
            <section className="min-w-0 md:sticky md:top-24 md:self-start" aria-label="Combo images">
              <div className={selectedComboImages.length > 1 ? 'grid gap-3 md:grid-cols-[76px_minmax(0,1fr)] lg:grid-cols-[92px_minmax(0,1fr)]' : 'grid gap-3'}>
                {selectedComboImages.length > 1 ? (
                  <div className="order-2 flex gap-2 overflow-x-auto pb-1 md:order-1 md:flex-col md:overflow-visible md:pb-0">
                    {selectedComboImages.map((imageUrl, index) => (
                      <button
                        key={`${imageUrl}-${index}`}
                        type="button"
                        onClick={() => setSelectedImageIndex(index)}
                        className={[
                          'h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-[#f5eadb] transition-colors md:h-20 md:w-full lg:h-24',
                          selectedImageIndex === index ? 'border-ink' : 'border-[#eadfce] hover:border-signal',
                        ].join(' ')}
                        aria-label={`Show combo image ${index + 1}`}
                      >
                        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="order-1 md:order-2">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#f5eadb] shadow-card md:h-[calc(100vh-150px)] md:max-h-[760px] md:min-h-[520px] md:aspect-auto">
                    <img src={selectedComboImage} alt={selectedComboOffer.comboName} className="h-full w-full object-contain" />
                    <span className="absolute left-4 top-4 rounded-full bg-ink px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.08em] text-white shadow-card">
                      Combo
                    </span>
                    {selectedComboImages.length > 1 ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setSelectedImageIndex((index) => (index === 0 ? selectedComboImages.length - 1 : index - 1))}
                          className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-ink shadow-card transition-colors hover:text-signal"
                          aria-label="Previous combo image"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedImageIndex((index) => (index + 1) % selectedComboImages.length)}
                          className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-ink shadow-card transition-colors hover:text-signal"
                          aria-label="Next combo image"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => window.open(selectedComboImage, '_blank', 'noopener,noreferrer')}
                      className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-ink shadow-card transition-colors hover:text-signal"
                      aria-label="Open combo image"
                    >
                      <Maximize2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="min-w-0 md:pt-1" aria-label="Combo details">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-signal/80">{selectedComboProductsCount} products</p>
              <h1 className="mt-2 text-2xl font-extrabold uppercase leading-tight tracking-[0.03em] text-[#32302e] md:text-4xl">
                {selectedComboOffer.comboName}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[#eadfce] pb-5">
                <span className="text-2xl font-extrabold text-[#32302e] md:text-3xl">{formatPrice(selectedComboOffer.comboPrice)}</span>
              </div>

              <div className="mt-5 flex items-center gap-3 text-base font-bold">
                <CheckCircle2 className={selectedComboCanOrder ? 'h-5 w-5 text-[#0f8b4c]' : 'h-5 w-5 text-muted'} />
                <span className={selectedComboCanOrder ? 'text-[#0f8b4c]' : 'text-muted'}>{selectedComboCanOrder ? 'Available' : 'Out of stock'}</span>
              </div>

              <div className="mt-6 flex gap-3">
                <div className="flex h-12 w-32 shrink-0 items-center justify-between rounded-full border border-[#eadfce] bg-white px-3 md:h-14 md:w-44 md:px-5">
                  <button
                    type="button"
                    onClick={() => updateDetailQuantity(detailQuantity - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-ink transition-colors hover:bg-[#fff2e5] disabled:text-muted md:h-9 md:w-9"
                    disabled={detailQuantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4 md:h-5 md:w-5" />
                  </button>
                  <span className="text-base font-extrabold text-ink md:text-lg">{detailQuantity}</span>
                  <button
                    type="button"
                    onClick={() => updateDetailQuantity(detailQuantity + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-ink transition-colors hover:bg-[#fff2e5] md:h-9 md:w-9"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4 md:h-5 md:w-5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={addDetailComboToCart}
                  disabled={!selectedComboCanOrder}
                  className="flex h-12 flex-1 items-center justify-center whitespace-nowrap rounded-full bg-[#e9e7e3] px-4 text-xs font-extrabold uppercase tracking-[0.06em] text-[#363331] transition-colors hover:bg-[#ddd8d0] disabled:cursor-not-allowed disabled:text-muted md:h-14 md:px-6 md:text-sm md:tracking-[0.08em]"
                >
                  Add to cart
                </button>
              </div>

              <button
                type="button"
                onClick={handleComboBuyNow}
                disabled={!selectedComboCanOrder}
                className="mt-3 flex h-12 w-full items-center justify-center rounded-full bg-[#333333] px-6 text-sm font-extrabold uppercase tracking-[0.08em] text-white transition-colors hover:bg-signal disabled:cursor-not-allowed disabled:bg-muted md:h-14"
              >
                Buy it now
              </button>

              <div className="mt-5 flex flex-wrap gap-3 border-b border-[#eadfce] pb-5">
                <button
                  type="button"
                  onClick={() => shareComboOffer(selectedComboOffer).catch(() => undefined)}
                  className="inline-flex h-12 items-center gap-3 rounded-full border border-[#eadfce] bg-white px-4 text-sm font-bold text-[#363331] transition-colors hover:border-signal hover:text-signal"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff8ef]">
                    <Share2 className="h-4 w-4" />
                  </span>
                  Share
                </button>
                <div className="inline-flex h-12 items-center gap-3 rounded-full border border-[#eadfce] bg-white px-4 text-sm font-bold text-[#363331]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff8ef]">
                    <PackageCheck className="h-4 w-4" />
                  </span>
                  Combo order
                </div>
              </div>

              {comboDetailSections.length > 0 ? (
                <div className="mt-6 divide-y divide-[#eadfce]">
                  {comboDetailSections.map((section) => {
                    const open = openDetailSection === section.id

                    return (
                      <div key={section.id} className="py-1">
                        <button
                          type="button"
                          onClick={() => setOpenDetailSection(open ? '' : section.id)}
                          className={[
                            'flex w-full items-center justify-between py-4 text-left text-sm font-extrabold uppercase tracking-[0.12em] transition-colors md:text-base',
                            open ? 'text-ink' : 'text-[#32302e] hover:text-signal',
                          ].join(' ')}
                        >
                          <span>{section.title}</span>
                          <Plus className={open ? 'h-5 w-5 rotate-45 transition-transform' : 'h-5 w-5 transition-transform'} />
                        </button>
                        {open ? (
                          <p className="whitespace-pre-line pb-5 pt-2 text-sm font-medium leading-7 text-muted md:text-base">
                            {section.content}
                          </p>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </section>
          </div>
        </div>
      ) : null}

      {cartOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" onClick={() => setCartOpen(false)}>
          <aside
            className="absolute bottom-0 left-0 right-0 flex max-h-[86vh] flex-col rounded-t-3xl bg-[#fffaf3] shadow-lift md:bottom-auto md:left-auto md:top-0 md:h-full md:max-h-none md:w-[440px] md:rounded-none"
            onClick={(event) => event.stopPropagation()}
            aria-label="Cart"
          >
            <div className="flex items-center justify-between border-b border-[#eadfce] px-4 py-4 md:px-6">
              <div>
                <h2 className="text-xl font-extrabold text-ink md:text-2xl">Your bag</h2>
                <p className="mt-0.5 text-sm font-semibold text-muted">
                  {cartCount} {cartCount === 1 ? 'item' : 'items'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#eadfce] bg-white text-ink transition-colors hover:border-signal hover:text-signal"
                aria-label="Close cart"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {placedOrder ? (
              <div className="flex flex-1 items-center justify-center px-6 py-12 text-center">
                {renderOrderSuccess('cart')}
              </div>
            ) : cartItems.length === 0 ? (
              <div className="flex flex-1 items-center justify-center px-6 py-12 text-center">
                <div className="max-w-xs">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-signal shadow-card">
                    <IconShoppingBag className="h-7 w-7" />
                  </div>
                  <p className="mt-5 text-lg font-extrabold text-ink">Your bag is empty</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-muted">Add your favourite homemade specials to begin an order.</p>
                  <button
                    type="button"
                    onClick={() => setCartOpen(false)}
                    className="mt-6 h-11 rounded-full bg-ink px-6 text-sm font-extrabold uppercase tracking-[0.08em] text-white transition-colors hover:bg-signal"
                  >
                    Continue shopping
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 md:px-6">
                  {cartItems.map((item) => {
                    const itemKey = getCartItemKey(item)
                    const itemName = getCartItemName(item)
                    const imageUrl = getCartItemImage(item)
                    const price = getCartItemPrice(item)
                    const itemTotal = price * item.quantity
                    const quantityLabel = getCartItemQuantityLabel(item)

                    return (
                      <div key={itemKey} className="flex gap-3 border-b border-[#eadfce] py-4">
                        <div className="h-24 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#f5eadb] md:h-28 md:w-24">
                          {imageUrl ? (
                            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <img src={BRAND_LOGO_SRC} alt="" className="h-full w-full object-cover opacity-85" />
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 text-sm font-extrabold uppercase leading-5 tracking-[0.02em] text-[#363331] md:text-base">{itemName}</p>
                              {quantityLabel ? (
                                <p className="mt-1 text-xs font-semibold text-muted">{quantityLabel}</p>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(itemKey, 0)}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-signal transition-colors hover:bg-[#fff1e7]"
                              aria-label={`Remove ${itemName}`}
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>

                          <div className="mt-auto flex items-end justify-between gap-3 pt-3">
                            <div className="flex h-10 items-center rounded-full border border-[#eadfce] bg-white px-2">
                              <button
                                type="button"
                                onClick={() => updateCartQuantity(itemKey, item.quantity - 1)}
                                className="flex h-8 w-8 items-center justify-center rounded-full text-ink transition-colors hover:bg-[#fff2e5]"
                                aria-label={`Decrease ${itemName}`}
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="w-7 text-center text-sm font-extrabold text-ink">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateCartQuantity(itemKey, item.quantity + 1)}
                                className="flex h-8 w-8 items-center justify-center rounded-full text-ink transition-colors hover:bg-[#fff2e5]"
                                aria-label={`Increase ${itemName}`}
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-semibold text-muted">{formatPrice(price)} each</p>
                              <p className="mt-0.5 text-base font-extrabold text-ink">{formatPrice(itemTotal)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="border-t border-[#eadfce] bg-[#fffaf3] px-4 py-4 md:px-6">
                  <div className="flex items-center justify-between text-base font-extrabold text-ink">
                    <span>Subtotal</span>
                    <span>{formatPrice(cartTotal)}</span>
                  </div>
                <p className="mt-1 text-xs font-medium leading-5 text-muted">Review your bag and continue to buy now.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setCartOpen(false)
                      setCheckoutOpen(true)
                    }}
                    className="mt-4 h-12 w-full rounded-full bg-ink text-sm font-extrabold uppercase tracking-[0.08em] text-white transition-colors hover:bg-signal disabled:cursor-not-allowed disabled:bg-muted"
                  >
                    Buy now
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      ) : null}

      {checkoutOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-white font-[Poppins] text-ink">
          <div className="sticky top-0 z-20 border-b border-[#dedede] bg-white px-4 py-5 md:px-8">
            <div className="mx-auto grid max-w-7xl grid-cols-[44px_1fr_44px] items-center gap-3">
              <button
                type="button"
                onClick={() => setCheckoutOpen(false)}
                className="flex h-10 w-10 items-center justify-center text-ink transition-colors hover:text-signal"
                aria-label="Close checkout"
              >
                <X className="h-5 w-5" />
              </button>
              <h1 className="truncate text-center text-lg font-semibold tracking-tight text-black sm:text-2xl md:text-3xl">
                {businessProfile?.name ?? 'Lakshmi Kai Pakkuvam'}
              </h1>
              <button
                type="button"
                onClick={() => {
                  setCheckoutOpen(false)
                  setCartOpen(true)
                }}
                className="relative flex h-10 w-10 items-center justify-center justify-self-end text-signal transition-colors hover:text-clay"
                aria-label="Back to bag"
              >
                <IconShoppingBag className="h-5 w-5" />
                {cartCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-signal px-1 text-[11px] font-bold text-white">
                    {cartCount}
                  </span>
                ) : null}
              </button>
            </div>
          </div>

          {placedOrder ? (
            <div className="mx-auto flex min-h-[calc(100vh-89px)] max-w-md items-center justify-center px-5 py-12 text-center">
              {renderOrderSuccess('checkout')}
            </div>
          ) : (
            <div className="grid min-h-[calc(100vh-89px)] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.82fr)]">
              <form onSubmit={submitOrder} className="order-2 mx-auto w-full max-w-[760px] px-4 py-7 md:px-8 md:py-12 lg:order-1 lg:ml-auto lg:mr-0 lg:pr-14">
                <section>
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <h2 className="text-xl font-semibold text-black md:text-2xl">Contact</h2>
                  </div>
                  <input
                    id="checkout-phone"
                    type="tel"
                    value={orderForm.phoneNumber}
                    onChange={(event) => updateOrderField('phoneNumber', event.target.value)}
                    placeholder="Phone"
                    className="h-13 w-full rounded-2xl border border-[#d9d9d9] bg-white px-4 text-base font-medium text-black outline-none transition-colors placeholder:text-[#6b7280] focus:border-signal md:h-[58px]"
                    autoComplete="tel"
                  />
                  {orderErrors.phoneNumber ? <p className="mt-1 text-xs font-semibold text-signal">{orderErrors.phoneNumber}</p> : null}
                </section>

                <section className="mt-9">
                  <h2 className="text-xl font-semibold text-black md:text-2xl">Delivery</h2>
                  <div className="mt-5 grid gap-3">
                    <input
                      id="checkout-name"
                      type="text"
                      value={orderForm.customerName}
                      onChange={(event) => updateOrderField('customerName', event.target.value)}
                      placeholder="Full name"
                      className="h-13 w-full rounded-2xl border border-[#d9d9d9] bg-white px-4 text-base font-medium text-black outline-none transition-colors placeholder:text-[#6b7280] focus:border-signal md:h-[58px]"
                      autoComplete="name"
                    />
                    {orderErrors.customerName ? <p className="-mt-2 text-xs font-semibold text-signal">{orderErrors.customerName}</p> : null}
                    <textarea
                      id="checkout-address"
                      value={orderForm.deliveryAddress}
                      onChange={(event) => updateOrderField('deliveryAddress', event.target.value)}
                      placeholder="Address"
                      className="min-h-[82px] w-full resize-none rounded-2xl border border-[#d9d9d9] bg-white px-4 py-4 text-base font-medium leading-6 text-black outline-none transition-colors placeholder:text-[#6b7280] focus:border-signal md:min-h-[88px]"
                      autoComplete="street-address"
                    />
                    {orderErrors.deliveryAddress ? <p className="-mt-2 text-xs font-semibold text-signal">{orderErrors.deliveryAddress}</p> : null}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <SearchableLocationDropdown
                          value={orderForm.deliveryState}
                          options={stateOptions}
                          placeholder="State"
                          autoComplete="address-level1"
                          onChange={(nextState) => updateOrderField('deliveryState', nextState)}
                        />
                        {orderErrors.deliveryState ? <p className="mt-1 text-xs font-semibold text-signal">{orderErrors.deliveryState}</p> : null}
                      </div>
                      <div>
                        <SearchableLocationDropdown
                          value={orderForm.deliveryDistrict}
                          options={districtOptions}
                          placeholder={orderForm.deliveryState ? 'District' : 'Select state first'}
                          disabled={!orderForm.deliveryState}
                          autoComplete="address-level2"
                          onChange={(nextDistrict) => updateOrderField('deliveryDistrict', nextDistrict)}
                        />
                        {orderErrors.deliveryDistrict ? <p className="mt-1 text-xs font-semibold text-signal">{orderErrors.deliveryDistrict}</p> : null}
                      </div>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={orderForm.deliveryPincode}
                      onChange={(event) => updateOrderField('deliveryPincode', event.target.value)}
                      placeholder="PIN code"
                      className="h-13 w-full rounded-2xl border border-[#d9d9d9] bg-white px-4 text-base font-medium text-black outline-none transition-colors placeholder:text-[#6b7280] focus:border-signal md:h-[58px]"
                      autoComplete="postal-code"
                    />
                    {orderErrors.deliveryPincode ? <p className="-mt-2 text-xs font-semibold text-signal">{orderErrors.deliveryPincode}</p> : null}
                    <input
                      type="tel"
                      value={orderForm.whatsappNumber}
                      onChange={(event) => updateOrderField('whatsappNumber', event.target.value)}
                      placeholder="WhatsApp contact (optional)"
                      className="h-13 w-full rounded-2xl border border-[#d9d9d9] bg-white px-4 text-base font-medium text-black outline-none transition-colors placeholder:text-[#6b7280] focus:border-signal md:h-[58px]"
                      autoComplete="tel"
                    />
                    <textarea
                      value={orderForm.customerNotes}
                      onChange={(event) => updateOrderField('customerNotes', event.target.value)}
                      placeholder="Order notes (optional)"
                      className="min-h-[72px] w-full resize-none rounded-2xl border border-[#d9d9d9] bg-white px-4 py-4 text-base font-medium leading-6 text-black outline-none transition-colors placeholder:text-[#6b7280] focus:border-signal"
                    />
                  </div>
                </section>

                <section className="mt-8">
                  <h2 className="text-xl font-semibold text-black md:text-2xl">Shipping method</h2>
                  <div className="mt-5 rounded-2xl bg-[#f4f4f4] px-5 py-6 text-base font-medium text-[#69717c]">
                    {estimatedDeliveryCharge === null ? (
                      <p className="text-center">Enter state and district to view the delivery charge.</p>
                    ) : (
                      <div className="flex items-center justify-between gap-4 text-black">
                        <span>Delivery charge</span>
                        <span className="font-bold">{formatPrice(estimatedDeliveryCharge)}</span>
                      </div>
                    )}
                  </div>
                </section>

                <section className="mt-8">
                  <h2 className="text-xl font-semibold text-black md:text-2xl">Payment</h2>
                  <p className="mt-2 text-base font-medium text-[#69717c]">All transactions are secure and encrypted.</p>
                  <p className="mt-3 text-base font-medium leading-7 text-black">
                    Test payment is enabled for quick checkout. A successful payment ID will be generated after you tap Pay now.
                  </p>
                </section>

                <section className="mt-8">
                  <h2 className="text-xl font-semibold text-black md:text-2xl">Billing address</h2>
                  <div className="mt-5 overflow-hidden rounded-2xl border border-[#d9d9d9]">
                    <label
                      className={[
                        'flex cursor-pointer items-center gap-3 px-5 py-4 text-base font-medium text-black',
                        orderForm.billingSameAsShipping ? 'border-b border-signal bg-[#fff5f1]' : 'border-b border-[#d9d9d9] bg-white',
                      ].join(' ')}
                    >
                      <input
                        type="radio"
                        name="billingSameAsShipping"
                        checked={orderForm.billingSameAsShipping}
                        onChange={() => updateOrderField('billingSameAsShipping', true)}
                        className="sr-only"
                      />
                      <span className={[
                        'flex h-6 w-6 items-center justify-center rounded-full border',
                        orderForm.billingSameAsShipping ? 'border-signal bg-signal' : 'border-[#d9d9d9] bg-white',
                      ].join(' ')}
                      >
                        {orderForm.billingSameAsShipping ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
                      </span>
                      Same as shipping address
                    </label>
                    <label
                      className={[
                        'flex cursor-pointer items-center gap-3 px-5 py-4 text-base font-medium text-black',
                        !orderForm.billingSameAsShipping ? 'border-b border-signal bg-[#fff5f1]' : 'bg-white',
                      ].join(' ')}
                    >
                      <input
                        type="radio"
                        name="billingSameAsShipping"
                        checked={!orderForm.billingSameAsShipping}
                        onChange={() => updateOrderField('billingSameAsShipping', false)}
                        className="sr-only"
                      />
                      <span className={[
                        'flex h-6 w-6 items-center justify-center rounded-full border',
                        !orderForm.billingSameAsShipping ? 'border-signal bg-signal' : 'border-[#d9d9d9] bg-white',
                      ].join(' ')}
                      >
                        {!orderForm.billingSameAsShipping ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
                      </span>
                      Use a different billing address
                    </label>
                    {!orderForm.billingSameAsShipping ? (
                      <div className="grid gap-3 bg-[#f6f6f6] px-5 py-5">
                        <input
                          type="text"
                          value={orderForm.billingName}
                          onChange={(event) => updateOrderField('billingName', event.target.value)}
                          placeholder="Billing name"
                          className="h-13 w-full rounded-2xl border border-[#d9d9d9] bg-white px-4 text-base font-medium text-black outline-none transition-colors placeholder:text-[#6b7280] focus:border-signal md:h-[58px]"
                        />
                        {orderErrors.billingName ? <p className="-mt-2 text-xs font-semibold text-signal">{orderErrors.billingName}</p> : null}
                        <textarea
                          value={orderForm.billingAddress}
                          onChange={(event) => updateOrderField('billingAddress', event.target.value)}
                          placeholder="Billing address"
                          className="min-h-[82px] w-full resize-none rounded-2xl border border-[#d9d9d9] bg-white px-4 py-4 text-base font-medium leading-6 text-black outline-none transition-colors placeholder:text-[#6b7280] focus:border-signal"
                        />
                        {orderErrors.billingAddress ? <p className="-mt-2 text-xs font-semibold text-signal">{orderErrors.billingAddress}</p> : null}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <input
                            type="text"
                            value={orderForm.billingCity}
                            onChange={(event) => updateOrderField('billingCity', event.target.value)}
                            placeholder="City"
                            className="h-13 rounded-2xl border border-[#d9d9d9] bg-white px-4 text-base font-medium text-black outline-none transition-colors placeholder:text-[#6b7280] focus:border-signal md:h-[58px]"
                          />
                          <input
                            type="text"
                            value={orderForm.billingState}
                            onChange={(event) => updateOrderField('billingState', event.target.value)}
                            placeholder="State"
                            className="h-13 rounded-2xl border border-[#d9d9d9] bg-white px-4 text-base font-medium text-black outline-none transition-colors placeholder:text-[#6b7280] focus:border-signal md:h-[58px]"
                          />
                          <input
                            type="text"
                            inputMode="numeric"
                            value={orderForm.billingPincode}
                            onChange={(event) => updateOrderField('billingPincode', event.target.value)}
                            placeholder="PIN code"
                            className="h-13 rounded-2xl border border-[#d9d9d9] bg-white px-4 text-base font-medium text-black outline-none transition-colors placeholder:text-[#6b7280] focus:border-signal md:h-[58px]"
                          />
                        </div>
                        {(orderErrors.billingCity || orderErrors.billingState || orderErrors.billingPincode) ? (
                          <p className="-mt-2 text-xs font-semibold text-signal">
                            {orderErrors.billingCity || orderErrors.billingState || orderErrors.billingPincode}
                          </p>
                        ) : null}
                        <input
                          type="tel"
                          value={orderForm.billingPhone}
                          onChange={(event) => updateOrderField('billingPhone', event.target.value)}
                          placeholder="Billing phone (optional)"
                          className="h-13 w-full rounded-2xl border border-[#d9d9d9] bg-white px-4 text-base font-medium text-black outline-none transition-colors placeholder:text-[#6b7280] focus:border-signal md:h-[58px]"
                        />
                      </div>
                    ) : null}
                  </div>
                </section>

                {orderErrors.form ? <p className="mt-5 text-sm font-semibold text-signal">{orderErrors.form}</p> : null}
                {orderErrors.items ? <p className="mt-5 text-sm font-semibold text-signal">{orderErrors.items}</p> : null}

                <button
                  type="submit"
                  disabled={orderSubmitting || cartItems.length === 0}
                  className="mt-9 h-[58px] w-full rounded-2xl bg-signal px-6 text-lg font-bold text-white transition-colors hover:bg-clay disabled:cursor-not-allowed disabled:bg-muted"
                >
                  {orderSubmitting ? 'Placing order...' : 'Pay now'}
                </button>

                <div className="mt-14 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#dedede] pt-6 text-sm font-medium text-signal underline underline-offset-4">
                  <span>Refund policy</span>
                  <span>Shipping</span>
                  <span>Privacy policy</span>
                  <span>Terms of service</span>
                </div>
              </form>

              <aside className="order-1 bg-[#fff0df] px-4 py-6 md:px-8 md:py-10 lg:order-2 lg:sticky lg:top-[89px] lg:min-h-[calc(100vh-89px)] lg:self-start lg:py-14 lg:pl-12">
                <div className="mx-auto max-w-[560px] lg:mx-0">
                  <div className="space-y-3 md:space-y-4">
                    {cartItems.map((item) => {
                      const itemKey = getCartItemKey(item)
                      const itemName = getCartItemName(item)
                      const imageUrl = getCartItemImage(item)
                      const price = getCartItemPrice(item)

                      return (
                        <div key={itemKey} className="flex items-center gap-3 md:gap-4">
                          <div className="relative h-16 w-16 shrink-0 overflow-visible rounded-2xl border-2 border-white bg-[#f5eadb] shadow-card md:h-20 md:w-20">
                            <img src={imageUrl || BRAND_LOGO_SRC} alt="" className="h-full w-full rounded-2xl object-cover" />
                            <span className="absolute -right-2 -top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-black px-1 text-sm font-bold text-white">
                              {item.quantity}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-medium leading-5 text-black md:text-base md:leading-6">{itemName}</p>
                          </div>
                          <p className="text-sm font-medium text-black md:text-base">{formatPrice(price * item.quantity)}</p>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-6 grid grid-cols-[minmax(0,1fr)_88px] gap-2 md:mt-8 md:grid-cols-[minmax(0,1fr)_96px] md:gap-3">
                    <input
                      type="text"
                      value={orderForm.discountCode}
                      onChange={(event) => updateOrderField('discountCode', event.target.value)}
                      placeholder="Discount code"
                      className="h-12 min-w-0 rounded-2xl border border-[#ead8c4] bg-white px-4 text-sm font-medium outline-none placeholder:text-[#69717c] md:h-[58px] md:text-base"
                    />
                    <button type="button" onClick={applyDiscountCode} className="h-12 rounded-2xl border border-[#ead8c4] px-3 text-sm font-semibold text-[#7c746a] md:h-[58px] md:px-6 md:text-base">
                      Apply
                    </button>
                  </div>
                  {businessProfile?.discountEnabled && businessProfile.discountCode ? (
                    <p className="mt-3 text-sm font-semibold text-[#766f68]">
                      Available code: <span className="font-extrabold text-black">{businessProfile.discountCode}</span>
                    </p>
                  ) : null}
                  {discountStatus ? (
                    <p className={estimatedDiscount.valid ? 'mt-3 text-sm font-bold text-[#0f8b4c]' : 'mt-3 text-sm font-bold text-signal'}>
                      {discountStatus}
                    </p>
                  ) : null}

                  <div className="mt-10 space-y-4 text-base font-medium text-black">
                    <div className="flex items-center justify-between">
                      <span>Subtotal</span>
                      <span>{formatPrice(cartTotal)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-[#766f68]">
                      <span>Delivery charge</span>
                      <span>{estimatedDeliveryCharge === null ? 'Enter state and district' : formatPrice(estimatedDeliveryCharge)}</span>
                    </div>
                    {estimatedDiscount.amount > 0 ? (
                      <div className="flex items-center justify-between gap-4 text-[#0f8b4c]">
                        <span>Discount {estimatedDiscount.code ? `(${estimatedDiscount.code})` : ''}</span>
                        <span>-{formatPrice(estimatedDiscount.amount)}</span>
                      </div>
                    ) : null}
                    <div className="flex items-end justify-between pt-2">
                      <div>
                        <p className="text-2xl font-semibold text-black">Total</p>
                        <p className="mt-1 text-sm text-[#766f68]">Including applicable taxes</p>
                      </div>
                      <p className="text-2xl font-bold text-black">
                        <span className="mr-2 text-sm font-medium text-[#766f68]">INR</span>
                        {formatPrice(checkoutGrandTotal).replace('Rs.', 'Rs.')}
                      </p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      ) : null}
      {addedCartItem ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 px-3 backdrop-blur-[1px]" onClick={() => setAddedProductId('')}>
          <div
            className="w-full max-w-4xl bg-white px-4 py-5 shadow-lift md:px-10 md:py-8"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Product added to cart"
          >
            <div className="relative text-center">
              <button
                type="button"
                onClick={() => setAddedProductId('')}
                className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center border border-[#eadfce] text-ink transition-colors hover:border-signal hover:text-signal"
                aria-label="Close added to cart message"
              >
                <X className="h-5 w-5" />
              </button>
              <p className="flex items-center justify-center gap-2 pr-12 text-base font-medium uppercase tracking-[0.05em] text-ink md:text-xl">
                <CheckCircle2 className="h-6 w-6 text-[#0f8b4c]" />
                Successfully added to your cart.
              </p>
              <p className="mt-3 text-sm font-medium text-ink md:text-lg">
                There are {cartCount} item(s) in your cart
              </p>
            </div>

            <div className="mt-7 border-t border-[#eadfce] pt-6">
              <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_1px_minmax(280px,0.75fr)] md:items-center">
                <div className="flex gap-4">
                  <div className="h-28 w-24 shrink-0 overflow-hidden bg-[#f5eadb] md:h-32 md:w-28">
                    <img
                      src={getCartItemImage(addedCartItem) || BRAND_LOGO_SRC}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-base font-semibold text-ink md:text-lg">{getCartItemName(addedCartItem)}</p>
                    <div className="mt-3 flex h-11 w-36 items-center justify-between border border-ink px-3">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(getCartItemKey(addedCartItem), addedCartItem.quantity - 1)}
                        className="flex h-8 w-8 items-center justify-center text-ink disabled:text-muted"
                        disabled={addedCartItem.quantity <= 1}
                        aria-label={`Decrease ${getCartItemName(addedCartItem)}`}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="text-base font-semibold text-ink">{addedCartItem.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(getCartItemKey(addedCartItem), addedCartItem.quantity + 1)}
                        className="flex h-8 w-8 items-center justify-center text-ink"
                        aria-label={`Increase ${getCartItemName(addedCartItem)}`}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-3 text-base font-bold text-ink">{formatPrice(getCartItemPrice(addedCartItem))}</p>
                  </div>
                </div>

                <div className="hidden h-full bg-[#eadfce] md:block" />

                <div>
                  <p className="text-lg font-medium text-ink">
                    Cart total: <span className="font-bold">{formatPrice(cartTotal)}</span>
                  </p>
                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAddedProductId('')
                        setCartOpen(true)
                      }}
                      className="h-12 rounded-full border border-ink bg-white px-5 text-base font-semibold text-ink transition-colors hover:border-signal hover:text-signal"
                    >
                      View Cart
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddedProductId('')
                        setCheckoutOpen(true)
                      }}
                      className="h-12 rounded-full bg-[#333333] px-5 text-base font-semibold text-white transition-colors hover:bg-signal"
                    >
                      Check Out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
