import { useEffect, useRef, useState } from 'react'
import { ConnectionStatus } from './components/ConnectionStatus'
import { Overview } from './pages/Overview'
import { Calendar } from './pages/Calendar'
import { Settings } from './pages/Settings'
import { DataEntry } from './pages/DataEntry'
import { RoiRoe } from './pages/RoiRoe'
import { Report } from './pages/Report'
import { useBranches } from './hooks/useBranches'
import { useSession } from './hooks/useSession'
import { UpdateBanner } from './components/UpdateBanner'
import DesktopSidebar from './components/DesktopSidebar'
import BranchCycle from './components/BranchCycle'

const HUB = 'https://truescale-group.github.io/mixue-ice-sakon/'

// กลับ Hub — ใช้ window.top เผื่อรันใน iframe ของ Hub
function goHome() { window.top.location.href = HUB }

// Hard refresh — ล้าง cache + reload เวอร์ชันล่าสุด
async function hardRefresh() {
  try {
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map(k => caches.delete(k)))
    }
  } catch (e) { console.warn('[hardRefresh]', e) }
  finally {
    const url = new URL(window.location.href)
    url.searchParams.set('_r', Date.now().toString())
    window.location.replace(url.toString())
  }
}

const TABS = [
  { id: 'overview', label: 'ภาพรวม', icon: '📊' },
  { id: 'calendar', label: 'ปฏิทิน', icon: '📅' },
  { id: 'report',   label: 'รายงาน', icon: '📈', fab: true },
  { id: 'roi',      label: 'ROI-ROE', icon: '💎' },
  { id: 'settings', label: 'ตั้งค่า', icon: '⚙️' },
]

