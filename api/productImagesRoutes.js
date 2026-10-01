import crypto from 'node:crypto'
import path from 'node:path'
import { Router } from 'express'
import multer from 'multer'
import { supabase } from './supabaseClient.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 8,
  },
  fileFilter(_req, file, cb) {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true)
      return
    }

    cb(new Error('Only JPEG, PNG, and WEBP images are allowed.'))
  },
})

export const productImagesRouter = Router()

function safeExtension(fileName) {
  const extension = path.extname(fileName).toLowerCase()
  return ['.jpg', '.jpeg', '.png', '.webp'].includes(extension) ? extension : '.jpg'
}

productImagesRouter.post('/product-images', upload.array('images', 8), async (req, res, next) => {
  try {
    const files = req.files ?? []

    if (files.length === 0) {
      res.status(400).json({
        error: 'Validation failed',
        details: { images: 'At least one image is required.' },
      })
      return
    }

    const imageUrls = []

    for (const file of files) {
      const filePath = `products/${crypto.randomUUID()}${safeExtension(file.originalname)}`
      const { error } = await supabase.storage
        .from('product-images')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        })

      if (error) {
        throw error
      }

      const { data } = supabase.storage.from('product-images').getPublicUrl(filePath)
      imageUrls.push(data.publicUrl)
    }

    res.status(201).json({ imageUrls })
  } catch (error) {
    next(error)
  }
})
