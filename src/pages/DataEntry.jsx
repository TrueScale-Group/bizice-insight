import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { doc, getDoc, collection, onSnapshot, query, where, documentId } from 'firebase/firestore'
import { COL } from '../constants/collections'
import { useMonthlyInsight, currentMonthKey } from '../hooks/useMonthlyInsight'
import { Accordion, NumField } from '../components/Accordion'
import { thb, pctStr, STATUS_COLORS } from '../utils/calc'
import { toThaiMonth } from '../utils/formatDate'

// monthKey "YYYYMM" ↔ input[type=month] "YYYY-MM"
const toInput = (k) => `${k.slice(0, 4)}-${k.slice(4, 6)}`
const fromInput = (v) => v.replace('-', '')

// ── back-fill helpers ──
const STORE_OPEN = '202509'   // ร้านเปิด 09/2025
const TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const chipLabel = (k) => `${TH_MON[+k.slice(4, 6) - 1]} ${(+k.slice(0, 4) + 543) % 100}`   // เช่น "ก.ย. 68"
const prevKey = (k) => { let y = +k.slice(0, 4), m = +k.slice(4, 6) - 1; if (m < 1) { m = 12; y-- } return `${y}${String(m).padStart(2, '0')}` }
function monthsFrom(startKey, endKey) {
  const out = []; let y = +startKey.slice(0, 4), m = +startKey.slice(4, 6)
  const ey = +endKey.slice(0, 4), em = +endKey.slice(4, 6)
  while (y < ey || (y === ey && m <= em)) { out.push(`${y}${String(m).padStart(2, '0')}`); m++; if (m > 12) { m = 1; y++ } }
  return out
}

const L_FIELDS = [
  ['salary', 'เงินเดือนประจำ'], ['daily', 'รายวัน'], ['pt', 'พาร์ทไทม์ (PT)'],
  ['ot', 'OT'], ['bonus', 'เบี้ยขยัน/โบนัส'],
]
const O_FIELDS = [
  ['opexUtility', 'น้ำ-ไฟ-เน็ต'], ['opexMaintenance', 'ซ่อมบำรุง'], ['opexSupplies', 'วัสดุสิ้นเปลือง'],
  ['opexPaymentFee', 'ค่าธรรมเนียมรับเงิน'], ['opexRoyalty', 'รอยัลตี้'],
  ['opexCommission', 'ขนส่ง/คอมมิชชั่น'], ['opexMisc', 'เบ็ดเตล็ด'],
]

