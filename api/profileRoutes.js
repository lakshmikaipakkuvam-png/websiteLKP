import { Router } from 'express'
import { fetchProfile, saveProfile } from './profileRepository.js'
import { validateProfile } from './profileValidation.js'

export const profileRouter = Router()

profileRouter.get('/profile', async (_req, res, next) => {
  try {
    const profile = await fetchProfile()
    res.json({ profile })
  } catch (error) {
    next(error)
  }
})

profileRouter.put('/profile', async (req, res, next) => {
  try {
    validateProfile(req.body)

    const profile = await saveProfile(req.body)
    res.json({ profile })
  } catch (error) {
    next(error)
  }
})
