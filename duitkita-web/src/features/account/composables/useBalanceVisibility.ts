import { ref } from 'vue'

// One switch for every balance on screen: revealing it on the home card
// reveals it in the accounts sheets too, and the other way round. Kept in
// memory only, so like m-banking the app always opens with balances hidden
// and someone glancing at the screen doesn't see them.
const hidden = ref(true)

export function useBalanceVisibility() {
  return {
    hidden,
    toggle: () => (hidden.value = !hidden.value),
  }
}

export function resetBalanceVisibilityForTests() {
  hidden.value = true
}
