import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { COL } from '../constants/collections'

const EMPTY = {
  franchiseFee: 0, franchiseDepositRefundable: 0,
  equipmentCost: 0, renovationCost: 0, workingCapital: 0, otherCost: 0,
  ownerEquity: 0, loanDebt: 0,
}

/** อ่าน/เขียน insight_capital/{branchId} (กรอกครั้งเดียว) */
export function useCapital(branchId = 'default') {
  const [capital, setCapital] = useState(EMPTY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, COL.CAPITAL, branchId),
      s => { setCapital({ ...EMPTY, ...(s.exists() ? s.data() : {}) }); setLoading(false) },
      () => setLoading(false),
    )
    return unsub
  }, [branchId])

  async function saveCapital(patch) {
    await setDoc(doc(db, COL.CAPITAL, branchId),
      { ...patch, updatedAt: new Date().toISOString() }, { merge: true })
  }

  return { capital, loading, saveCapital }
}

export { EMPTY as EMPTY_CAPITAL }
