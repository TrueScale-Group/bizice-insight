import { useEffect, useState } from 'react'
import { useMonthlyInsight, currentMonthKey } from '../hooks/useMonthlyInsight'
import { Accordion, NumField } from '../components/Accordion'
import { thb, pctStr, STATUS_COLORS } from '../utils/calc'
import { toThaiMonth } from '../utils/formatDate'

// monthKey "YYYYMM" ↔ input[type=month] "YYYY-MM"
const toInput = (k) => `${k.slice(0, 4)}-${k.slice(4, 6)}`
const fromInput = (v) => v.replace('-', '')

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
  const { loading, monthly, indices, revenueMonthNet, isCurrentMonth, save } = useMonthlyInsight(branchId, monthKey)
  const [draft, setDraft] = useState({})
  const [saved, setSaved] = useState(false)

  // seed draft จาก doc เมื่อเปลี่ยนเดือน/โหลดเสร็จ
  useEffect(() => {
    if (loading) return
    const M = monthly || {}
    setDraft({
      ...M.labor, // salary/daily/pt/ot/bonus
      mktReal: M.mktReal, mktPromoEst: M.mktPromoEst, mktPromoNote: M.mktPromoNote || '',
      ...O_FIELDS.reduce((a, [k]) => ({ ...a, [k]: M[k] }), {}),
      interestExpense: M.interestExpense,
    })
  }, [loading, monthKey]) // eslint-disable-line

  const set = (k) => (v) => setDraft(d => ({ ...d, [k]: v }))

  async function handleSave() {
    const patch = {
      labor: L_FIELDS.reduce((a, [k]) => ({ ...a, [k]: +draft[k] || 0 }), {}),
      mktReal: +draft.mktReal || 0,
      mktPromoEst: +draft.mktPromoEst || 0,
      mktPromoNote: draft.mktPromoNote || '',
      interestExpense: +draft.interestExpense || 0,
      ...O_FIELDS.reduce((a, [k]) => ({ ...a, [k]: +draft[k] || 0 }), {}),
    }
    await save(patch)
    setSaved(true); setTimeout(() => setSaved(false), 1800)
  }

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
          {saved && <div className="toast-ok">✓ บันทึกแล้ว</div>}

          {/* เลือกเดือน — กรอกล่วงหน้า/ย้อนหลังได้ */}
          <label className="fld">
            <span className="fld-label">เดือน (กรอกล่วงหน้า/ย้อนหลังได้)</span>
            <div className="fld-input">
              <input type="month" value={toInput(monthKey)} onChange={e => e.target.value && setMonthKey(fromInput(e.target.value))} />
            </div>
          </label>

          {/* preview ยอดขายสุทธิเดือน */}
          <div className="card" style={{ padding: 12 }}>
            <div className="card-label" style={{ textAlign: 'left' }}>ยอดขายสุทธิเดือนนี้ (จาก Daily Income)</div>
            <div style={{ fontFamily: 'Prompt', fontWeight: 700, fontSize: 20, color: '#1D4ED8' }}>{thb(revenueMonthNet)}</div>
            {isCurrentMonth && <div className="kpi-sub">⏳ เดือนปัจจุบัน — ไฟสถานะขึ้นตอนจบเดือน</div>}
          </div>

          <Accordion title="ค่าแรง" icon="👥" defaultOpen
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
            <p className="acc-note">ค่าเช่าดึงจากตั้งค่า · ค่าแรง+การตลาดรวมให้อัตโนมัติ</p>
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
