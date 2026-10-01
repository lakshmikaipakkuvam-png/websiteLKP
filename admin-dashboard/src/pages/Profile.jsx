import { useEffect, useState } from 'react'

const inputClass =
  'w-full border-0 border-b-2 border-line bg-transparent px-0 py-3 text-base text-ink placeholder:text-dust focus:border-ink focus:outline-none transition-colors sm:text-lg'
const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:4000/api'
const EMPTY_PROFILE = {
  name: '',
  number: '',
  address: '',
  instagramLink: '',
  facebookLink: '',
  whatsapp: '',
  deliveryChennaiAmount: 50,
  deliveryBangaloreAmount: 70,
  deliveryDefaultAmount: 60,
  discountEnabled: false,
  discountCode: '',
  discountType: 'amount',
  discountValue: 0,
  discountMinOrderAmount: 0,
}

function normalizeProfile(profile) {
  const profileSource = profile ?? {}

  const normalizedProfile = {
    ...profileSource,
    instagramLink: profileSource.instagramLink ?? profileSource.instagram_link,
    facebookLink: profileSource.facebookLink ?? profileSource.facebook_link,
    deliveryChennaiAmount: profileSource.deliveryChennaiAmount ?? profileSource.delivery_chennai_amount,
    deliveryBangaloreAmount: profileSource.deliveryBangaloreAmount ?? profileSource.delivery_bangalore_amount,
    deliveryDefaultAmount: profileSource.deliveryDefaultAmount ?? profileSource.delivery_default_amount,
    discountEnabled: profileSource.discountEnabled ?? profileSource.discount_enabled,
    discountCode: profileSource.discountCode ?? profileSource.discount_code,
    discountType: profileSource.discountType ?? profileSource.discount_type,
    discountValue: profileSource.discountValue ?? profileSource.discount_value,
    discountMinOrderAmount: profileSource.discountMinOrderAmount ?? profileSource.discount_min_order_amount,
  }

  return Object.fromEntries(
    Object.entries(EMPTY_PROFILE).map(([key, fallback]) => [key, normalizedProfile?.[key] ?? fallback]),
  )
}

function normalizePhoneNumber(value) {
  return value.replace(/\D/g, '').slice(0, 10)
}