export default function App() {
  const [tab, setTab] = useState('overview')
  const [showEntry, setShowEntry] = useState(false)
  const [exitHint, setExitHint] = useState(false)
  const [updateReady, setUpdateReady] = useState(false)
  const waitingSW = useRef(null)
  const { isEditor } = useSession()
  const canEdit = isEditor()
  const { branches } = useBranches()
  // ตั้งต้นที่สาขา 509 (key v3 รีเซ็ตค่าเก่า) · รอสาขาจริงโหลดก่อนค่อยตั้งต้น
  const [branchId, setBranchId] = useState(() => localStorage.getItem('insight_branch_v3') || '')
  const branchPicked = useRef(!!localStorage.getItem('insight_branch_v3'))
  useEffect(() => {
    const shops = branches.filter(b => b.id !== 'default')
    // ยังไม่เคยเลือก + มีสาขาจริงแล้ว → ตั้งต้นที่ 509 (หรือสาขาแรก)
    if (!branchPicked.current && shops.length) {
      const b509 = shops.find(b => /509/.test(b.name) || b.code === '509') || shops[0]
      branchPicked.current = true
      selectBranch(b509.id)
      return
    }
    // branch ที่เลือกถูกลบ → fallback ไปสาขาแรก
    if (branchId && branches.length && !branches.some(b => b.id === branchId)) {
      selectBranch((shops[0] || branches[0]).id)
    }
  }, [branches]) // eslint-disable-line
  const selectBranch = (id) => { branchPicked.current = true; setBranchId(id); localStorage.setItem('insight_branch_v3', id) }
  const pressTimer = useRef(null)
  const tabRef = useRef(tab); useEffect(() => { tabRef.current = tab }, [tab])
  const exitRef = useRef(false); const exitTimer = useRef(null)

  // back-button guard 3 ชั้น (ดู function-back.md): popup → หน้าหลัก → เตือนออก
  useEffect(() => {
    window.history.pushState({ app: 1 }, '')
    const reguard = () => window.history.pushState({ app: 1 }, '')
    const onPop = () => {
      const stack = window.__bizBackStack
      if (stack && stack.length) { try { stack[stack.length - 1]?.() } catch {} reguard(); return }
      if (tabRef.current !== 'overview') { setTab('overview'); reguard(); return }
      if (exitRef.current) { try { (window.top || window).location.href = HUB } catch { window.location.href = HUB } return }
      exitRef.current = true; setExitHint(true)
      clearTimeout(exitTimer.current)
      exitTimer.current = setTimeout(() => { exitRef.current = false; setExitHint(false) }, 2500)
      reguard()
    }
    window.addEventListener('popstate', onPop)
    return () => { window.removeEventListener('popstate', onPop); clearTimeout(exitTimer.current) }
  }, [])

  // DataEntry overlay (custom popup) → ให้ back ปิดก่อน
  useEffect(() => {
    if (!showEntry) return
    const closer = () => setShowEntry(false)
    const stack = (window.__bizBackStack = window.__bizBackStack || [])
    stack.push(closer)
    return () => { const i = stack.indexOf(closer); if (i >= 0) stack.splice(i, 1) }
  }, [showEntry])

  // 📱 Service Worker (PROD เท่านั้น — กันแคชกวนตอน dev) + ตรวจอัปเดต → แบนเนอร์
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('./sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing
        if (!nw) return
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            waitingSW.current = reg.waiting || nw
            setUpdateReady(true)
          }
        })
      })
    }).catch(() => {})
    let reloaded = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return; reloaded = true; window.location.reload()
    })
  }, [])

  const applyUpdate = () => {
    try { waitingSW.current?.postMessage({ type: 'SKIP_WAITING' }) } catch {}
    setUpdateReady(false)
    setTimeout(() => window.location.reload(), 300)
  }

  // long-press ปุ่มกลาง = เมนูกรอกข้อมูลรวม (เฉพาะคนแก้ได้)
  const startPress = () => {
    if (!canEdit) return
    pressTimer.current = setTimeout(() => {
      pressTimer.current = null
      setShowEntry(true)
    }, 500)
  }
  const endPress = (id) => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; setTab(id) }
  }

  return (
    <div className={'app-shell' + (canEdit ? '' : ' viewer')}>
      <UpdateBanner show={updateReady} onReload={applyUpdate} />

      {/* ── Desktop sidebar (โชว์เฉพาะ PC ≥900px via CSS) ── */}
      <DesktopSidebar tab={tab} onChange={setTab} branches={branches} branchId={branchId}
        onBranch={selectBranch} canEdit={canEdit} onEntry={() => setShowEntry(true)} />
      {/* ── AppBar (concept เดียวกับ Inventory) ── */}
      <header className="app-topbar">
        <button className="app-back-btn" onClick={goHome}>🏠 Home</button>
        <div className="app-brand">
          <div className="app-brand-icon">
            <img src="./icon-insight.png" alt="Insight" />
          </div>
          <div className="app-brand-name">Mixue Insight{!canEdit && <span className="view-badge">👁 ดูอย่างเดียว</span>}</div>
          <BranchCycle branches={branches} value={branchId} onChange={selectBranch} style={{ marginTop: 2 }} />
        </div>
        <div className="app-topbar-right">
          <ConnectionStatus />
          <button className="topbar-refresh-btn" onClick={hardRefresh} title="รีเฟรช">🔄</button>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="ptr-scroll">
        {tab === 'overview' && <Overview branchId={branchId} onTab={setTab} />}
        {tab === 'calendar' && <Calendar branchId={branchId} />}
        {tab === 'report'   && <Report branchId={branchId} />}
        {tab === 'roi'      && <RoiRoe branchId={branchId} />}
        {tab === 'settings' && <Settings branchId={branchId} canEdit={canEdit} onEntry={() => setShowEntry(true)} />}
      </main>

      {showEntry && <DataEntry branchId={branchId} onClose={() => setShowEntry(false)} />}

      {exitHint && (
        <div className="exit-hint">↩️ กดอีกครั้งเพื่อออก · หรือกด 🏠 Home</div>
      )}

      {/* ── Bottom nav (สไตล์ Daily Income) ── */}
      <nav className="bottom-nav">
        {TABS.map(tb => tb.fab ? (
          <button key={tb.id} className="nav-item is-hub"
            onPointerDown={startPress}
            onPointerUp={() => endPress(tb.id)}
            onPointerLeave={() => { if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null } }}>
            <span className={`nav-hub-fab pending ${tab === tb.id ? 'active' : ''}`}>
              <span className="hub-emoji">{tb.icon}</span>
            </span>
            <span className="nav-label">{tb.label}</span>
          </button>
        ) : (
          <button key={tb.id} className={`nav-item ${tab === tb.id ? 'active' : ''}`} onClick={() => setTab(tb.id)}>
            <span className="nav-pill"><span className="nav-icon">{tb.icon}</span></span>
            <span className="nav-label">{tb.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
