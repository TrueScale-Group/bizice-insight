import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { doc, getDoc } from 'firebase/firestore'
import { COL } from '../constants/collections'
import { getGrossRange, getCOGSRange } from '../utils/integrations'
import {
  DEFAULT_CONFIG, netRevenue, foodCostPct, grossProfit, bepDaily, hitBep, laborTotal, thb, pctStr, defaultOpenDays, hubFoodCostDaily,
  STATUS_COLORS, foodCostStatus,
} from '../utils/calc'
import { toThaiMonth, toThaiDate } from '../utils/formatDate'

const WD = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

export function Calendar({ branchId = 'default' }) {
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const [ym, setYm] = useState({ y: today.getFullYear(), m: today.getMonth() }) // m: 0-11
  const [days, setDays] = useState({})   // dateKey → { net, cogs, fcPct, gp, bep, hit }
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState(todayKey)   // เริ่มต้นเลือก "วันนี้"

  useEffect(() => {
    let alive = true
    setLoading(true)
    const mm = String(ym.m + 1).padStart(2, '0')
    const from = `${ym.y}-${mm}-01`, to = `${ym.y}-${mm}-31`
    ;(async () => {
      const mk = `${ym.y}${mm}`
      const [cSnap, mSnap] = await Promise.all([
        getDoc(doc(db, COL.CONFIG, branchId)),
        getDoc(doc(db, COL.MONTHLY_DATA, `${branchId}_${mk}`)),
      ])
      const cfg = { ...DEFAULT_CONFIG, ...(cSnap.exists() ? cSnap.data() : {}) }
      const labor = mSnap.exists() ? laborTotal(mSnap.data().labor || {}, 5) : 0
      const [gross, cogs] = await Promise.all([
        getGrossRange(from, to),
        getCOGSRange(from, to, branchId && branchId !== 'default' ? branchId : 'all'),
      ])
      if (!alive) return
      const fixedMonthly = (cfg.rentCost || 0) + (cfg.annualFeeYearly || 0) / 12 + labor
      // food cost เฉลี่ยทั้งเดือน (ฐาน gross) → ใช้คิด BEP/วัน (ยอดรวม VAT)
      const totCogs = Object.values(cogs).reduce((s, v) => s + v, 0)
      const totGross = Object.values(gross).reduce((s, v) => s + v, 0)
      const avgFc = totGross > 0 ? (totCogs / totGross) * 100 : 0
      const bep = bepDaily(fixedMonthly, avgFc, defaultOpenDays(mk, cfg.openDays > 0 ? cfg.openDays : 30))
      const map = {}
      const allKeys = new Set([...Object.keys(gross), ...Object.keys(cogs)])
      allKeys.forEach(k => {
        const g = gross[k] || 0
        const net = netRevenue(g, cfg.vatRate)
        const cg = cogs[k] || 0
        const fcHub = hubFoodCostDaily(g, cg)   // Food Cost ฐาน gross (ตรงกับ Hub/Overview)
        map[k] = { net, gross: g, cogs: cg, fcPct: fcHub == null ? 0 : fcHub, gp: grossProfit(net, cg), bep, hit: hitBep(g, bep) }
      })
      setDays(map); setLoading(false)
    })()
    return () => { alive = false }
  }, [ym, branchId])

  const first = new Date(ym.y, ym.m, 1)
  const blanks = first.getDay()
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate()
  const cells = [...Array(blanks).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  const keyOf = (d) => `${ym.y}-${String(ym.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const shift = (delta) => setYm(s => {
    const d = new Date(s.y, s.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }
  })
  const jumpToday = () => { setYm({ y: today.getFullYear(), m: today.getMonth() }); setSel(todayKey) }
  const onCurrentMonth = ym.y === today.getFullYear() && ym.m === today.getMonth()

  return (
    <div className="page">
      <div className="cal-head">
        <button className="cal-nav" onClick={() => shift(-1)}>‹</button>
        <div className="cal-head-mid">
          <span className="cal-title">{toThaiMonth(`${ym.y}-${String(ym.m + 1).padStart(2, '0')}-01`)}</span>
          <button className="cal-today-btn" onClick={jumpToday} disabled={onCurrentMonth}>วันนี้</button>
        </div>
        <button className="cal-nav" onClick={() => shift(1)}>›</button>
      </div>

      <div className="card" style={{ padding: 10 }}>
        <div className="cal-grid cal-wd">{WD.map(w => <div key={w} className="cal-wd-cell">{w}</div>)}</div>
        {loading ? <div className="loading" style={{ padding: 30 }}>กำลังโหลด…</div> : (
          <div className="cal-grid">
            {cells.map((d, i) => {
              if (!d) return <div key={i} className="cal-cell empty" />
              const dk = keyOf(d)
              const isFuture = dk > todayKey                       // วันอนาคต = ไม่แสดงข้อมูล (กันข้อมูลผิด)
              const data = isFuture ? null : days[dk]
              const hasBep = data && data.bep > 0
              const cls = hasBep ? (data.hit ? 'hit' : 'miss') : ''
              const isToday = dk === todayKey
              // %เทียบวันก่อน (จากยอดขายสุทธิ)
              const prevData = (!isFuture && d > 1) ? days[keyOf(d - 1)] : null
              const chg = (data && data.net > 0 && prevData && prevData.net > 0)
                ? ((data.net - prevData.net) / prevData.net) * 100 : null
              return (
                <button key={i} className={`cal-cell ${cls} ${sel === dk ? 'sel' : ''} ${isToday ? 'today' : ''} ${isFuture ? 'future' : ''}`}
                  onClick={() => data && setSel(dk)}>
                  <span className="cal-d">{d}</span>
                  {data && <span className="cal-mark">{hasBep ? (data.hit ? '✓' : '✗') : '·'}</span>}
                  {data && data.net > 0 && <span className="cal-rev">💵 {Math.round(data.net / 1000)}k</span>}
                  {chg != null && (
                    <span className="cal-chg" style={{ color: chg >= 0 ? '#1A7F37' : '#C0392B' }}>
                      {chg >= 0 ? '▲' : '▼'}{Math.abs(chg).toFixed(0)}%
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
        <div className="cal-legend">
          <span><i className="dot-green" /> ทะลุ BEP</span>
          <span><i className="dot-red" /> ไม่ทะลุ</span>
        </div>
      </div>

      {sel && days[sel] && (
        <div className="card">
          <div className="card-label" style={{ textAlign: 'left' }}>
            {toThaiDate(sel)}{sel === todayKey && <span style={{ color: 'var(--red)', fontWeight: 700 }}> · วันนี้</span>}
          </div>
          <div className="day-detail">
            <Row label="ยอดขาย (รวม VAT)" value={thb(days[sel].gross)} color="#1D4ED8" />
            <Row label="ยอดขายสุทธิ (หัก VAT)" value={thb(days[sel].net)} />
            <Row label="ต้นทุนวัตถุดิบ" value={thb(days[sel].cogs)} />
            <Row label="กำไรขั้นต้น" value={thb(days[sel].gp)} strong color={days[sel].gp < 0 ? STATUS_COLORS.red : STATUS_COLORS.green} />
            <Row label="Food Cost %" value={pctStr(days[sel].fcPct)} strong color={days[sel].fcPct > 0 ? STATUS_COLORS[foodCostStatus(days[sel].fcPct)] : 'inherit'} />
            <Row label="BEP/วัน (รวม VAT)" value={thb(days[sel].bep)} />
            <Row label="สถานะ" value={days[sel].hit ? '✓ ทะลุ BEP' : '✗ ไม่ทะลุ'} strong color={days[sel].hit ? STATUS_COLORS.green : STATUS_COLORS.red} />
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, strong, color }) {
  return (
    <div className="dr">
      <span className="dr-l">{label}</span>
      <span className="dr-v" style={{ fontWeight: strong ? 700 : 500, color: color || 'inherit' }}>{value}</span>
    </div>
  )
}
