import { authRequest } from '@/lib/http'
import type { Category, CreateCategoryRequest, UpdateCategoryRequest } from '../types'

export function listCategories() {
  return authRequest<Category[]>('/categories')
}

export function createCategory(payload: CreateCategoryRequest) {
  return authRequest<Category>('/categories', { method: 'POST', body: payload })
}

export function updateCategory(id: string, payload: UpdateCategoryRequest) {
  return authRequest<Category>(`/categories/${id}`, { method: 'PATCH', body: payload })
}

export function deleteCategory(id: string) {
  return authRequest<void>(`/categories/${id}`, { method: 'DELETE' })
}

export function listPartnerCategories() {
  return authRequest<Category[]>('/categories/partner')
}
