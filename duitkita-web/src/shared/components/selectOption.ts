export interface SelectOption<T = undefined> {
  value: string
  label: string
  /** Anything the `#option` / `#value` slots need to render richer content. */
  data?: T
}

/** The search box only shows when there are more options than this. */
export const SEARCH_THRESHOLD = 7
