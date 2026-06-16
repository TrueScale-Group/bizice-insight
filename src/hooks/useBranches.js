import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { collection, onSnapshot } from 'firebase/firestore'
import { COL } from '../constants/collections'

// branch = warehouse ของ Inventory (active && ไม่ใช่คลังกลาง) → sync อัตโนมัติ ไม่กรอกมือ
const DEFAULT = { id: 'default', name: 'รวมทุกสาขา', code: '' }

/** อ่านสาขาจาก Inv_warehouses (read-only sync จาก Inventory) */
export function useBranches() {
  const [branches, setBranches] = useState([DEFAULT])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, COL.WAREHOUSES),
      snap => {
        const shops = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .filter(w => w.active !== false && !(w.type === 'main' || w.isMain))
          .map(w => ({ id: w.id, name: w.name || w.code || w.id, code: w.code || '' }))
          .sort((a, b) => a.name.localeCompare(b.name, 'th'))
        setBranches([DEFAULT, ...shops])   // "รวมทุกสาขา" นำหน้าเสมอ
        setLoading(false)
      },
      () => { setBranches([DEFAULT]); setLoading(false) },
    )
    return unsub
  }, [])

  return { branches, loading }
}
