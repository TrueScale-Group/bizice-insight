import { useState } from 'react'
import { STATUS_COLORS } from '../utils/calc'
import { TrendChart } from './TrendChart'
import { Modal } from './Modal'
import { SourceText } from './SourceText'

const STATUS_TH = { blue: 'ดีเยี่ยม', green: 'ดี', yellow: 'เฝ้าระวัง', red: 'ต้องปรับ', white: 'ลงทุนน้อย', none: '—' }

/**
 * KpiCard — การ์ดดัชนี + ป้ายที่มาข้อมูล · กดเปิด popup รายละเอียดครบ
 * props: title · value · sub · status · bg · src(ที่มา)
 *        formula · rows[{label,value}] · legend · trend · trendColor · pending
 */
export function KpiCard({ title, value, sub, status = 'none', bg, src,
  formula, rows, legend, trend, trendColor, pending = false, valueColor }) {
  const [open, setOpen] = useState(false)
  const dot = STATUS_COLORS[status] || STATUS_COLORS.none
  const vColor = valueColor || dot   // สีตัวเลขค่า (override ได้ เช่น กำไรติดลบ=แดง)
  const clickable = !pending

  return (
    <>
      <div className="kpi-card" onClick={() => clickable && setOpen(true)}
        style={{ cursor: clickable ? 'pointer' : 'default', background: bg || undefined }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="kpi-dot" style={{ background: dot }} />
          <span className="kpi-title">{title}</span>
          {clickable && <span style={{ marginLeft: 'auto', color: '#C7C7CC', fontSize: 13 }}>›</span>}
        </div>
        {pending ? (
          <div className="kpi-pending">รอข้อมูล (Phase ถัดไป)</div>
        ) : (
          <>
            <div className="kpi-value" style={{ color: vColor }}>{value}</div>
            {sub && <div className="kpi-sub">{sub}</div>}
            {src && <div className="kpi-src">📊 <SourceText text={src} /></div>}
          </>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        <div className="dt-hero">
          <span className="dt-status" style={{ background: dot + '18', color: dot }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot }} />
            {STATUS_TH[status] || '—'}
          </span>
          <div className="dt-value" style={{ color: vColor }}>{value}</div>
          {sub && <div className="dt-sub">{sub}</div>}
        </div>

        {src && (
          <div className="dt-section">
            <div className="dt-label">ที่มาข้อมูล</div>
            <div className="dt-src"><SourceText text={src} /></div>
          </div>
        )}
        {formula && (
          <div className="dt-section">
            <div className="dt-label">วิธีคำนวณ</div>
            <div className="dt-formula">{formula}</div>
          </div>
        )}
        {rows && rows.length > 0 && (
          <div className="dt-section">
            <div className="dt-label">รายละเอียด</div>
            {rows.map((r, i) => (
              <div key={i} className="dt-row">
                <span><SourceText text={r.label} /></span><b style={{ color: r.color }}>{r.value}</b>
              </div>
            ))}
          </div>
        )}
        {trend && trend.length > 0 && (
          <div className="dt-section">
            <div className="dt-label">แนวโน้ม</div>
            <TrendChart data={trend} color={trendColor || dot} />
          </div>
        )}
        {legend && (
          <div className="dt-section">
            <div className="dt-label">เกณฑ์ไฟสถานะ</div>
            <div className="dt-legend">{legend}</div>
          </div>
        )}
      </Modal>
    </>
  )
}
