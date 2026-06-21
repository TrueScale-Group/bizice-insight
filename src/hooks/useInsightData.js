import { useEffect, useRef, useState } from 'react'
import { db } from '../firebase'
import {
  doc, onSnapshot, collection, query, where, documentId,
} from 'firebase/firestore'
import { COL } from '../constants/collections'
import {
  DEFAULT_CONFIG, netRevenue, foodCostPct, grossProfit, bepDaily, hitBep, laborTotal, hubFoodCostStats,
} from '../utils/calc'
import { toDateKey, addDays, toMonthKey } from '../utils/formatDate'
import { aggregateGross } from '../utils/integrations'

const num = (v) => (Number.isFinite(v) ? v : 0)
function prevMonthKey(mk) {
  let y = +mk.slice(0, 4), m = +mk.slice(4, 6) - 1
  if (m < 1) { m = 12; y -= 1 }
  return `${y}${String(m).padStart(2, '0')}`
}

/**
 * โหลด config + ยอดขาย/COGS ย้อนหลัง window วัน + ค่าแรงเดือนล่าสุด → คำนวณ BEP (real-time)
 * BEP/วัน = (Fixed/เดือน ÷ openDays) ÷ (1 − FoodCost%เฉลี่ย30วัน)  · Fixed = ค่าแรง + ค่าเช่า + ธรรมเนียม/12
 * คืน { loading, cfg, series, today, avgFoodCostPct, bep, fixedMonthly }
 */
export function useInsightData(branchId = 'default') {
  const [loading, setLoading] = useState(true)
  const [cfg, setCfg] = useState(DEFAULT_CONFIG)
  const [series, setSeries] = useState([])
  const [agg, setAgg] = useState({ avgFoodCostPct: 0, bep: 0, fixedMonthly: 0 })

  const store = useRef({ cfg: DEFAULT_CONFIG, gross: {}, cogs: {}, curLabor: 0, prevLabor: 0 })

  useEffect(() => {
    const today = new Date()
    const window = DEFAULT_CONFIG.foodCostWindow
    const fromKey = toDateKey(addDays(today, -(window - 1)))
    const toKey = toDateKey(today)
    const dayKeys = []
    for (let i = 0; i < window; i++) dayKeys.push(toDateKey(addDays(today, -(window - 1 - i))))

    const curMk = toMonthKey(today)
    const prevMk = prevMonthKey(curMk)

    function recompute() {
      const c = store.current.cfg
      // คำนวณ net/cogs/fc รายวันก่อน
      const base = dayKeys.map(k => {
        const gross = num(store.current.gross[k])
        const cogs = num(store.current.cogs[k])
        const net = netRevenue(gross, c.vatRate)
        return { dateKey: k, gross, cogs, net, foodCostPct: foodCostPct(cogs, net), grossProfit: grossProfit(net, cogs), hasData: gross > 0 || cogs > 0 }
      })
      // BEP: ฐาน gross (ซื้อวัตถุดิบ+ขายรวม VAT) → food cost ÷ ยอด gross · เฉพาะวันข้อมูลครบ
      const complete = base.filter(d => d.net > 0 && d.cogs > 0)
      const totCogs = complete.reduce((s, d) => s + d.cogs, 0)
      const totGross = complete.reduce((s, d) => s + d.gross, 0)
      const avgFcBep = totGross > 0 ? (totCogs / totGross) * 100 : 0
      // แสดงผล: Food Cost % แบบ Hub (gross + เฉลี่ย mean + ตัดวันไม่ครบ) → ตรงกับหน้า Hub
      const avgFcDisplay = hubFoodCostStats(base).avg
      // Fixed/เดือน = ค่าแรง(เดือนนี้ ถ้ายังไม่กรอกใช้เดือนก่อน) + ค่าเช่า + ธรรมเนียม/12
      const labor = store.current.curLabor > 0 ? store.current.curLabor : store.current.prevLabor
      const fixedMonthly = num(c.rentCost) + num(c.annualFeeYearly) / 12 + labor
      const bep = bepDaily(fixedMonthly, avgFcBep, c.openDays)   // BEP = ยอดขายรวม VAT/วัน
      // ติดธง hit ด้วย BEP คงที่ (เทียบยอด gross)
      const s = base.map(d => ({ ...d, bepDaily: bep, hitBep: hitBep(d.gross, bep) }))

      setSeries(s)
      setAgg({ avgFoodCostPct: avgFcDisplay, bep, fixedMonthly })
      setLoading(false)
    }

    const subs = [
      onSnapshot(doc(db, COL.CONFIG, branchId), snap => {
        const data = snap.exists() ? snap.data() : {}
        store.current.cfg = { ...DEFAULT_CONFIG, ...data }
        setCfg(store.current.cfg); recompute()
      }, recompute),
      onSnapshot(query(collection(db, COL.INCOME_RECORDS),
        where(documentId(), '>=', fromKey), where(documentId(), '<=', toKey + '')), snap => {
        store.current.gross = aggregateGross(snap.docs, branchId); recompute()
      }, recompute),
      onSnapshot(query(collection(db, COL.CUT_STOCK_LOGS),
        where('date', '>=', fromKey), where('date', '<=', toKey)), snap => {
        const wh = (branchId && branchId !== 'default') ? branchId : 'all'   // branch = warehouseId
        const m = {}
        snap.docs.map(s => s.data()).filter(d => !d.deletedAt && !d.cancelled)
          .filter(d => wh === 'all' || d.warehouseId === wh)
          .forEach(d => { m[d.date] = num(m[d.date]) + num(d.totalCost) })
        store.current.cogs = m; recompute()
      }, recompute),
      onSnapshot(doc(db, COL.MONTHLY_DATA, `${branchId}_${curMk}`), snap => {
        store.current.curLabor = snap.exists() ? laborTotal(snap.data().labor || {}, 5) : 0; recompute()
      }, recompute),
      onSnapshot(doc(db, COL.MONTHLY_DATA, `${branchId}_${prevMk}`), snap => {
        store.current.prevLabor = snap.exists() ? laborTotal(snap.data().labor || {}, 5) : 0; recompute()
      }, recompute),
    ]
    return () => subs.forEach(u => u())
  }, [branchId])

  const todayRec = series[series.length - 1] || null
  return { loading, cfg, series, today: todayRec, ...agg }
}
