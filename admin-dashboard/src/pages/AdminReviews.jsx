import { useEffect, useState } from 'react'
import { ImagePlus, Star, Trash2 } from 'lucide-react'
import AppLoader from '../components/AppLoader'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:4000/api'
const inputClass = 'w-full border-0 border-b-2 border-line bg-transparent px-0 py-3 text-base text-ink placeholder:text-dust focus:border-ink focus:outline-none transition-colors sm:text-lg'

export default function AdminReviews() {
  const [reviews, setReviews] = useState([])
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  async function loadReviews() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/admin-customer-reviews`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error ?? 'Reviews could not be loaded.')
      }

      setReviews(result.reviews ?? [])
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReviews()
  }, [])

  function addImageFiles(fileList) {
    const files = Array.from(fileList ?? []).filter((file) => file.type.startsWith('image/'))

    setImages((currentImages) => [
      ...currentImages,
      ...files.slice(0, Math.max(8 - currentImages.length, 0)).map((file) => ({
        id: crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
      })),
    ])
  }

  async function uploadImages() {
    if (images.length === 0) {
      return []
    }

    const formData = new FormData()
    images.forEach((image) => formData.append('images', image.file))

    const response = await fetch(`${API_URL}/product-images`, {
      method: 'POST',
      body: formData,
    })
    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error ?? 'Images could not be uploaded.')
    }

    return result.imageUrls ?? []
  }

  async function submitReview(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    setSaving(true)
    setStatus('')
    setError('')

    try {
      const imageUrls = await uploadImages()
      const payload = {
        customerName: formData.get('customerName')?.trim() ?? '',
        rating: formData.get('rating') ?? '',
        message: formData.get('message')?.trim() ?? '',
        imageUrls,
        active: true,
      }
      const response = await fetch(`${API_URL}/admin-customer-reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()

      if (!response.ok) {
        const details = result.details ? Object.values(result.details).join(' ') : ''
        throw new Error(details || result.error || 'Review could not be saved.')
      }

      setReviews((currentReviews) => [result.review, ...currentReviews])
      setImages([])
      event.currentTarget.reset()
      setStatus('Review published successfully.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(review) {
    setSaving(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/admin-customer-reviews/${review.id}/active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !review.active }),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error ?? 'Review status could not be updated.')
      }

      setReviews((currentReviews) => currentReviews.map((item) => (item.id === review.id ? result.review : item)))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteReview(review) {
    setSaving(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/admin-customer-reviews/${review.id}`, { method: 'DELETE' })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error ?? 'Review could not be deleted.')
      }

      setReviews((currentReviews) => currentReviews.filter((item) => item.id !== review.id))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col pb-4 font-[Poppins] sm:pb-16">
      <AppLoader active={loading || saving} label="Processing reviews" />
      <section className="border-t-2 border-line pt-9">
        <h1 className="text-2xl font-extrabold text-ink">Customer Reviews</h1>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted">
          Add customer text reviews or WhatsApp screenshot images. Active reviews are shown on the customer app.
        </p>

        <form onSubmit={submitReview} className="mt-8 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-ink sm:text-base">Customer name</label>
            <input name="customerName" type="text" placeholder="Verified customer" className={inputClass} />
          </div>
          <div>
            <label className="text-sm font-semibold text-ink sm:text-base">Rating</label>
            <select name="rating" defaultValue="5" className={inputClass}>
              {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} star</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-semibold text-ink sm:text-base">Review text</label>
            <textarea name="message" rows={4} placeholder="Paste or type the customer review" className={`${inputClass} resize-none`} />
          </div>
          <div className="sm:col-span-2">
            <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed border-line px-5 py-8 text-center text-muted transition-colors hover:border-ink hover:text-ink">
              <ImagePlus className="h-8 w-8" />
              <span className="text-sm font-bold">Upload WhatsApp review images</span>
              <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => addImageFiles(event.target.files)} />
            </label>
            {images.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-3">
                {images.map((image) => (
                  <button key={image.id} type="button" onClick={() => setImages((currentImages) => currentImages.filter((item) => item.id !== image.id))} className="h-20 w-20 overflow-hidden border border-line">
                    <img src={image.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={saving} className="rounded-none bg-yellow px-6 py-2.5 text-sm font-semibold text-ink hover:bg-yellow-dark disabled:cursor-not-allowed disabled:bg-dust">
              Publish review
            </button>
            {status ? <p className="mt-3 text-sm font-bold text-[#31542a]">{status}</p> : null}
            {error ? <p className="mt-3 text-sm font-bold text-signal">{error}</p> : null}
          </div>
        </form>
      </section>

      <section className="mt-12 border-t-2 border-line pt-9">
        <div className="grid gap-4">
          {reviews.map((review) => (
            <article key={review.id} className="grid gap-4 border-b border-line pb-5 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-extrabold text-ink">{review.customerName}</h2>
                  {review.rating ? (
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-yellow-dark">
                      <Star className="h-4 w-4 fill-current" /> {review.rating}/5
                    </span>
                  ) : null}
                  <span className={review.active ? 'text-xs font-extrabold uppercase tracking-[0.1em] text-[#0f8b4c]' : 'text-xs font-extrabold uppercase tracking-[0.1em] text-muted'}>
                    {review.active ? 'Active' : 'Hidden'}
                  </span>
                </div>
                {review.message ? <p className="mt-2 text-sm font-medium leading-6 text-muted">{review.message}</p> : null}
                {review.imageUrls?.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {review.imageUrls.map((imageUrl) => (
                      <img key={imageUrl} src={imageUrl} alt="" className="h-20 w-20 border border-line object-cover" />
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-3 sm:justify-end">
                <button type="button" onClick={() => toggleActive(review)} className="text-sm font-bold text-signal hover:text-clay">
                  {review.active ? 'Hide' : 'Show'}
                </button>
                <button type="button" onClick={() => deleteReview(review)} className="text-signal hover:text-clay" aria-label="Delete review">
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
