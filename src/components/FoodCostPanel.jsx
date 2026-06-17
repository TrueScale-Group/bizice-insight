import { useState } from 'react'
import { STATUS_COLORS, hubFoodCostDaily, hubFoodCostStats, foodCostStatus } from '../utils/calc'

const TODAY_GRAY = '#9CA3AF'   // วันนี้ยังไม่จบวัน = เทา
const TH_DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
const dow = (k) => TH_DOW[new Date(k + 'T00:00:00').getDay()]
const dayNum = (k) => +k.slice(8, 10)
const pct1 = (v) => `${(+v).toFixed(1)}%`

function AvgCard({ title, stat }) {
  const color = stat.n > 0 ? STATUS_COLORS[foodCostStatus(stat.avg)] : STATUS_COLORS.none
  return (
    <div className="fc-avgcard">
      <div className="fc-avgcard-title">{title}</div>
      <div className="fc-avgcard-val" style={{ color }}>{stat.n > 0 ? pct1(stat.avg) : '—'}</div>
      <div className="fc-avgcard-sub">{stat.n > 0 ? `สูงสุด ${pct1(stat.max)} · ต่ำสุด ${pct1(stat.min)}` : 'ยังไม่มีข้อมูล'}</div>
    </div>
  )
}

export function FoodCostPanel({ series = [] }) {
  const [tab, setTab] = useState('week')   // week | m30
  const last7 = series.slice(-7)
  const last30 = series.slice(-30)
  const a7 = hubFoodCostStats(last7), a30 = hubFoodCostStats(last30)

  const bars = tab === 'week' ? last7 : last30
  const isWeek = tab === 'week'
  const lastIdx = bars.length - 1

  // pct รายวันแบบ Hub (null = ข้อมูลไม่ครบ)
  const pctOf = (d) => hubFoodCostDaily(d.gross, d.cogs)
  const vals = bars.map(pctOf).filter(p => p !== null)
  const scaleMax = Math.max(...vals, 1) * 1.12
  const avg = (isWeek ? a7 : a30).avg

  const W = 320, H = 150, padX = 8, padTop = 16, padBot = 22
  const plotH = H - padTop - padBot
  const bw = (W - padX * 2) / bars.length
  const avgY = padTop + (plotH - (Math.max(avg, 0) / scaleMax) * plotH)

  const barColor = (p, isToday) => {
    if (p === null) return '#E5E7EB'                 // ไม่มีข้อมูล
    if (isToday) return TODAY_GRAY                    // วันนี้ยังไม่จบ = เทา
    return STATUS_COLORS[foodCostStatus(p)]
  }

  return (
    <div className="fc-panel">
      {/* การ์ดเฉลี่ย 7 / 30 วัน */}
      <div className="fc-avgrow">
        <AvgCard title="7 วันย้อนหลัง" stat={a7} />
        <AvgCard title="30 วันย้อนหลัง" stat={a30} />
      </div>

      {/* toggle + กราฟแท่ง */}
      <div className="fc-chart-head">
        <span className="fc-chart-title">Food Cost % ย้อนหลัง</span>
        <div className="mini-seg">
          <button className={isWeek ? 'on' : ''} onClick={() => setTab('week')}>สัปดาห์</button>
          <button className={!isWeek ? 'on' : ''} onClick={() => setTab('m30')}>30 วัน</button>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        {bars.map((d, i) => {
          const p = pctOf(d)
          const hasData = p !== null
          const h = hasData ? Math.max((p / scaleMax) * plotH, 2) : 0
          const x = padX + i * bw
          const y = padTop + (plotH - h)
          const isToday = i === lastIdx
          const cx = x + bw / 2
          const gap = isWeek ? 0.20 : 0.12
          return (
            <g key={i}>
              {hasData
                ? <rect x={x + bw * gap} y={y} width={bw * (1 - gap * 2)} height={h} rx="3" fill={barColor(p, isToday)} />
                : <line x1={x + bw * gap} y1={H - padBot} x2={x + bw * (1 - gap)} y2={H - padBot} stroke="#D1D5DB" strokeWidth="1.5" />}
              {isWeek && hasData && (
                <text x={cx} y={y - 3} textAnchor="middle" fontSize="8" fontFamily="Prompt"
                  fontWeight="700" fill={barColor(p, isToday)}>{pct1(p)}</text>
              )}
              {isWeek && (
                <text x={cx} y={H - 7} textAnchor="middle" fontSize="9" fontFamily="Sarabun"
                  fontWeight={isToday ? 700 : 400} fill={isToday ? TODAY_GRAY : '#9A9A9A'}>{dow(d.dateKey)}</text>
              )}
            </g>
          )
        })}

        {/* เส้นประค่าเฉลี่ย */}
        {avg > 0 && <>
          <line x1={padX} y1={avgY} x2={W - padX} y2={avgY} stroke="#475569" strokeWidth="1" strokeDasharray="4 3" opacity="0.85" />
          <text x={padX + 1} y={avgY - 3} fontSize="8" fontFamily="Prompt" fontWeight="700" fill="#475569">avg {pct1(avg)}</text>
        </>}

        {/* 30 วัน: บอกช่วงวันที่หัว-ท้าย */}
        {!isWeek && bars.length > 0 && <>
          <text x={padX} y={H - 6} fontSize="8" fill="#9A9A9A" fontFamily="Sarabun">{dayNum(bars[0].dateKey)}</text>
          <text x={W - padX} y={H - 6} textAnchor="end" fontSize="8" fill={TODAY_GRAY} fontFamily="Sarabun" fontWeight="700">{dayNum(bars[lastIdx].dateKey)} (วันนี้)</text>
        </>}
      </svg>

      <div className="fc-legend">🟢 &lt;42% · 🟡 42–47% · 🔴 ≥47% · ⚪ วันนี้ยังไม่จบ · ฐานยอดรวม VAT (ตรงกับ Hub)</div>
    </div>
  )
}
