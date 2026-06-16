import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { COL } from '../constants/collections'
import { DEFAULT_CONFIG } from '../utils/calc'

/** อ่าน/เขียน insight_config/{branchId} (real-time + merge save) */
export function useConfig(branchId = 'default') {
  const [cfg, setCfg] = useState(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, COL.CONFIG, branchId),
      s => { setCfg({ ...DEFAULT_CONFIG, ...(s.exists() ? s.data() : {}) }); setLoading(false) },
      () => setLoading(false),
    )
    return unsub
  }, [branchId])

  async function saveConfig(patch) {
    await setDoc(doc(db, COL.CONFIG, branchId),
      { ...patch, updatedAt: new Date().toISOString() }, { merge: true })
  }

  return { cfg, loading, saveConfig }
}
