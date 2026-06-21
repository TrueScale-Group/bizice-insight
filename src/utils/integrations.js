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

/**
 * รวม gross รายวันจาก docs ของ income_records โดยรองรับ Daily Income เฟส A
 * doc id มี 2 แบบ:  "YYYY-MM-DD" (เก่า)  หรือ  "YYYY-MM-DD_<branchId>" (ใหม่)
 *  - branchId เจาะจง  → เอาเฉพาะสาขานั้น (new) · ถ้าวันนั้นไม่มี new ใช้ old แทน
 *  - branchId 'default' → รวมทุกสาขา (sum new ทุกสาขา) · ถ้าวันนั้นไม่มี new ใช้ old แทน
 * คืน Map<dateKey(YYYY-MM-DD), revenue>
 */
export function aggregateGross(docs, branchId = 'default') {
  const newByDate = {}, oldByDate = {}, sawNew = {}
  docs.forEach(s => {
    const d = s.data()
    const rev = num(d.morning?.total) + num(d.afternoon?.total)
    const dateStr = s.id.slice(0, 10)
    const sfx = s.id.length > 10 ? s.id.slice(11) : null
    if (!sfx) { oldByDate[dateStr] = rev; return }                  // old bare-date
    if (branchId && branchId !== 'default' && sfx !== branchId) return  // คนละสาขา
    newByDate[dateStr] = num(newByDate[dateStr]) + rev              // เจาะจง=ค่าเดียว · default=sum
    sawNew[dateStr] = true
  })
  const out = {}
  new Set([...Object.keys(oldByDate), ...Object.keys(newByDate)]).forEach(dt => {
    out[dt] = sawNew[dt] ? newByDate[dt] : num(oldByDate[dt])
  })
  return out
}

// gross รายวัน (รวม VAT) — branch-aware (เฟส A)
export async function getGrossRevenue(dateKey, branchId = 'default') {
  const map = await getGrossRange(dateKey, dateKey, branchId)
  return num(map[dateKey])
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
// คืน Map<dateKey, gross> — branch-aware (เฟส A)
//   ขอบบน toKey+'' เพื่อให้ครอบ doc รูปแบบใหม่ "{toKey}_<branchId>" ด้วย
export async function getGrossRange(fromKey, toKey, branchId = 'default') {
  const q = query(
    collection(db, COL.INCOME_RECORDS),
    where(documentId(), '>=', fromKey),
    where(documentId(), '<=', toKey + ''),
  )
  const snap = await getDocs(q)
  return aggregateGross(snap.docs, branchId)
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
