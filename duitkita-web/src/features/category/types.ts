export interface Category {
  id: string
  name: string
  icon?: string
  created_at: string
}

export interface CreateCategoryRequest {
  name: string
  icon?: string
}

export interface UpdateCategoryRequest {
  name?: string
  icon?: string
}
