/**
 * integrations.js — อ่านข้อมูลข้ามแอพ (READ-ONLY)
 * ห้ามเขียนกลับ collection ของแอพอื่น
 *
 * ⚠️ date key = AD "YYYY-MM-DD" เสมอ (ตรงกับข้อมูลจริง — ถ้าใช้ พ.ศ. จะได้ 0)
 * ⚠️ Inv_cut_logs: field deletedAt/cancelled ไม่ถูกเขียนเป็น null → ต้อง filter ฝั่ง client
 *    (ห้ามใช้ .where('deletedAt','==',null) — จะคืน 0 docs)
 */
import { db } from '../firebase'
import {
  doc, getDoc, collection, query, where, documentId, getDocs,
} from 'firebase/firestore'
import { COL, MIXUE_DATA_DOC } from '../constants/collections'

const num = (v) => (Number.isFinite(v) ? v : 0)

// gross รายวัน (รวม VAT) จาก income_records/{dateKey}
export async function getGrossRevenue(dateKey) {
  const snap = await getDoc(doc(db, COL.INCOME_RECORDS, dateKey))
  if (!snap.exists()) return 0
  const d = snap.data()
  return num(d.morning?.total) + num(d.afternoon?.total)
}

// COGS รายวัน (มูลค่าตัดสต็อก) จาก Inv_cut_logs
export async function getCOGS(dateKey, warehouseId) {
  let q = query(collection(db, COL.CUT_STOCK_LOGS), where('date', '==', dateKey))
  if (warehouseId && warehouseId !== 'all') {
    q = query(collection(db, COL.CUT_STOCK_LOGS),
      where('date', '==', dateKey), where('warehouseId', '==', warehouseId))
  }
  const snap = await getDocs(q)
  return snap.docs
    .map(d => d.data())
    .filter(d => !d.deletedAt && !d.cancelled)   // soft-delete ฝั่ง client
    .reduce((s, d) => s + num(d.totalCost), 0)
}

// ราคาวัตถุดิบ master จาก Cost Manager
export async function getIngredientPrices() {
  const snap = await getDoc(doc(db, COL.MIXUE_DATA, MIXUE_DATA_DOC))
  if (!snap.exists()) return []
  return snap.data().library || []
}

// ── ช่วงหลายวัน (สำหรับ trend / เฉลี่ย food cost 30 วัน) ──
// คืน Map<dateKey, gross>
export async function getGrossRange(fromKey, toKey) {
  const q = query(
    collection(db, COL.INCOME_RECORDS),
    where(documentId(), '>=', fromKey),
    where(documentId(), '<=', toKey),
  )
  const snap = await getDocs(q)
  const map = {}
  snap.forEach(s => {
    const d = s.data()
    map[s.id] = num(d.morning?.total) + num(d.afternoon?.total)
  })
  return map
}

// คืน Map<dateKey, cogs> (รวมทุก warehouse หรือเฉพาะที่ระบุ)
export async function getCOGSRange(fromKey, toKey, warehouseId) {
  const q = query(
    collection(db, COL.CUT_STOCK_LOGS),
    where('date', '>=', fromKey),
    where('date', '<=', toKey),
  )
  const snap = await getDocs(q)
  const map = {}
  snap.docs
    .map(s => s.data())
    .filter(d => !d.deletedAt && !d.cancelled)
    .filter(d => !warehouseId || warehouseId === 'all' || d.warehouseId === warehouseId)
    .forEach(d => { map[d.date] = num(map[d.date]) + num(d.totalCost) })
  return map
}
