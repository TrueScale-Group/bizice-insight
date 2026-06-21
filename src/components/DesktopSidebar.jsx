import { useSession } from '../hooks/useSession'

function goHome() { window.top.location.href = 'https://truescale-group.github.io/mixue-ice-sakon/' }

// Hard refresh — ล้าง cache + unregister SW แล้วโหลดใหม่ (คอนเซปเดียวกับ Inventory)
async function hardRefresh() {
  try {
    if ('caches' in window) { const k = await caches.keys(); await Promise.all(k.map(x => caches.delete(x))) }
    if ('serviceWorker' in navigator) { const r = await navigator.serviceWorker.getRegistrations(); await Promise.all(r.map(x => x.unregister())) }
  } catch (e) { console.warn('[hardRefresh]', e) }
  finally {
    const url = new URL(window.location.href); url.searchParams.set('_r', Date.now().toString()); window.location.replace(url.toString())
  }
}

const NAV_ITEMS = [
  { key: 'overview', icon: '📊', label: 'ภาพรวม' },
  { key: 'calendar', icon: '📅', label: 'ปฏิทิน' },
  { key: 'report',   icon: '📈', label: 'รายงาน' },
  { key: 'roi',      icon: '💎', label: 'ROI-ROE' },
  { key: 'settings', icon: '⚙️', label: 'ตั้งค่า' },
]

export default function DesktopSidebar({ tab, onChange, branches = [], branchId, onBranch, canEdit, onEntry }) {
  const { name, role, photo, initials } = useSession()
  const roleColor = role === 'owner' ? '#E31E24' : role === 'admin' ? '#7C3AED' : canEdit ? '#0284C7' : '#6B7280'
  // role + emoji: 👑 Owner · 🛡️ Admin · ✏️ Editor · 👁️ Viewer (เหมือน Inventory)
  const roleLabel = role === 'owner' ? '👑 Owner' : role === 'admin' ? '🛡️ Admin' : canEdit ? '✏️ Editor' : '👁️ Viewer'

  return (
    <aside className="desk-sidebar">
      {/* ─── Brand ─── */}
      <div className="dsb-brand">
        <div className="dsb-brand-icon"><img src="./icon-insight.png" alt="Insight" /></div>
        <div>
          <div className="dsb-brand-name">Mixue Insight</div>
          <div className="dsb-brand-sub">BizICE · ระบบบริหารการเงิน</div>
        </div>
      </div>

      {/* ─── Scroll body ─── */}
      <div className="dsb-scroll">
        <button className="dsb-home-btn" onClick={goHome}>🏠 กลับหน้าหลัก</button>

        {branches.length > 1 && (
          <>
            <div className="dsb-sec-lbl">สาขา</div>
            <select className="dsb-branch" value={branchId} onChange={e => onBranch(e.target.value)}>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </>
        )}

        <div className="dsb-sec-lbl">เมนู</div>
        <nav className="dsb-nav">
          {NAV_ITEMS.map(n => (
            <button key={n.key} className={`dsb-nav-item${tab === n.key ? ' active' : ''}`} onClick={() => onChange(n.key)}>
              <span className="dsb-nav-ico">{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>

        {canEdit && (
          <button className="dsb-entry-btn" onClick={onEntry}>✏️ กรอกข้อมูลรวม</button>
        )}
      </div>

      {/* ─── User footer (refresh อยู่ขวาล่าง เหมือน Inventory) ─── */}
      <div className="dsb-footer">
        <div className="dsb-avatar" style={photo
          ? { backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: roleColor }}>
          {photo ? '' : initials}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="dsb-user-name">{name || 'ผู้ใช้งาน'}</div>
          <div className="dsb-user-role">{roleLabel}</div>
        </div>
        <button className="dsb-refresh-btn" onClick={hardRefresh}
          title="Hard Refresh — ล้างแคชและโหลดใหม่">🔄</button>
      </div>
    </aside>
  )
}
