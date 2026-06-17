import { useEffect, useState } from 'react'
import { useConfig } from '../hooks/useConfig'
import { useBranches } from '../hooks/useBranches'
import { NumField } from '../components/Accordion'
import { Modal } from '../components/Modal'

function SettingRow({ icon, title, desc, onClick, danger }) {
  return (
    <div className="setting-row" onClick={onClick}>
      <div className="setting-left">
        <span className="setting-icon">{icon}</span>
        <span className="setting-title" style={danger ? { color: '#DC2626' } : {}}>{title}</span>
      </div>
      <div className="setting-right-wrap">
        {desc && <span className="setting-desc">{desc}</span>}
        <span className="setting-arrow">›</span>
      </div>
    </div>
  )
}

export function Settings({ branchId = 'default' }) {
  const { cfg, loading, saveConfig } = useConfig(branchId)
  const { branches } = useBranches()
  const [draft, setDraft] = useState(cfg)
  const [modal, setModal] = useState(null)   // section id
  const [saved, setSaved] = useState('')

  useEffect(() => { setDraft(cfg) }, [loading, branchId]) // eslint-disable-line
  const set = (k) => (v) => setDraft(d => ({ ...d, [k]: v }))
  const setStr = (k) => (e) => setDraft(d => ({ ...d, [k]: e.target.value }))

  async function save(keys, label) {
    const patch = {}; keys.forEach(k => { patch[k] = draft[k] })
    await saveConfig(patch)
    setModal(null); setSaved(label); setTimeout(() => setSaved(''), 1800)
  }

  if (loading) return <div className="loading">กำลังโหลดตั้งค่า…</div>

  const appVer = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.1.0'
  const buildDate = typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : ''

  return (
    <div className="page">
      {saved && <div className="toast-ok">✓ บันทึก {saved} แล้ว</div>}

      <div className="set-subbar">ตั้งค่า</div>

      {/* กลุ่ม: ข้อมูล & ต้นทุน */}
      <div className="set-card">
        <SettingRow icon="🏬" title="จัดการสาขา" desc={`${branches.length} สาขา`} onClick={() => setModal('branchList')} />
        <SettingRow icon="🏪" title="ข้อมูลสาขา" desc={draft.branchName || 'Mixue'} onClick={() => setModal('branch')} />
        <SettingRow icon="🧊" title="ต้นทุนแปรผัน (Food Cost)" desc={`เฉลี่ย ${draft.foodCostWindow} วัน`} onClick={() => setModal('variable')} />
        <SettingRow icon="🏠" title="ต้นทุนคงที่" onClick={() => setModal('fixed')} />
      </div>

      {/* กลุ่ม: เกณฑ์ & นิยาม */}
      <div className="set-card">
        <SettingRow icon="🚦" title="เกณฑ์ไฟสถานะ" onClick={() => setModal('threshold')} />
        <SettingRow icon="📐" title="นิยามกำไร & การเตือน" onClick={() => setModal('profit')} />
        <SettingRow icon="🔌" title="การเชื่อมต่อข้อมูล" onClick={() => setModal('connect')} />
      </div>

      {/* Version Footer */}
      <div className="set-footer">
        <div className="set-foot-name">Mixue Insight · BizICE</div>
        <div className="set-foot-ver">
          <span className="set-ver-pill">v{appVer}</span>
          {buildDate && <><span>·</span><span>อัพเดท {buildDate}</span></>}
        </div>
      </div>

      {/* ── Modals ── */}
      <Modal open={modal === 'branchList'} onClose={() => setModal(null)} title="สาขา (sync จาก Inventory)">
        <p className="acc-note">🔄 รายชื่อสาขา sync อัตโนมัติจาก <b>Inventory</b> (คลังที่ไม่ใช่คลังกลาง) — แก้/เพิ่มสาขาที่แอป Inventory · เลือกสาขาที่ใช้งานได้จากแถบบนสุดของแอป</p>
        {branches.map(b => (
          <div className="dt-row" key={b.id}>
            <span><b style={{ color: '#1A7F37', fontWeight: 700 }}>Inventory</b> · {b.name}</span>
            <b style={{ color: b.id === branchId ? 'var(--red)' : 'var(--txt3)' }}>{b.id === branchId ? 'ใช้งานอยู่' : b.id}</b>
          </div>
        ))}
      </Modal>

      <Modal open={modal === 'branch'} onClose={() => setModal(null)} title="ข้อมูลสาขา">
        <label className="fld"><span className="fld-label">ชื่อสาขา</span>
          <div className="fld-input"><input value={draft.branchName ?? ''} onChange={setStr('branchName')} placeholder="Mixue - 509" /></div></label>
        <p className="acc-note">🔄 สาขา/คลัง sync จาก Inventory อัตโนมัติ (เลือกจากแถบบน/sidebar) — ต้นทุนกรองตามคลังของสาขาที่เลือก</p>
        <NumField label="วันเปิด/เดือน" value={draft.openDays} unit="วัน" onChange={set('openDays')} />
        <NumField label="VAT" value={draft.vatRate} unit="%" onChange={set('vatRate')} />
        <button className="btn-save" onClick={() => save(['branchName', 'openDays', 'vatRate'], 'สาขา')}>บันทึก</button>
      </Modal>

      <Modal open={modal === 'variable'} onClose={() => setModal(null)} title="ต้นทุนแปรผัน (Food Cost)">
        <p className="acc-note">Food Cost ดึงอัตโนมัติจาก Inventory (มูลค่าตัดสต็อก) ÷ ยอดขายสุทธิ — ตั้งได้แค่ช่วงเฉลี่ย</p>
        <NumField label="เฉลี่ย Food Cost ย้อนหลัง" value={draft.foodCostWindow} unit="วัน" onChange={set('foodCostWindow')} />
        <button className="btn-save" onClick={() => save(['foodCostWindow'], 'ต้นทุนแปรผัน')}>บันทึก</button>
      </Modal>

      <Modal open={modal === 'fixed'} onClose={() => setModal(null)} title="ต้นทุนคงที่">
        <NumField label="ค่าเช่า/เดือน" value={draft.rentCost} onChange={set('rentCost')} />
        <NumField label="ธรรมเนียมรายปี (ระบบหาร 12)" value={draft.annualFeeYearly} onChange={set('annualFeeYearly')} hint="กรอกเต็มปี" />
        <NumField label="ยอดขายเดือนแรก (ประมาณ)" value={draft.firstMonthRevenueEst} onChange={set('firstMonthRevenueEst')} hint="ใช้ตอนไม่มีเดือนก่อน" />
        <button className="btn-save" onClick={() => save(['rentCost', 'annualFeeYearly', 'firstMonthRevenueEst'], 'ต้นทุนคงที่')}>บันทึก</button>
      </Modal>

      <Modal open={modal === 'threshold'} onClose={() => setModal(null)} title="เกณฑ์ไฟสถานะ">
        <div className="grp">ค่าแรง %</div>
        <NumField label="เขียว ≤" value={draft.laborGreen} unit="%" onChange={set('laborGreen')} />
        <NumField label="เพดาน (แดง >)" value={draft.laborCeiling} unit="%" onChange={set('laborCeiling')} />
        <div className="grp">การตลาด %</div>
        <NumField label="ขั้นต่ำ (⚪ <)" value={draft.mktFloor} unit="%" onChange={set('mktFloor')} />
        <NumField label="เป้า" value={draft.mktTarget} unit="%" onChange={set('mktTarget')} />
        <NumField label="เพดาน (แดง >)" value={draft.mktCeiling} unit="%" onChange={set('mktCeiling')} />
        <div className="grp">Opex % (ไตรมาส)</div>
        <NumField label="เขียว ≤" value={draft.opexGreen} unit="%" onChange={set('opexGreen')} />
        <NumField label="เพดาน (แดง >)" value={draft.opexCeiling} unit="%" onChange={set('opexCeiling')} />
        <div className="grp">กำไรเดือน · ROI</div>
        <NumField label="กำไรเดือนเป้า (เขียว ≥)" value={draft.netProfitTarget} unit="%" onChange={set('netProfitTarget')} />
        <NumField label="คืนทุน ฟ้า ≤" value={draft.paybackBlue} unit="ปี" onChange={set('paybackBlue')} />
        <NumField label="คืนทุน เขียว ≤" value={draft.paybackGreen} unit="ปี" onChange={set('paybackGreen')} />
        <NumField label="คืนทุน เหลือง ≤" value={draft.paybackYellow} unit="ปี" onChange={set('paybackYellow')} />
        <button className="btn-save" onClick={() => save(['laborGreen', 'laborCeiling', 'mktFloor', 'mktTarget', 'mktCeiling', 'opexGreen', 'opexCeiling', 'netProfitTarget', 'paybackBlue', 'paybackGreen', 'paybackYellow'], 'เกณฑ์ไฟ')}>บันทึก</button>
      </Modal>

      <Modal open={modal === 'profit'} onClose={() => setModal(null)} title="นิยามกำไร & การเตือน">
        <p className="acc-note">
          • รายวัน = <b>กำไรขั้นต้น</b> (ยอดขาย − ต้นทุนวัตถุดิบ)<br />
          • รายเดือน = <b>กำไรก่อนภาษี</b> (EBIT − ดอกเบี้ย) · ตัดภาษีไว้ v1<br />
          • Opex = SG&A เต็ม (รวมค่าแรง+การตลาด) · ตัด depreciation
        </p>
        <NumField label="เตือนเดือนขาดทุนเมื่อขาดต่อเนื่อง" value={draft.lossAlertDays} unit="วัน" onChange={set('lossAlertDays')} />
        <button className="btn-save" onClick={() => save(['lossAlertDays'], 'นิยามกำไร')}>บันทึก</button>
      </Modal>

      <Modal open={modal === 'connect'} onClose={() => setModal(null)} title="การเชื่อมต่อข้อมูล">
        <p className="acc-note">
          Firebase: <b>mixue-cost-manager</b><br />
          ยอดขาย ← <b>income_records</b> (Daily Income)<br />
          ต้นทุน ← <b>Inv_cut_logs</b> (Inventory)<br />
          ราคา master ← <b>mixue_data</b> (Cost Manager)<br />
          สาขา/คลังที่ใช้อยู่: <b>{branchId === 'default' ? 'รวมทุกสาขา' : branchId}</b>
        </p>
      </Modal>
    </div>
  )
}
