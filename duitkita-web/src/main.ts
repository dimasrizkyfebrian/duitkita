import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './app/router'
import { useAuthStore } from './features/auth/stores/auth.store'

const app = createApp(App)
app.use(createPinia())

// Try to silently restore a session from the stored refresh token before the
// router's first navigation guard runs, so a page reload doesn't bounce an
// already-logged-in user to /login.
const auth = useAuthStore()
await auth.refreshSession().catch(() => {
  auth.clearSession()
})

app.use(router)
app.mount('#app')
