import { supabase } from './supabaseClient.js'

function createSlug(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function toCategory(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    name: row.name,
    slug: row.slug,
    subcategories: (row.product_subcategories ?? [])
      .map(toSubcategory)
      .sort((first, second) => new Date(first.createdAt) - new Date(second.createdAt)),
  }
}

function toSubcategory(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    categoryId: row.category_id,
    name: row.name,
    slug: row.slug,
  }
}

function throwIfError(error) {
  if (error) {
    throw error
  }
}

export async function fetchCategories() {
  const { data, error } = await supabase
    .from('product_categories')
    .select('*, product_subcategories(*)')
    .order('created_at', { ascending: true })

  if (error && ['42P01', 'PGRST200'].includes(error.code)) {
    const fallback = await supabase
      .from('product_categories')
      .select()
      .order('created_at', { ascending: true })

    throwIfError(fallback.error)
    return (fallback.data ?? []).map((row) => toCategory({ ...row, product_subcategories: [] }))
  }

  throwIfError(error)
  return (data ?? []).map(toCategory)
}

export async function createCategory(payload) {
  const name = payload.name.trim()
  const slug = createSlug(name)

  const { data, error } = await supabase
    .from('product_categories')
    .upsert({ name, slug }, { onConflict: 'slug' })
    .select()
    .single()

  throwIfError(error)
  return toCategory(data)
}

export async function createSubcategory(categoryId, payload) {
  const name = payload.name.trim()
  const slug = createSlug(name)

  const { data, error } = await supabase
    .from('product_subcategories')
    .upsert({ category_id: categoryId, name, slug }, { onConflict: 'category_id,slug' })
    .select()
    .single()

  throwIfError(error)
  return toSubcategory(data)
}

export async function deleteCategory(id) {
  const { error } = await supabase
    .from('product_categories')
    .delete()
    .eq('id', id)

  throwIfError(error)
}

export async function deleteSubcategory(id) {
  const { error } = await supabase
    .from('product_subcategories')
    .delete()
    .eq('id', id)

  throwIfError(error)
}