export function DataEntry({ branchId = 'default', onClose }) {
  const [monthKey, setMonthKey] = useState(currentMonthKey())
  const { loading, monthly, indices, revenueMonthNet, cogsMonth, annualFeeMonthly, usingRevOverride, usingCogsOverride, isCurrentMonth, save } = useMonthlyInsight(branchId, monthKey)
  const [draft, setDraft] = useState({})
  const [toast, setToast] = useState('')
  const [filled, setFilled] = useState(new Set())   // เดือนที่กรอกข้อมูลแล้ว (มี doc)

  // โหลดรายชื่อเดือนที่กรอกแล้ว (ติ๊กเขียวบนแถบเดือน)
  useEffect(() => {
    const lo = `${branchId}_000000`, hi = `${branchId}_999999`
    const unsub = onSnapshot(
      query(collection(db, COL.MONTHLY_DATA), where(documentId(), '>=', lo), where(documentId(), '<=', hi)),
      s => { const set = new Set(); s.forEach(d => set.add(d.id.slice(-6))); setFilled(set) },
      () => {}
    )
    return unsub
  }, [branchId])

  // คัดลอกค่าประจำ (ค่าเช่า/ค่าแรง/การตลาด/Opex/ดอกเบี้ย) จากเดือนก่อน — ไม่แตะยอดขาย/ต้นทุนของเดือนนี้
  async function copyPrevMonth() {
    const pk = prevKey(monthKey)
    const snap = await getDoc(doc(db, COL.MONTHLY_DATA, `${branchId}_${pk}`))
    if (!snap.exists()) { setToast(`⚠️ เดือน ${chipLabel(pk)} ยังไม่มีข้อมูล`); setTimeout(() => setToast(''), 2000); return }
    const M = snap.data()
    setDraft(d => ({
      ...d,   // คงยอดขาย/ต้นทุน override ของเดือนนี้ไว้
      rentCost: M.rentCost, openDays: M.openDays,
      ...(M.labor || {}),
      mktReal: M.mktReal, mktPromoEst: M.mktPromoEst, mktPromoNote: M.mktPromoNote || '',
      ...O_FIELDS.reduce((a, [k]) => ({ ...a, [k]: M[k] }), {}),
      interestExpense: M.interestExpense,
    }))
    setToast(`📋 คัดลอกจาก ${chipLabel(pk)} แล้ว · กดบันทึกเพื่อยืนยัน`); setTimeout(() => setToast(''), 2400)
  }

  // seed draft จาก doc เมื่อเปลี่ยนเดือน/โหลดเสร็จ
  useEffect(() => {
    if (loading) return
    const M = monthly || {}
    setDraft({
      revenueGrossOverride: M.revenueGrossOverride, cogsOverride: M.cogsOverride,
      rentCost: M.rentCost, openDays: M.openDays,
      ...M.labor, // salary/daily/pt/ot/bonus
      mktReal: M.mktReal, mktPromoEst: M.mktPromoEst, mktPromoNote: M.mktPromoNote || '',
      ...O_FIELDS.reduce((a, [k]) => ({ ...a, [k]: M[k] }), {}),
      interestExpense: M.interestExpense,
    })
  }, [loading, monthKey]) // eslint-disable-line

  const set = (k) => (v) => setDraft(d => ({ ...d, [k]: v }))

  async function handleSave() {
    const patch = {
      revenueGrossOverride: +draft.revenueGrossOverride || 0,
      cogsOverride: +draft.cogsOverride || 0,
      rentCost: draft.rentCost === '' || draft.rentCost == null ? null : +draft.rentCost,
      openDays: +draft.openDays || 0,
      labor: L_FIELDS.reduce((a, [k]) => ({ ...a, [k]: +draft[k] || 0 }), {}),
      mktReal: +draft.mktReal || 0,
      mktPromoEst: +draft.mktPromoEst || 0,
      mktPromoNote: draft.mktPromoNote || '',
      interestExpense: +draft.interestExpense || 0,
      ...O_FIELDS.reduce((a, [k]) => ({ ...a, [k]: +draft[k] || 0 }), {}),
    }
    await save(patch)
    setToast('✓ บันทึกแล้ว'); setTimeout(() => setToast(''), 1800)
  }

  const monthList = monthsFrom(STORE_OPEN, currentMonthKey())

  return (
    <div className="overlay">
      <header className="appbar">
        <button className="appbar-back" onClick={onClose}>‹</button>
        <div className="appbar-title">
          <span className="appbar-brand">กรอกข้อมูลรวม</span>
          <span className="appbar-branch">{toThaiMonth(toInput(monthKey) + '-01')}</span>
        </div>
        <button className="btn-save" style={{ width: 'auto', padding: '6px 16px', margin: 0 }} onClick={handleSave}>บันทึก</button>
      </header>

      <main className="ptr-scroll">
        <div className="page">
          {toast && <div className="toast-ok">{toast}</div>}

          {/* แถบเดือนย้อนหลัง — ติ๊กเขียว = กรอกแล้ว (ตั้งแต่เปิดร้าน 09/2025) */}
          <div className="fld-label" style={{ marginBottom: 4 }}>เลือกเดือน (✓ = กรอกแล้ว)</div>
          <div className="month-strip">
            {monthList.map(k => (
              <button key={k} className={`month-chip ${k === monthKey ? 'sel' : ''} ${filled.has(k) ? 'filled' : ''}`}
                onClick={() => setMonthKey(k)}>
                {filled.has(k) && <span className="mc-check">✓</span>}
                {chipLabel(k)}
              </button>
            ))}
          </div>

          {/* เลือกเดือน (ปฏิทิน) + ปุ่มคัดลอกเดือนก่อน */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <label className="fld" style={{ flex: 1 }}>
              <span className="fld-label">หรือเลือกจากปฏิทิน</span>
              <div className="fld-input">
                <input type="month" value={toInput(monthKey)} onChange={e => e.target.value && setMonthKey(fromInput(e.target.value))} />
              </div>
            </label>
            <button className="copy-prev-btn" onClick={copyPrevMonth} title="คัดลอกค่าประจำจากเดือนก่อน">📋 คัดลอกเดือนก่อน</button>
          </div>

          {/* preview ยอดขาย/ต้นทุน + ที่มา */}
          <div className="card" style={{ padding: 12 }}>
            <div className="card-label" style={{ textAlign: 'left' }}>ยอดขายสุทธิเดือนนี้
              {' · '}<b style={{ color: usingRevOverride ? '#1E3A8A' : '#1A7F37' }}>{usingRevOverride ? 'กรอกเอง' : 'Daily Income'}</b></div>
            <div style={{ fontFamily: 'Prompt', fontWeight: 700, fontSize: 20, color: '#1D4ED8' }}>{thb(revenueMonthNet)}</div>
            <div className="kpi-sub">ต้นทุนวัตถุดิบ {thb(cogsMonth)} · <b style={{ color: usingCogsOverride ? '#1E3A8A' : '#1A7F37' }}>{usingCogsOverride ? 'กรอกเอง' : 'Inventory'}</b></div>
            {isCurrentMonth && <div className="kpi-sub">⏳ เดือนปัจจุบัน — ไฟสถานะขึ้นตอนจบเดือน</div>}
          </div>

          {/* ⭐ ย้อนหลัง: กรอกยอดขาย/ต้นทุน/ค่าเช่า เองได้ (เดือนที่แอพอื่นไม่มีข้อมูล) */}
          <Accordion title="ยอดขาย / ต้นทุน / ค่าเช่า (ย้อนหลัง)" icon="🗂️" defaultOpen={!isCurrentMonth}>
            <p className="acc-note">📌 สำหรับเดือนย้อนหลังที่ <b>Daily Income / Inventory ยังไม่มีข้อมูล</b> (เช่นก่อนเริ่มใช้ระบบ) — กรอกยอดรวมเองได้ · <b>เว้นว่าง/0 = ใช้ข้อมูลจริงจากแอพอัตโนมัติ</b></p>
            <NumField label="ยอดขายรวมเดือน (รวม VAT)" value={draft.revenueGrossOverride} onChange={set('revenueGrossOverride')} hint="กรอกเมื่อไม่มีใน Daily Income" />
            <NumField label="ต้นทุนวัตถุดิบรวมเดือน" value={draft.cogsOverride} onChange={set('cogsOverride')} hint="กรอกเมื่อไม่มีใน Inventory" />
            <NumField label="ค่าเช่าเดือนนี้" value={draft.rentCost} onChange={set('rentCost')} hint="ว่าง = ใช้ค่าในตั้งค่า" />
            <NumField label="วันเปิดเดือนนี้" value={draft.openDays} unit="วัน" onChange={set('openDays')} hint="0 = ใช้ค่าตั้งค่า (เดือนเปิด 09/2025 อาจไม่ครบ)" />
          </Accordion>

          <Accordion title="ค่าแรง" icon="👥"
            badge={indices ? pctStr(indices.labor.pct) : null}>
            <p className="acc-note">ไม่นับเงินเดือนเจ้าของ · ระบบบวกประกันสังคมนายจ้าง 5% ให้อัตโนมัติ</p>
            {L_FIELDS.map(([k, label]) => <NumField key={k} label={label} value={draft[k]} onChange={set(k)} />)}
            {indices && <div className="hint-row">รวม +SSO = <b>{thb(indices.labor.value)}</b> · เพดานเหลือ {thb(indices.labor.headroom)}</div>}
          </Accordion>

          <Accordion title="การตลาด" icon="📣" badge={indices ? pctStr(indices.marketing.pct) : null}>
            <NumField label="ค่าการตลาดจริง" value={draft.mktReal} onChange={set('mktReal')} hint="ads/ใบปลิว/ป้าย/ของแถม/event" />
            <NumField label="ส่วนลด/โปร (ประมาณ)" value={draft.mktPromoEst} onChange={set('mktPromoEst')} />
            <label className="fld">
              <span className="fld-label">หมายเหตุโปร</span>
              <div className="fld-input"><input value={draft.mktPromoNote ?? ''} onChange={e => set('mktPromoNote')(e.target.value)} /></div>
            </label>
            {indices && <div className="hint-row">งบเพดานเดือนนี้ (อิงยอดเดือนก่อน) {thb(indices.marketing.budget.ceiling)} · เหลือ {thb(indices.marketing.remaining)}</div>}
          </Accordion>

          <Accordion title="ค่าดำเนินงานอื่น (Opex)" icon="🧾" badge={indices ? pctStr(indices.opex.pct) : null}>
            <p className="acc-note">ค่าเช่าดึงจากตั้งค่า · ค่าแรง+การตลาดรวมให้อัตโนมัติ{annualFeeMonthly > 0 ? ` · ธรรมเนียมรายปี ${thb(annualFeeMonthly)}/เดือน รวมให้แล้ว` : ''}</p>
            {O_FIELDS.map(([k, label]) => <NumField key={k} label={label} value={draft[k]} onChange={set(k)} />)}
          </Accordion>

          <Accordion title="ดอกเบี้ย (กำไรก่อนภาษี)" icon="💸"
            badge={indices ? pctStr(indices.netProfit.pct) : null}>
            <NumField label="ดอกเบี้ยจ่าย/เดือน" value={draft.interestExpense} onChange={set('interestExpense')} hint="default 0" />
            {indices && (
              <div className="hint-row">
                EBIT {thb(indices.netProfit.ebit)} → ก่อนภาษี <b style={{ color: STATUS_COLORS[indices.netProfit.status] }}>{thb(indices.netProfit.ebt)}</b>
              </div>
            )}
          </Accordion>

          <div style={{ height: 16 }} />
          <button className="btn-save" onClick={handleSave}>บันทึกข้อมูลเดือนนี้</button>
        </div>
      </main>
    </div>
  )
}
