import { initializeApp } from 'firebase/app'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'

const firebaseConfig = {
  apiKey: 'AIzaSyDRs60WURPcNArQXl5RRuwqJcLjtN3CMe4',
  authDomain: 'mixue-cost-manager.firebaseapp.com',
  projectId: 'mixue-cost-manager',
  storageBucket: 'mixue-cost-manager.firebasestorage.app',
  messagingSenderId: '414432707376',
  appId: '1:414432707376:web:1cf394f174257a86cdbef5',
}

const app = initializeApp(firebaseConfig)

// 📱 Offline persistence — แคช Firestore ลง IndexedDB + multi-tab
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
})

// 🔔 Cloud Functions — push notification ผ่าน FCM (ใช้ใน Phase 3 เตือนเดือนขาดทุน)
const functions = getFunctions(app, 'asia-southeast1')
const sendHubPushFn = httpsCallable(functions, 'sendHubPush')

/** ส่ง FCM push หลังเขียน hub_notifications doc (call ทันที, ไม่ block) */
export function sendHubPush(notifId) {
  if (!notifId) return
  sendHubPushFn({ notifId }).catch(e => console.warn('[sendHubPush]', e?.message || e))
}
