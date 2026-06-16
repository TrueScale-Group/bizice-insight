import { useEffect, useState } from 'react'
import { useCapital } from '../hooks/useCapital'
import { useMonthlyInsight } from '../hooks/useMonthlyInsight'
import { Accordion, NumField } from '../components/Accordion'
import { InvestorCalculator } from '../components/InvestorCalculator'
import {
  totalInvestment, investedNet, roi, roe, paybackYears, paybackStatus,
  STATUS_COLORS, thb, pctStr,
} from '../utils/calc'

const STATUS_TH = { blue: 'ดีเยี่ยม', green: 'ดี', yellow: 'พอใช้', red: 'ต้องปรับ' }

export function RoiRoe({ branchId = 'default' }) {
  const { capital, loading, saveCapital } = useCapital(branchId)
  const { indices, cfg } = useMonthlyInsight(branchId)
  const [draft, setDraft] = useState(capital)
  const [saved, setSaved] = useState(false)

  useEffect(() => { setDraft(capital) }, [loading]) // eslint-disable-line
  const set = (k) => (v) => setDraft(d => ({ ...d, [k]: v }))

  if (loading) return <div className="loading">กำลังโหลด…</div>

  const totalInv = totalInvestment(draft)
  const netInv = investedNet(draft)
  const annualProfit = (indices?.netProfit.ebt || 0) * 12   // กำไรก่อนภาษี × 12
  const hasInv = totalInv > 0
  const roiAll = roi(annualProfit, totalInv)
  const roiNet = roi(annualProfit, netInv)
  const roeVal = roe(annualProfit, draft.ownerEquity)
  const payback = paybackYears(totalInv, annualProfit)
  const st = hasInv ? paybackStatus(payback, cfg) : 'none'
  const color = STATUS_COLORS[st]

  async function save() {
    await saveCapital(draft)
    setSaved(true); setTimeout(() => setSaved(false), 1800)
  }

  return (
    <div className="page">
      {saved && <div className="toast-ok">✓ บันทึกเงินลงทุนแล้ว</div>}

      {/* ผลลัพธ์ */}
      <div className="card">
        <div className="roi-hero">
          <div className="roi-main">
            <div className="roi-big" style={{ color: hasInv ? color : 'var(--txt3)' }}>{hasInv ? pctStr(roiAll) : '—'}</div>
            <div className="roi-cap">ROI/ปี (รวม)</div>
          </div>
          <div className="roi-payback" style={{ background: hasInv ? color + '1A' : 'var(--bg)', color: hasInv ? color : 'var(--txt3)' }}>
            {hasInv
              ? <>คืนทุน {Number.isFinite(payback) ? payback.toFixed(1) : '∞'} ปี<br /><b>{STATUS_TH[st]}</b></>
              : <>ยังไม่มีข้อมูล<br /><b>กรอกเงินลงทุน ↓</b></>}
          </div>
        </div>
        <div className="roi-row">
          <div><span>ROI (เงินจมจริง)</span><b>{pctStr(roiNet)}</b></div>
          <div><span>ROE</span><b>{pctStr(roeVal)}</b></div>
        </div>
        <div className="roi-row">
          <div><span>เงินลงทุนรวม</span><b>{thb(totalInv)}</b></div>
          <div><span>เงินจมจริง (หักมัดจำ)</span><b>{thb(netInv)}</b></div>
        </div>
        <div className="roi-note">กำไรต่อปี (ประมาณ) = กำไรก่อนภาษีเดือนล่าสุด × 12 = {thb(annualProfit)}</div>
      </div>

      {/* เครื่องคิดเลข ROI-ROE (ซ่อนได้) */}
      <Accordion title="เครื่องคิดเลข ROI-ROE" icon="🧮">
        <InvestorCalculator defaultProfit={annualProfit} branchId={branchId} />
      </Accordion>

      {/* กรอกเงินลงทุน (ยุบไว้ด้านล่าง) */}
      <Accordion title="เงินลงทุน & โครงสร้างทุน" icon="💰">
        <NumField label="ค่าแฟรนไชส์" value={draft.franchiseFee} onChange={set('franchiseFee')} />
        <NumField label="มัดจำแฟรนไชส์" value={draft.franchiseDepositRefundable} onChange={set('franchiseDepositRefundable')} hint="คืนได้" />
        <NumField label="อุปกรณ์/เครื่องจักร" value={draft.equipmentCost} onChange={set('equipmentCost')} />
        <NumField label="ตกแต่ง/ก่อสร้าง" value={draft.renovationCost} onChange={set('renovationCost')} />
        <NumField label="เงินทุนหมุนเวียน" value={draft.workingCapital} onChange={set('workingCapital')} />
        <NumField label="อื่นๆ" value={draft.otherCost} onChange={set('otherCost')} />
        <div className="grp">โครงสร้างทุน</div>
        <NumField label="ส่วนทุนเจ้าของ (เงินตัวเอง)" value={draft.ownerEquity} onChange={set('ownerEquity')} />
        <NumField label="เงินกู้" value={draft.loanDebt} onChange={set('loanDebt')} />
        <button className="btn-save" onClick={save}>บันทึก</button>
      </Accordion>
    </div>
  )
}
