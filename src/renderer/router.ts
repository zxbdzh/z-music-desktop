// import Vue from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/home',
      name: 'Home',
      component: () => import('./views/Home/index.vue'),
      meta: {
        name: 'Home',
        title: 'home_title',
      },
    },
    {
      path: '/search',
      name: 'Search',
      component: require('./views/Search/index.vue').default,
      meta: {
        name: 'Search',
      },
    },
    {
      path: '/songList/list',
      name: 'SongList',
      component: require('./views/songList/List/index.vue').default,
      meta: {
        name: 'SongList',
      },
    },
    {
      path: '/songList/detail',
      name: 'SongListDetail',
      component: require('./views/songList/Detail/index.vue').default,
      meta: {
        name: 'SongList',
      },
    },
    {
      path: '/leaderboard',
      name: 'Leaderboard',
      component: require('./views/Leaderboard/index.vue').default,
      meta: {
        name: 'Leaderboard',
      },
    },
    {
      path: '/list',
      name: 'List',
      component: require('./views/List/index.vue').default,
      meta: {
        name: 'List',
      },
    },
    {
      path: '/download',
      name: 'Download',
      redirect: (to) => ({
        path: '/list',
        query: { ...to.query, tab: 'download' },
      }),
      meta: {
        name: 'Download',
      },
    },
    {
      path: '/podcast',
      name: 'Podcast',
      component: require('./views/Podcast/index.vue').default,
      meta: {
        name: 'Podcast',
      },
    },
    {
      path: '/setting',
      name: 'Setting',
      component: require('./views/Setting/index.vue').default,
      meta: {
        name: 'Setting',
      },
    },
    {
      path: '/wy',
      name: 'WyCloud',
      redirect: (to) => ({
        path: '/list',
        query: { ...to.query, tab: 'all', location: 'cloud', legacy: 'wy' },
      }),
      meta: {
        name: 'WyCloud',
      },
    },
    {
      path: '/webdav-play',
      name: 'WebdavPlay',
      redirect: (to) => ({
        path: '/list',
        query: { ...to.query, tab: 'all', location: 'webdav', legacy: 'webdav' },
      }),
      meta: {
        name: 'WebdavPlay',
      },
    },
    {
      path: '/artist',
      name: 'Artist',
      component: require('./views/Artist/index.vue').default,
      meta: {
        name: 'Artist',
      },
    },
    {
      path: '/album',
      name: 'Album',
      component: require('./views/Album/index.vue').default,
      meta: {
        name: 'Album',
      },
    },
    {
      path: '/listen-data',
      name: 'ListenData',
      component: require('./views/ListenData/index.vue').default,
      meta: {
        name: 'ListenData',
      },
    },
    { path: '/:pathMatch(.*)*', redirect: '/home' },
  ],
  linkActiveClass: 'active-link',
  linkExactActiveClass: 'exact-active-link',
})

export default router
