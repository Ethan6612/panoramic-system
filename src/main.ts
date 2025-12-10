// main.ts
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as Icons from '@element-plus/icons-vue'
import { createPinia } from 'pinia' // 引入 pinia 状态管理
import './api/mock'          // 引入 mock 接口初始化
import './api/request'      // 引入请求拦截器配置
// import VueLazyLoad from 'vue3-lazy' //引入懒加载


const app = createApp(App)

app.use(router)
app.use(ElementPlus)
app.use(createPinia())
// app.use(VueLazyLoad, {
//   // 可选配置（这里不传也可以）
// })

Object.entries(Icons).forEach(([key, component]) => {
  app.component(key, component)
})

app.mount('#app')

if (typeof window !== 'undefined') {
  const roMsg = 'ResizeObserver loop completed with undelivered notifications'
  window.addEventListener('error', (e: any) => {
    if (e && typeof e.message === 'string' && e.message.includes(roMsg)) {
      e.preventDefault()
    }
  }, true)
  window.addEventListener('unhandledrejection', (e: any) => {
    const msg = e?.reason?.message
    if (msg && typeof msg === 'string' && msg.includes(roMsg)) {
      e.preventDefault()
    }
  }, true)
}
