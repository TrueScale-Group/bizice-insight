/**
 * TrendChart — กราฟแท่งเล็กๆ แสดง trend (SVG, ไม่มี dependency)
 * props: data [{ label, value }] · color · suffix
 */
export function TrendChart({ data = [], color = '#E31E24', suffix = '' }) {
  if (!data.length) return <div style={{ fontSize: 12, color: '#9A9A9A', padding: 12 }}>ยังไม่มีข้อมูล</div>
  const W = 300, H = 110, pad = 6
  const max = Math.max(...data.map(d => d.value), 1)
  const bw = (W - pad * 2) / data.length

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      {data.map((d, i) => {
        const h = (d.value / max) * (H - 24)
        const x = pad + i * bw
        const y = H - 16 - h
        return (
          <g key={i}>
            <rect x={x + bw * 0.18} y={y} width={bw * 0.64} height={Math.max(h, 1)}
              rx="2" fill={color} opacity={0.85} />
          </g>
        )
      })}
      {/* แสดง label เฉพาะหัว-ท้าย กันรก */}
      <text x={pad} y={H - 3} fontSize="8" fill="#9A9A9A" fontFamily="Sarabun">{data[0]?.label}</text>
      <text x={W - pad} y={H - 3} textAnchor="end" fontSize="8" fill="#9A9A9A" fontFamily="Sarabun">
        {data[data.length - 1]?.label}
      </text>
      <text x={W - pad} y={10} textAnchor="end" fontSize="9" fill="#555" fontFamily="Prompt">
        สูงสุด {max.toLocaleString('th-TH', { maximumFractionDigits: 1 })}{suffix}
      </text>
    </svg>
  )
}
