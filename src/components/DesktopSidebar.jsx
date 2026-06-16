import { useSession } from '../hooks/useSession'

function goHome() { window.top.location.href = 'https://truescale-group.github.io/mixue-ice-sakon/' }

const NAV_ITEMS = [
  { key: 'overview', icon: '📊', label: 'ภาพรวม' },
  { key: 'calendar', icon: '📅', label: 'ปฏิทิน' },
  { key: 'report',   icon: '📈', label: 'รายงาน' },
  { key: 'roi',      icon: '💎', label: 'ROI-ROE' },
  { key: 'settings', icon: '⚙️', label: 'ตั้งค่า' },
]

export default function DesktopSidebar({ tab, onChange, branches = [], branchId, onBranch, canEdit, onEntry }) {
  const { name, role, photo, initials } = useSession()
  const roleColor = role === 'owner' || role === 'admin' ? '#E31E24' : canEdit ? '#0284C7' : '#6B7280'
  const roleLabel = role === 'owner' ? 'Owner' : role === 'admin' ? 'Admin' : canEdit ? 'Editor' : 'Viewer'
  const today = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })

  return (
    <aside className="desk-sidebar">
      <div className="dsb-brand">
        <div className="dsb-brand-icon"><img src="./icon-insight.png" alt="Insight" /></div>
        <div>
          <div className="dsb-brand-name">Mixue Insight</div>
          <div className="dsb-brand-sub">BizICE · Financial</div>
        </div>
      </div>

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

      <div className="dsb-footer">
        <div className="dsb-avatar" style={photo
          ? { backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: roleColor }}>
          {photo ? '' : initials}
        </div>
        <div>
          <div className="dsb-user-name">{name || 'ผู้ใช้งาน'}</div>
          <div className="dsb-user-role">{roleLabel}</div>
        </div>
        <div className="dsb-date">{today}</div>
      </div>
    </aside>
  )
}
