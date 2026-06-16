import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { COL } from '../constants/collections'
import { opexStatus, DEFAULT_CONFIG } from '../utils/calc'

const num = (v) => (Number.isFinite(v) ? v : 0)

// 3 monthKeys ของไตรมาสที่ monthKey อยู่ (YYYYMM)
function quarterMonths(monthKey) {
  const y = +monthKey.slice(0, 4), m = +monthKey.slice(4, 6)
  const qStart = Math.floor((m - 1) / 3) * 3 + 1
  return [0, 1, 2].map(i => `${y}${String(qStart + i).padStart(2, '0')}`)
}

/**
 * อ่าน insight_kpiHistory ของสาขา (real-time) → trend รายเดือน + สรุป Opex รายไตรมาส
 * คืน { history[], quarterly{ opexPct, opexValue, revenue, status, monthsHit } }
 */
export function useHistory(branchId = 'default', cfg = DEFAULT_CONFIG) {
  const [history, setHistory] = useState([])

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, COL.KPI_HISTORY), where('branchId', '==', branchId)),
      snap => {
        const rows = snap.docs.map(d => d.data()).sort((a, b) => (a.monthKey > b.monthKey ? 1 : -1))
        setHistory(rows)
      }, () => setHistory([]),
    )
    return unsub
  }, [branchId])

  // ── Opex รายไตรมาส (rolling 3 เดือนของไตรมาสปัจจุบัน) ──
  const d = new Date()
  const curMk = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
  const qMonths = quarterMonths(curMk)
  const qRows = history.filter(h => qMonths.includes(h.monthKey))
  const opexValue = qRows.reduce((s, h) => s + num(h.opexValue), 0)
  const revenue = qRows.reduce((s, h) => s + num(h.revenueMonth), 0)
  const opexPctQ = revenue > 0 ? (opexValue / revenue) * 100 : 0
  const quarterly = {
    opexPct: opexPctQ, opexValue, revenue, monthsHit: qRows.length,
    status: qRows.length === 0 ? 'none' : opexStatus(opexPctQ, cfg),
  }

  return { history, quarterly }
}
