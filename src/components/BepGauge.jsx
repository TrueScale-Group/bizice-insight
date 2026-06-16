import { STATUS_COLORS } from '../utils/calc'

/**
 * BepGauge — หน้าปัดแบบเข็มวัดความเร็วรถ (speedometer)
 * หน้าปัดแยกสี tier (แดง<80 · เหลือง80-100 · เขียว>100) + ขีดสเกล + เข็มชี้ + ดุมกลาง
 * props: progress (0..150) · status · revenueNet · bep
 */
export function BepGauge({ progress = 0, status = 'red', revenueNet = 0, bep = 0, dialOnly = false }) {
  const W = 280, H = 168, cx = W / 2, cy = 146, r = 106, sw = 14
  const clamp = Math.max(0, Math.min(150, progress))
  const color = STATUS_COLORS[status] || STATUS_COLORS.red

  const ang = (p) => Math.PI - (Math.max(0, Math.min(150, p)) / 150) * Math.PI
  const polar = (p, rad = r) => { const t = ang(p); return [cx + rad * Math.cos(t), cy - rad * Math.sin(t)] }
  const arc = (p0, p1) => {
    const [x0, y0] = polar(p0), [x1, y1] = polar(p1)
    return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`
  }

  // โซน tier (เว้นช่องเล็กๆ)
  const ZONES = [
    { from: 0, to: 78, c: STATUS_COLORS.red },
    { from: 82, to: 98, c: STATUS_COLORS.yellow },
    { from: 102, to: 150, c: STATUS_COLORS.green },
  ]
  // ขีดสเกล ทุก 25%
  const TICKS = [0, 25, 50, 75, 100, 125, 150]

  // เข็มชี้ (รูปทรงเรียวแบบ speedo) + หาง
  const t = ang(clamp)
  const tip = polar(clamp, r - 20)
  const w = 4.5
  const baseL = [cx + w * Math.sin(t), cy + w * Math.cos(t)]
  const baseR = [cx - w * Math.sin(t), cy - w * Math.cos(t)]
  const tail = [cx - 18 * Math.cos(t), cy + 18 * Math.sin(t)]
  const needle = `${tip[0]},${tip[1]} ${baseR[0]},${baseR[1]} ${tail[0]},${tail[1]} ${baseL[0]},${baseL[1]}`

  const [blx, bly] = polar(100, r + 24)
  const label = clamp >= 100 ? 'ทะลุจุดคุ้มทุนแล้ว' : clamp >= 80 ? 'ใกล้ถึงจุดคุ้มทุน' : 'ต่ำกว่าจุดคุ้มทุน'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: dialOnly ? 200 : 290, display: 'block', margin: '0 auto' }}>
        {/* โซนสี tier */}
        {ZONES.map((z, i) => (
          <path key={i} d={arc(z.from, z.to)} fill="none" stroke={z.c} strokeWidth={sw} strokeLinecap="round" />
        ))}
        {/* ขีดสเกล + ตัวเลขกำกับทุก 25% */}
        {TICKS.map(p => {
          const [x0, y0] = polar(p, r - sw / 2 - 3)
          const [x1, y1] = polar(p, r - sw / 2 - (p % 50 === 0 ? 11 : 7))
          const [lx, ly] = polar(p, r + 12)
          return (
            <g key={p}>
              <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="#C7C7CC" strokeWidth={p % 50 === 0 ? 2 : 1.2} strokeLinecap="round" />
              <text x={lx} y={ly + 3} textAnchor="middle" fontFamily="Sarabun" fontSize="8" fill="#A8A8AD">{p}</text>
            </g>
          )
        })}
        {/* ขีด BEP */}
        <text x={blx} y={bly} textAnchor="middle" fontFamily="Sarabun" fontSize="9" fill="#8E8E93">BEP</text>

        {/* เข็ม + หาง + ดุมกลาง */}
        <polygon points={needle} fill="#1C1C1E" />
        <circle cx={cx} cy={cy} r="11" fill="#1C1C1E" />
        <circle cx={cx} cy={cy} r="6" fill="#fff" />
        <circle cx={cx} cy={cy} r="3" fill={color} />
      </svg>

      {/* ตัวเลขดิจิทัล */}
      <div style={{ fontFamily: 'Prompt', fontWeight: 700, fontSize: dialOnly ? 26 : 34, color, lineHeight: 1, marginTop: -2 }}>
        {Math.round(clamp)}%
      </div>
      <div style={{ fontSize: dialOnly ? 10 : 11, color: '#8E8E93' }}>ของจุดคุ้มทุน</div>

      {!dialOnly && (<>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
          color, background: color + '14', padding: '4px 12px', borderRadius: 20, marginTop: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
          {label}
        </div>
        <div style={{ fontSize: 12, color: '#3C3C43', marginTop: 8 }}>
          ยอดวันนี้ <b style={{ color }}>฿{Math.round(revenueNet).toLocaleString('th-TH')}</b>
          {' / '}BEP ฿{Math.round(bep).toLocaleString('th-TH')}
        </div>
      </>)}
    </div>
  )
}
