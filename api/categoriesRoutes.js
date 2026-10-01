import { Router } from 'express'
import { createCategory, createSubcategory, deleteCategory, deleteSubcategory, fetchCategories } from './categoriesRepository.js'
import { validateCategory } from './categoryValidation.js'

export const categoriesRouter = Router()

categoriesRouter.get('/categories', async (_req, res, next) => {
  try {
    const categories = await fetchCategories()
    res.json({ categories })
  } catch (error) {
    next(error)
  }
})

categoriesRouter.post('/categories', async (req, res, next) => {
  try {
    validateCategory(req.body)

    const category = await createCategory(req.body)
    res.status(201).json({ category })
  } catch (error) {
    next(error)
  }
})

categoriesRouter.post('/categories/:id/subcategories', async (req, res, next) => {
  try {
    validateCategory(req.body)

    const subcategory = await createSubcategory(req.params.id, req.body)
    res.status(201).json({ subcategory })
  } catch (error) {
    next(error)
  }
})

categoriesRouter.delete('/categories/:id', async (req, res, next) => {
  try {
    await deleteCategory(req.params.id)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

categoriesRouter.delete('/subcategories/:id', async (req, res, next) => {
  try {
    await deleteSubcategory(req.params.id)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})
