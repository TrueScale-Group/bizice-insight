import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'fs'

// อ่าน version จาก package.json + วันที่ build (ไทย พ.ศ.) → inject อัตโนมัติ
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)))
const buildDate = new Date().toLocaleDateString('th-TH', {
  day: 'numeric', month: 'short', year: 'numeric',
})

// แทน __APP_VERSION__ ใน dist/sw.js หลัง build → เลขแคช SW = เวอร์ชันแอพเสมอ (bump ที่ package.json ที่เดียว)
function injectSwVersion(version) {
  return {
    name: 'inject-sw-version',
    closeBundle() {
      const swPath = new URL('./dist/sw.js', import.meta.url)
      try {
        const src = readFileSync(swPath, 'utf8')
        writeFileSync(swPath, src.replace(/__APP_VERSION__/g, version))
      } catch (e) {
        console.warn('[inject-sw-version] ข้ามการแทนเวอร์ชันใน sw.js:', e.message)
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), injectSwVersion(pkg.version)],
  base: '/bizice-insight/',
  build: { outDir: 'dist' },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
})
