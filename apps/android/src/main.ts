import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import HomeView from './views/HomeView.vue'
import DiscoverView from './views/DiscoverView.vue'
import LibraryView from './views/LibraryView.vue'
import PodcastsView from './views/PodcastsView.vue'
import ReportsView from './views/ReportsView.vue'
import SettingsView from './views/SettingsView.vue'
import { createUnavailablePlatform, providePlatform } from './platform'
import './styles/base.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/home', name: 'home', component: HomeView },
    { path: '/discover', name: 'discover', component: DiscoverView },
    { path: '/library', name: 'library', component: LibraryView },
    { path: '/podcasts', name: 'podcasts', component: PodcastsView },
    { path: '/reports', name: 'reports', component: ReportsView },
    { path: '/settings', name: 'settings', component: SettingsView },
    { path: '/:pathMatch(.*)*', redirect: '/home' }
  ],
  scrollBehavior: () => ({ top: 0 })
})

const app = createApp(App)
app.use(router)
const platform = import.meta.env.DEV
  ? (await import('./platform/browser')).createBrowserPlatform()
  : createUnavailablePlatform()
providePlatform(app, platform)
app.mount('#app')
