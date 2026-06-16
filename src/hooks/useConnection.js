import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { doc, onSnapshot } from 'firebase/firestore'
import { COL, MIXUE_DATA_DOC } from '../constants/collections'

export function useConnection() {
  const [state, setState] = useState('online')
  const [lastSync, setLastSync] = useState('')

  useEffect(() => {
    const onOnline  = () => setState('online')
    const onOffline = () => setState('offline')
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)

    // ping doc ที่มีอยู่จริงเสมอ (master ของ Cost Manager) → ใช้เป็นสัญญาณ online/sync
    const unsub = onSnapshot(
      doc(db, COL.MIXUE_DATA, MIXUE_DATA_DOC),
      () => {
        setState('online')
        setLastSync(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }))
      },
      () => setState('offline')
    )

    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
      unsub()
    }
  }, [])

  return { state, lastSync }
}
