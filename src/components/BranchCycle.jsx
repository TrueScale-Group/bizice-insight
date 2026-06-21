/**
 * ปุ่มกดวนเลือกสาขา (cycle) — แบบเดียวกับ Inventory WarehouseCycle
 * วนลำดับ: สาขาจริง (เรียงชื่อ) → … → "รวมทุกสาขา" → วนกลับ
 * props: branches[{id,name}] · value(id) · onChange(nextId) · style
 */
export default function BranchCycle({ branches = [], value, onChange, style }) {
  if (branches.length <= 1) return null   // มีแค่ "รวมทุกสาขา" → ไม่ต้องโชว์
  const shops = branches.filter(b => b.id !== 'default')
  const opts = [...shops.map(b => b.id), 'default']   // สาขาจริงก่อน · รวมทุกสาขาท้ายสุด
  const label = branches.find(b => b.id === value)?.name || 'เลือกสาขา'
  return (
    <button className="branch-cycle" title="กดเพื่อสลับสาขา" style={style}
      onClick={() => { const i = opts.indexOf(value); onChange(opts[(i + 1) % opts.length]) }}>
      🏪 <span className="branch-cycle-name">{label}</span>
      <span className="branch-cycle-ic">⇄</span>
    </button>
  )
}
