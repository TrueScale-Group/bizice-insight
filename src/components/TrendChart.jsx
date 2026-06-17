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
  if (suffix === '%') return `${Math.round(v)}`
  const a = Math.abs(v)
  if (a >= 1000) return `${(v / 1000).toFixed(1)}k`
  return `${Math.round(v)}`
}
const shortTick = (label) => (label || '').split(' ')[0]   // เลขวัน หรือเดือนย่อ

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

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        {data.map((d, i) => {
          const h = Math.max((Math.max(d.value, 0) / max) * plotH, d.value > 0 ? 2 : 0)
          const x = padX + i * bw
          const y = padTop + (plotH - h)
          const isSel = i === Math.min(active, data.length - 1)
          const cx = x + bw / 2
          return (
            <g key={i} onClick={() => setActive(i)} style={{ cursor: 'pointer' }}>
              {/* แตะง่าย: แถบโปร่งเต็มความสูง */}
              <rect x={x} y={padTop} width={bw} height={plotH} fill="transparent" />
              <rect x={x + bw * 0.18} y={y} width={bw * 0.64} height={h || 1}
                rx="2" fill={color} opacity={isSel ? 1 : 0.78}
                stroke={isSel ? color : 'none'} strokeWidth={isSel ? 0 : 0} />
              {showLabels && (
                <text x={cx} y={y - 3} textAnchor="middle" fontSize="7.5"
                  fontFamily="Prompt" fill={isSel ? color : '#6B7280'} fontWeight={isSel ? 700 : 500}>
                  {fmtTop(d.value, suffix)}
                </text>
              )}
              {showLabels && (
                <text x={cx} y={H - 9} textAnchor="middle" fontSize="8"
                  fontFamily="Sarabun" fill={isSel ? color : '#9A9A9A'} fontWeight={isSel ? 700 : 400}>
                  {shortTick(d.label)}
                </text>
              )}
            </g>
          )
        })}

        {/* แท่งเยอะ → โชว์เฉพาะหัว-ท้าย */}
        {!showLabels && <>
          <text x={padX} y={H - 6} fontSize="8" fill="#9A9A9A" fontFamily="Sarabun">{data[0]?.label}</text>
          <text x={W - padX} y={H - 6} textAnchor="end" fontSize="8" fill="#9A9A9A" fontFamily="Sarabun">{data[data.length - 1]?.label}</text>
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
