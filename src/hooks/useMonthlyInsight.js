import { useEffect, useRef, useState } from 'react'
import { db } from '../firebase'
import {
  doc, onSnapshot, setDoc, collection, query, where, documentId,
} from 'firebase/firestore'
import { COL } from '../constants/collections'
import {
  DEFAULT_CONFIG, netRevenue, laborTotal, marketingSpent, marketingBudget,
  opexTotal, ebit, ebt, ratio, laborHeadroom, bepDaily, bepMonthly,
  laborStatus, marketingStatus, opexStatus, netProfitMonthlyStatus, foodCostPct, defaultOpenDays,
} from '../utils/calc'
import { toDateKey } from '../utils/formatDate'
import { aggregateGross } from '../utils/integrations'

const num = (v) => (Number.isFinite(v) ? v : 0)

function monthRange(monthKey) {
  const y = +monthKey.slice(0, 4), m = +monthKey.slice(4, 6)
  const mm = String(m).padStart(2, '0')
  return { y, m, from: `${y}-${mm}-01`, to: `${y}-${mm}-31`, daysInMonth: new Date(y, m, 0).getDate() }
}
function prevMonthKey(monthKey) {
  let y = +monthKey.slice(0, 4), m = +monthKey.slice(4, 6) - 1
  if (m < 1) { m = 12; y -= 1 }
  return `${y}${String(m).padStart(2, '0')}`
}
function currentMonthKey() {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * รวมข้อมูลรายเดือน + คำนวณ 7 ดัชนี + BEP 5 มิติ + loss-streak (real-time)
 * เขียน snapshot/history: insight_kpiHistory · insight_dailySnapshot (ครั้งเดียวต่อ key/session)
 */
export function useMonthlyInsight(branchId = 'default', monthKey = currentMonthKey()) {
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState(null)
  const store = useRef({ cfg: DEFAULT_CONFIG, monthly: {}, prevMonthly: {}, gross: {}, cogs: {}, prevGross: {}, written: new Set() })

  useEffect(() => {
    const { from, to, y, m, daysInMonth } = monthRange(monthKey)
    const pk = prevMonthKey(monthKey)
    const pr = monthRange(pk)
    store.current = { cfg: DEFAULT_CONFIG, monthly: {}, prevMonthly: {}, gross: {}, cogs: {}, prevGross: {}, written: new Set() }

    function recompute() {
      const c = store.current.cfg
      const M = store.current.monthly
      const vat = c.vatRate
      const gross = store.current.gross, cogs = store.current.cogs

      // ยอดขาย/ต้นทุน: ใช้ override ที่กรอกมือก่อน (สำหรับเดือนย้อนหลังที่ Daily Income/Inventory ไม่มีข้อมูล)
      const grossFromApp = Object.values(gross).reduce((s, v) => s + num(v), 0)
      const usingRevOverride = num(M.revenueGrossOverride) > 0
      const grossMonth = usingRevOverride ? num(M.revenueGrossOverride) : grossFromApp
      const revenueMonthNet = netRevenue(grossMonth, vat)
      const cogsFromApp = Object.values(cogs).reduce((s, v) => s + num(v), 0)
      const usingCogsOverride = num(M.cogsOverride) > 0
      const cogsMonth = usingCogsOverride ? num(M.cogsOverride) : cogsFromApp
      // ค่าเช่า/วันเปิด: ต่อเดือนก่อน (ว่าง = ใช้ค่าใน Settings)
      const monthRent = (M.rentCost != null && M.rentCost !== '') ? num(M.rentCost) : num(c.rentCost)
      const monthOpenDays = num(M.openDays) > 0
        ? num(M.openDays)
        : defaultOpenDays(monthKey, num(c.openDays) > 0 ? num(c.openDays) : 30)
      // ยอดเดือนก่อน (สำหรับงบการตลาด forward): ใช้ override ของเดือนก่อนถ้ามี (เดือนย้อนหลังที่กรอกเอง) ก่อนค่อย fallback แอพ
      const PM = store.current.prevMonthly
      const prevOverride = num(PM.revenueGrossOverride)
      const prevGrossMonth = prevOverride > 0
        ? prevOverride
        : Object.values(store.current.prevGross).reduce((s, v) => s + num(v), 0)
      let prevRevenueNet = netRevenue(prevGrossMonth, vat)
      if (prevRevenueNet <= 0) prevRevenueNet = num(c.firstMonthRevenueEst)

      // ── ดัชนีหลัก ──
      const labor = laborTotal(M.labor || {}, 5)
      const laborPct = ratio(labor, revenueMonthNet)
      const headroom = laborHeadroom(revenueMonthNet, labor, c.laborCeiling)
      const mkt = marketingSpent(num(M.mktReal), num(M.mktPromoEst))
      const mktPct = ratio(mkt, revenueMonthNet)
      const budget = marketingBudget(prevRevenueNet, c)
      const mktRemaining = budget.ceiling - mkt
      const annualFeeMonthly = num(c.annualFeeYearly) / 12   // ธรรมเนียมแฟรนไชส์รายปี → เฉลี่ย/เดือน เข้า P&L
      const opex = opexTotal({
        labor, marketing: mkt, rent: monthRent, annualFee: annualFeeMonthly,
        utility: num(M.opexUtility), maintenance: num(M.opexMaintenance),
        supplies: num(M.opexSupplies), paymentFee: num(M.opexPaymentFee),
        royalty: num(M.opexRoyalty), commission: num(M.opexCommission), misc: num(M.opexMisc),
      })
      const opexPct = ratio(opex, revenueMonthNet)
      const ebitVal = ebit(revenueMonthNet, cogsMonth, opex)
      const ebtVal = ebt(ebitVal, num(M.interestExpense))
      const netProfitPct = ratio(ebtVal, revenueMonthNet)
      const fcPct = foodCostPct(cogsMonth, revenueMonthNet)

      const isCurrentMonth = monthKey === currentMonthKey()

      // ── BEP 5 มิติ — ฐาน gross (ซื้อ+ขายรวม VAT) ──
      const fcPctBep = grossMonth > 0 ? (cogsMonth / grossMonth) * 100 : 0   // food cost ÷ ยอด gross
      const fixedMonthly = monthRent + num(c.annualFeeYearly) / 12 + labor
      const bDaily = bepDaily(fixedMonthly, fcPctBep, monthOpenDays)
      const bMonthly = bepMonthly(fixedMonthly, fcPctBep)
      // daily series ของเดือน (เฉพาะวันมีข้อมูล) เรียงตามวัน — เทียบยอด gross
      const dayRows = [...new Set([...Object.keys(gross), ...Object.keys(cogs)])].sort()
        .map(k => { const g = num(gross[k]); return { k, net: g, hit: bDaily > 0 && g >= bDaily, hasData: g > 0 } })
        .filter(d => d.hasData)
      const daysData = dayRows.length
      const daysHit = dayRows.filter(d => d.hit).length
      const today = new Date()
      const daysElapsed = isCurrentMonth ? Math.min(today.getDate(), daysInMonth) : daysInMonth
      const bepCumulative = bDaily * daysElapsed
      const cumDiff = grossMonth - bepCumulative   // + = นำ, − = ตาม (ยอด gross)
      // loss-streak = วันติดต่อกันล่าสุดที่ไม่ทะลุ BEP (มีข้อมูล)
      let streak = 0, shortfall = 0
      for (let i = dayRows.length - 1; i >= 0; i--) {
        if (!dayRows[i].hit) { streak++; shortfall += Math.max(0, bDaily - dayRows[i].net) } else break
      }
      const monthEndPass = grossMonth >= bMonthly && bMonthly > 0
      const bep = {
        daily: bDaily, monthly: bMonthly, cumulative: bepCumulative, revenueMTD: grossMonth, cumDiff,
        daysElapsed, daysHit, daysData,
        monthEndPass, monthEndStatus: isCurrentMonth ? 'none' : (monthEndPass ? 'green' : 'red'),
        lossStreak: streak, shortfall, lossAlert: bDaily > 0 && streak >= num(c.lossAlertDays),
      }

      setState({
        cfg: c, monthly: M, revenueMonthNet, grossMonth, cogsMonth, prevRevenueNet, fcPct, isCurrentMonth, bep,
        usingRevOverride, usingCogsOverride, monthRent, annualFeeMonthly,
        indices: {
          labor: { value: labor, pct: laborPct, headroom, status: isCurrentMonth ? 'none' : laborStatus(laborPct, c) },
          marketing: { value: mkt, pct: mktPct, budget, remaining: mktRemaining, status: isCurrentMonth ? 'none' : marketingStatus(mktPct, c) },
          opex: { value: opex, pct: opexPct, status: isCurrentMonth ? 'none' : opexStatus(opexPct, c) },
          netProfit: { ebit: ebitVal, ebt: ebtVal, pct: netProfitPct, status: isCurrentMonth ? 'none' : netProfitMonthlyStatus(netProfitPct, c) },
        },
      })
      setLoading(false)

      // ── A5: เขียน history/snapshot (ครั้งเดียวต่อ key/session) · ไม่เขียนถ้าเป็น viewer ──
      const w = store.current.written
      const canWrite = window._bizMode !== 'viewer'
      if (canWrite && revenueMonthNet > 0 && !w.has('kpi')) {
        w.add('kpi')
        setDoc(doc(db, COL.KPI_HISTORY, `${branchId}_${monthKey}`), {
          branchId, monthKey, labor: laborPct, marketing: mktPct, opex: opexPct, netProfit: netProfitPct,
          bep: bDaily, foodCost: fcPct, opexValue: opex, revenueMonth: revenueMonthNet,
          updatedAt: new Date().toISOString(),
        }, { merge: true }).catch(() => {})
      }
      const tkey = toDateKey(today)
      if (canWrite && isCurrentMonth && num(gross[tkey]) > 0 && !w.has('day')) {
        w.add('day')
        const netT = netRevenue(num(gross[tkey]), vat), cogsT = num(cogs[tkey])
        setDoc(doc(db, COL.DAILY_SNAPSHOT, `${branchId}_${tkey}`), {
          branchId, date: tkey, revenue: netT, cogs: cogsT, foodCostPct: foodCostPct(cogsT, netT),
          grossProfit: netT - cogsT, bepDaily: bDaily, hitBep: bDaily > 0 && netT >= bDaily,
          updatedAt: new Date().toISOString(),
        }, { merge: true }).catch(() => {})
      }
    }

    const subs = [
      onSnapshot(doc(db, COL.CONFIG, branchId), s => {
        store.current.cfg = { ...DEFAULT_CONFIG, ...(s.exists() ? s.data() : {}) }; recompute()
      }, recompute),
      onSnapshot(doc(db, COL.MONTHLY_DATA, `${branchId}_${monthKey}`), s => {
        store.current.monthly = s.exists() ? s.data() : {}; recompute()
      }, recompute),
      onSnapshot(doc(db, COL.MONTHLY_DATA, `${branchId}_${pk}`), s => {
        store.current.prevMonthly = s.exists() ? s.data() : {}; recompute()
      }, recompute),
      onSnapshot(query(collection(db, COL.INCOME_RECORDS),
        where(documentId(), '>=', from), where(documentId(), '<=', to + '')), s => {
        store.current.gross = aggregateGross(s.docs, branchId); recompute()
      }, recompute),
      onSnapshot(query(collection(db, COL.INCOME_RECORDS),
        where(documentId(), '>=', pr.from), where(documentId(), '<=', pr.to + '')), s => {
        store.current.prevGross = aggregateGross(s.docs, branchId); recompute()
      }, recompute),
      onSnapshot(query(collection(db, COL.CUT_STOCK_LOGS),
        where('date', '>=', from), where('date', '<=', to)), s => {
        const wh = (branchId && branchId !== 'default') ? branchId : 'all'   // branch = warehouseId
        const mp = {}
        s.docs.map(d => d.data()).filter(d => !d.deletedAt && !d.cancelled)
          .filter(d => wh === 'all' || d.warehouseId === wh)
          .forEach(d => { mp[d.date] = num(mp[d.date]) + num(d.totalCost) })
        store.current.cogs = mp; recompute()
      }, recompute),
    ]
    return () => subs.forEach(u => u())
  }, [branchId, monthKey])

  async function save(patch) {
    await setDoc(doc(db, COL.MONTHLY_DATA, `${branchId}_${monthKey}`),
      { ...patch, updatedAt: new Date().toISOString() }, { merge: true })
  }

  return { loading, ...(state || {}), save }
}

export { currentMonthKey }
