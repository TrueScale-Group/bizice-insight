/** UpdateBanner — เด้งลงมาเมื่อมี SW เวอร์ชันใหม่พร้อม (ดู update-banner-guide.md) */
export function UpdateBanner({ show, onReload }) {
  return (
    <div className={`update-banner ${show ? 'show' : ''}`}>
      <span style={{ fontSize: 18 }}>🔄</span>
      <span className="ub-text">มีอัปเดตใหม่พร้อมแล้วค่ะ</span>
      <button className="ub-btn" onClick={onReload}>โหลดใหม่</button>
    </div>
  )
}
