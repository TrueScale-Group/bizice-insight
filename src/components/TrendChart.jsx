import { useState, useEffect } from 'react'

/**
 * TrendChart — กราฟแท่งเล็ก (SVG, ไม่มี dependency)
 * props: data [{ label, value }] · color · suffix
 * แสดง: ยอดบนหัวทุกแท่ง + วันใต้แท่ง · แตะแท่ง = โชว์ วัน/เดือน/ยอด เต็มใต้กราฟ
 */
const fmtFull = (v, suffix) => suffix === '%'
  ? `${(+v).toLocaleString('th-TH', { maximumFractionDigits: 1 })}%`
  : `฿${Math.round(v).toLocaleString('th-TH')}`
// ยอดย่อบนหัวแท่ง: % = ตัวเลขตรง · เงิน = พันใช้ k
const fmtTop = (v, suffix) => {
  if (suffix === '%') return `${(+v).toFixed(1)}`
  const a = Math.abs(v)
  if (a >= 1000) return `${(v / 1000).toFixed(1)}k`
  return `${Math.round(v)}`
}
const shortTick = (label) => (label || '').split(' ')[0]   // เลขวัน หรือเดือนย่อ
const TODAY_PINK = '#EC4899'   // แท่งขวาสุด = วันปัจจุบัน

export function TrendChart({ data = [], color = '#E31E24', suffix = '' }) {
  const [active, setActive] = useState(data.length - 1)   // เริ่มเลือกแท่งล่าสุด
  useEffect(() => { setActive(data.length - 1) }, [data.length])

  if (!data.length) return <div style={{ fontSize: 12, color: '#9A9A9A', padding: 12 }}>ยังไม่มีข้อมูล</div>

  const W = 300, H = 132, padX = 6, padTop = 18, padBot = 24
  const plotH = H - padTop - padBot
  const max = Math.max(...data.map(d => d.value), 1)
  const bw = (W - padX * 2) / data.length
  const showLabels = data.length <= 14   // แท่งเยอะเกินไม่ใส่ป้ายทุกแท่ง (รก)
  const sel = data[Math.min(active, data.length - 1)] || data[data.length - 1]
  const lastIdx = data.length - 1

  // เส้นค่าเฉลี่ย N วัน
  const avg = data.reduce((s, d) => s + d.value, 0) / data.length
  const avgY = padTop + (plotH - (Math.max(avg, 0) / max) * plotH)
  const avgLabel = suffix === '%' ? `avg ${avg.toFixed(1)}%` : `avg ฿${fmtTop(avg, '')}`

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        {data.map((d, i) => {
          const h = Math.max((Math.max(d.value, 0) / max) * plotH, d.value > 0 ? 2 : 0)
          const x = padX + i * bw
          const y = padTop + (plotH - h)
          const isSel = i === Math.min(active, data.length - 1)
          const isToday = i === lastIdx
          const barColor = isToday ? TODAY_PINK : color
          const cx = x + bw / 2
          return (
            <g key={i} onClick={() => setActive(i)} style={{ cursor: 'pointer' }}>
              {/* แตะง่าย: แถบโปร่งเต็มความสูง */}
              <rect x={x} y={padTop} width={bw} height={plotH} fill="transparent" />
              <rect x={x + bw * 0.18} y={y} width={bw * 0.64} height={h || 1}
                rx="2" fill={barColor} opacity={isToday || isSel ? 1 : 0.78} />
              {showLabels && (
                <text x={cx} y={y - 3} textAnchor="middle" fontSize="7.5"
                  fontFamily="Prompt" fill={isToday ? TODAY_PINK : (isSel ? color : '#6B7280')} fontWeight={isToday || isSel ? 700 : 500}>
                  {fmtTop(d.value, suffix)}
                </text>
              )}
              {showLabels && (
                <text x={cx} y={H - 9} textAnchor="middle" fontSize="8"
                  fontFamily="Sarabun" fill={isToday ? TODAY_PINK : (isSel ? color : '#9A9A9A')} fontWeight={isToday || isSel ? 700 : 400}>
                  {shortTick(d.label)}
                </text>
              )}
            </g>
          )
        })}

        {/* เส้นประค่าเฉลี่ย */}
        <line x1={padX} y1={avgY} x2={W - padX} y2={avgY} stroke="#475569" strokeWidth="1" strokeDasharray="4 3" opacity="0.85" />
        <text x={padX + 1} y={avgY - 3} fontSize="8" fontFamily="Prompt" fontWeight="700" fill="#475569">{avgLabel}</text>

        {/* แท่งเยอะ → โชว์เฉพาะหัว-ท้าย */}
        {!showLabels && <>
          <text x={padX} y={H - 6} fontSize="8" fill="#9A9A9A" fontFamily="Sarabun">{data[0]?.label}</text>
          <text x={W - padX} y={H - 6} textAnchor="end" fontSize="8" fill={TODAY_PINK} fontFamily="Sarabun" fontWeight="700">{data[lastIdx]?.label}</text>
        </>}

        <text x={W - padX} y={11} textAnchor="end" fontSize="9" fill="#555" fontFamily="Prompt">
          สูงสุด {max.toLocaleString('th-TH', { maximumFractionDigits: 1 })}{suffix}
        </text>
      </svg>

      {/* แตะแท่งไหน → โชว์ วัน/เดือน/ยอด เต็ม */}
      {sel && (
        <div className="trend-cap">
          <span className="trend-cap-date">📅 {sel.label}</span>
          <b className="trend-cap-val" style={{ color }}>{fmtFull(sel.value, suffix)}</b>
        </div>
      )}
    </div>
  )
}