function normalizeAmount(value) {
  return value.replace(/\D/g, '').slice(0, 5)
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

export default function Profile() {
  const [profile, setProfile] = useState(EMPTY_PROFILE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [status, setStatus] = useState('')
  const discountNeedsValue = Boolean(profile.discountEnabled) && Number(profile.discountValue) <= 0

  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      try {
        const response = await fetch(`${API_URL}/profile`)
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error ?? 'Profile could not be loaded.')
        }

        if (!cancelled) {
          setProfile(normalizeProfile(result.profile))
        }
      } catch (error) {
        if (!cancelled) {
          setSubmitError(error.message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadProfile()

    return () => {
      cancelled = true
    }
  }, [])

  function updateProfileField(field, value) {
    const nextValue = ['number', 'whatsapp'].includes(field)
      ? normalizePhoneNumber(value)
      : ['deliveryChennaiAmount', 'deliveryBangaloreAmount', 'deliveryDefaultAmount', 'discountValue', 'discountMinOrderAmount'].includes(field)
        ? normalizeAmount(value)
        : value
    setProfile((currentProfile) => ({ ...currentProfile, [field]: nextValue }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const payload = {
      name: profile.name.trim(),
      number: profile.number.trim(),
      address: profile.address.trim(),
      instagramLink: profile.instagramLink.trim(),
      facebookLink: profile.facebookLink.trim(),
      whatsapp: profile.whatsapp.trim(),
      deliveryChennaiAmount: Number(profile.deliveryChennaiAmount),
      deliveryBangaloreAmount: Number(profile.deliveryBangaloreAmount),
      deliveryDefaultAmount: Number(profile.deliveryDefaultAmount),
      discountEnabled: Boolean(profile.discountEnabled),
      discountCode: profile.discountCode.trim().toUpperCase(),
      discountType: profile.discountType,
      discountValue: Number(profile.discountValue),
      discountMinOrderAmount: Number(profile.discountMinOrderAmount),
    }

    if (!payload.name || !payload.number || !payload.address) {
      setSubmitError('Business name, contact number, and address are required.')
      return
    }

    if (payload.number.length !== 10 || (payload.whatsapp && payload.whatsapp.length !== 10)) {
      setSubmitError('Contact number and WhatsApp contact must be 10 digits.')
      return
    }

    if (![payload.deliveryChennaiAmount, payload.deliveryBangaloreAmount, payload.deliveryDefaultAmount].every(Number.isInteger)) {
      setSubmitError('Delivery charges must be valid whole numbers.')
      return
    }

    if (payload.discountEnabled && (!payload.discountCode || !payload.discountValue)) {
      setSubmitError('Discount code and value are required when discount is enabled.')
      return
    }

    setSubmitError('')
    setStatus('')
    setSaving(true)

    try {
      const response = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()

      if (!response.ok) {
        const details = result.details ? Object.values(result.details).join(' ') : ''
        throw new Error(details || result.error || 'Profile could not be saved.')
      }

      setProfile(normalizeProfile(result.profile ?? payload))
      setStatus('Profile saved successfully.')
    } catch (error) {
      setSubmitError(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="mx-auto flex max-w-6xl flex-col pb-4 font-[Poppins] sm:pb-16" onSubmit={handleSubmit}>
      <div className="sticky top-0 z-10 -mx-4 mb-8 flex flex-col items-stretch gap-3 border-b border-line bg-lifted/95 px-4 py-4 backdrop-blur-sm sm:-mx-7 sm:mb-9 sm:items-end sm:px-7 lg:-mx-8 lg:px-8 xl:-mx-10 xl:px-10">
        <button
          type="submit"
          disabled={loading || saving}
          className="w-full rounded-none bg-yellow px-6 py-2.5 text-sm font-semibold text-ink hover:bg-yellow-dark disabled:cursor-not-allowed disabled:bg-dust sm:w-auto"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        {status ? <p className="text-sm font-bold text-[#31542a]">{status}</p> : null}
        {submitError ? <p className="text-sm font-bold text-signal">{submitError}</p> : null}
      </div>

      <section className="border-t-2 border-line pt-9">
        <div className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2">
          <Field label="Business Name" required>
            <input name="name" type="text" value={profile.name} onChange={(event) => updateProfileField('name', event.target.value)} placeholder="Enter business name" className={inputClass} />
          </Field>

          <Field label="Contact number" required>
            <input name="number" type="tel" inputMode="numeric" maxLength={10} value={profile.number} onChange={(event) => updateProfileField('number', event.target.value)} placeholder="Enter 10 digit contact number" className={inputClass} />
          </Field>

          <Field label="Address" span required>
            <textarea
              name="address"
              rows={3}
              value={profile.address}
              onChange={(event) => updateProfileField('address', event.target.value)}
              placeholder="Enter business address"
              className={`${inputClass} resize-none`}
            />
          </Field>

          <Field label="Instagram link" hint="optional">
            <input name="instagramLink" type="url" value={profile.instagramLink} onChange={(event) => updateProfileField('instagramLink', event.target.value)} placeholder="Enter Instagram link" className={inputClass} />
          </Field>

          <Field label="Facebook link" hint="optional">
            <input name="facebookLink" type="url" value={profile.facebookLink} onChange={(event) => updateProfileField('facebookLink', event.target.value)} placeholder="Enter Facebook link" className={inputClass} />
          </Field>

          <Field label="WhatsApp contact">
            <input name="whatsapp" type="tel" inputMode="numeric" maxLength={10} value={profile.whatsapp} onChange={(event) => updateProfileField('whatsapp', event.target.value)} placeholder="Enter 10 digit WhatsApp contact" className={inputClass} />
          </Field>
        </div>
      </section>

      <section className="mt-12 border-t-2 border-line pt-9">
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold text-ink">Delivery Charges</h2>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted">
            These charges are applied automatically during checkout using the customer's state and district.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-3">
          <Field label="Chennai" required>
            <input name="deliveryChennaiAmount" type="text" inputMode="numeric" value={profile.deliveryChennaiAmount} onChange={(event) => updateProfileField('deliveryChennaiAmount', event.target.value)} placeholder="50" className={inputClass} />
          </Field>
          <Field label="Bangalore" required>
            <input name="deliveryBangaloreAmount" type="text" inputMode="numeric" value={profile.deliveryBangaloreAmount} onChange={(event) => updateProfileField('deliveryBangaloreAmount', event.target.value)} placeholder="70" className={inputClass} />
          </Field>
          <Field label="Other locations" required>
            <input name="deliveryDefaultAmount" type="text" inputMode="numeric" value={profile.deliveryDefaultAmount} onChange={(event) => updateProfileField('deliveryDefaultAmount', event.target.value)} placeholder="60" className={inputClass} />
          </Field>
        </div>
      </section>

      <section className="mt-12 border-t-2 border-line pt-9">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-ink">Discount Code</h2>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted">
              One active discount code can be applied during checkout. The backend validates the final discount before payment.
            </p>
          </div>
          <span className={profile.discountEnabled ? 'w-fit bg-[#e9fff2] px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.1em] text-[#0f8b4c]' : 'w-fit bg-canvas px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.1em] text-muted'}>
            {profile.discountEnabled ? 'Active' : 'Hidden'}
          </span>
        </div>
        {profile.discountEnabled && profile.discountCode ? (
          <div className="mb-8 border border-line bg-[#1f2f1b] px-5 py-5 text-white">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#d9bd8a]">Customer banner preview</p>
            <p className="mt-2 text-xl font-black">
              Use code <span className="text-[#f7d58a]">{profile.discountCode}</span>
            </p>
            <p className="mt-1 text-sm font-semibold text-white/70">
              Customers will see this offer on the home page when the code is enabled.
            </p>
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="inline-flex cursor-pointer items-center gap-3 text-base font-bold text-ink">
              <input
                type="checkbox"
                checked={Boolean(profile.discountEnabled)}
                onChange={(event) => updateProfileField('discountEnabled', event.target.checked)}
                className="h-5 w-5 accent-yellow-dark"
              />
              Enable discount code
            </label>
            {discountNeedsValue ? (
              <p className="mt-3 text-sm font-bold text-signal">
                Add a discount value greater than zero to keep this coupon active on the customer app.
              </p>
            ) : null}
          </div>
          <Field label="Code">
            <input name="discountCode" type="text" value={profile.discountCode} onChange={(event) => updateProfileField('discountCode', event.target.value.toUpperCase())} placeholder="LKP50" className={inputClass} />
          </Field>
          <Field label="Discount type">
            <select name="discountType" value={profile.discountType} onChange={(event) => updateProfileField('discountType', event.target.value)} className={inputClass}>
              <option value="amount">Amount</option>
              <option value="percent">Percentage</option>
            </select>
          </Field>
          <Field label="Discount value">
            <input name="discountValue" type="text" inputMode="numeric" value={profile.discountValue} onChange={(event) => updateProfileField('discountValue', event.target.value)} placeholder="50" className={inputClass} />
          </Field>
          <Field label="Minimum order" hint="optional">
            <input name="discountMinOrderAmount" type="text" inputMode="numeric" value={profile.discountMinOrderAmount} onChange={(event) => updateProfileField('discountMinOrderAmount', event.target.value)} placeholder="0" className={inputClass} />
          </Field>
        </div>
      </section>
    </form>
  )
}
