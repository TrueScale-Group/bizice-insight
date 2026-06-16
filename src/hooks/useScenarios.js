import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { collection, doc, onSnapshot, setDoc, deleteDoc, query, where } from 'firebase/firestore'
import { COL } from '../constants/collections'

/** อ่าน/เขียน insight_pitchScenarios — scenario ของ Investor Pitch Calculator (doc id: {branchId}_{name}) */
export function useScenarios(branchId = 'default') {
  const [scenarios, setScenarios] = useState([])

  useEffect(() => {
    const q = query(collection(db, COL.PITCH_SCENARIOS), where('branchId', '==', branchId))
    const unsub = onSnapshot(
      q,
      snap => setScenarios(snap.docs.map(d => d.data())),
      () => setScenarios([]),
    )
    return unsub
  }, [branchId])

  /** บันทึก scenario — รับค่า calculator state {I,P,T,r,s} */
  async function saveScenario(name, { I, P, T, r, s }) {
    await setDoc(
      doc(db, COL.PITCH_SCENARIOS, `${branchId}_${name}`),
      {
        branchId,
        name,
        raiseAmount: I,
        projectedProfit: P,
        termYears: T,
        lowRate: r,
        equityShare: s,
        createdAt: new Date().toISOString(),
      },
      { merge: true },
    )
  }

  async function deleteScenario(name) {
    await deleteDoc(doc(db, COL.PITCH_SCENARIOS, `${branchId}_${name}`))
  }

  return { scenarios, saveScenario, deleteScenario }
}
