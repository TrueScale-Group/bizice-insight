import { useState } from 'react'
import { NumField } from './Accordion'
import { investorModels, thb, pctStr, STATUS_COLORS } from '../utils/calc'
import { useScenarios } from '../hooks/useScenarios'

/** Investor Pitch Calculator — 3 โมเดล · 2 มุม (ผู้ลงทุน/เจ้าของ) · save/load scenarios */
export function InvestorCalculator({ defaultProfit = 0, branchId = 'default' }) {
  const [I, setI] = useState(500000)
  const [P, setP] = useState(Math.round(defaultProfit) || 200000)
  const [T, setT] = useState(3)
  const [r, setR] = useState(5)
  const [s, setS] = useState(20)

  const { scenarios, saveScenario, deleteScenario } = useScenarios(branchId)
  const [showNameInput, setShowNameInput] = useState(false)
  const [name, setName] = useState('')

  async function handleSave() {
    const n = name.trim()
    if (!n) return
    await saveScenario(n, { I, P, T, r, s })
    setName('')
    setShowNameInput(false)
  }

  function loadScenario(sc) {
    setI(sc.raiseAmount ?? 0)
    setP(sc.projectedProfit ?? 0)
    setT(sc.termYears ?? 0)
    setR(sc.lowRate ?? 0)
    setS(sc.equityShare ?? 0)
  }

  const m = investorModels(I, P, r, s)

  const MODELS = [
    { key: 'free', name: 'ปลอดดอก', emoji: '🆓', d: m.free },
    { key: 'lowRate', name: 'ดอกต่ำ', emoji: '💵', d: m.lowRate },
    { key: 'equity', name: 'ร่วมหุ้น', emoji: '🤝', d: m.equity },
  ]

  return (
    <>
      <p className="acc-note">จำลองตอนระดมทุน/หาผู้ร่วมทุน — เทียบ 3 ทางเลือก (ปลอดดอก / ดอกต่ำ / ร่วมหุ้น)</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <NumField label="เงินที่ระดม (I)" value={I} onChange={setI} />
        <NumField label="กำไรคาด/ปี (P)" value={P} onChange={setP} />
        <NumField label="ระยะเวลา (T)" value={T} unit="ปี" onChange={setT} />
        <NumField label="ดอกเบี้ย (r)" value={r} unit="%" onChange={setR} />
        <NumField label="สัดส่วนหุ้น (s)" value={s} unit="%" onChange={setS} />
      </div>

      {/* 💾 Save / Load scenarios */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
        {!showNameInput ? (
          <button
            onClick={() => setShowNameInput(true)}
            style={{
              alignSelf: 'flex-start', background: 'var(--red)', color: '#fff', border: 'none',
              borderRadius: 8, padding: '6px 12px', fontFamily: 'Prompt, sans-serif',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >💾 เซฟ scenario</button>
        ) : (
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              placeholder="ชื่อ scenario…"
              autoFocus
              style={{
                flex: 1, border: '1px solid var(--line, #ddd)', borderRadius: 8,
                padding: '6px 10px', fontFamily: 'Prompt, sans-serif', fontSize: 13,
              }}
            />
            <button
              onClick={handleSave}
              style={{
                background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 8,
                padding: '6px 12px', fontFamily: 'Prompt, sans-serif', fontSize: 13,
                fontWeight: 600, cursor: 'pointer',
              }}
            >บันทึก</button>
            <button
              onClick={() => { setShowNameInput(false); setName('') }}
              style={{
                background: 'transparent', color: 'var(--txt3, #888)', border: 'none',
                fontFamily: 'Prompt, sans-serif', fontSize: 13, cursor: 'pointer',
              }}
            >ยกเลิก</button>
          </div>
        )}

        {scenarios.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {scenarios.map(sc => (
              <div
                key={sc.name}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                  border: '1px solid var(--line, #eee)', borderRadius: 8, fontSize: 12,
                  fontFamily: 'Prompt, sans-serif',
                }}
              >
                <button
                  onClick={() => loadScenario(sc)}
                  style={{
                    flex: 1, textAlign: 'left', background: 'transparent', border: 'none',
                    cursor: 'pointer', fontFamily: 'Prompt, sans-serif', fontSize: 12, padding: 0,
                  }}
                >
                  <b style={{ color: 'var(--red)' }}>{sc.name}</b>
                  <span style={{ color: 'var(--txt3, #888)' }}>
                    {' '}— ระดม {thb(sc.raiseAmount)} · หุ้น {pctStr(sc.equityShare)}
                  </span>
                </button>
                <button
                  onClick={() => deleteScenario(sc.name)}
                  title="ลบ"
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontSize: 14, lineHeight: 1, padding: 2,
                  }}
                >🗑</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ผลตอบแทนธุรกิจ + คำแนะนำ */}
      <div className="hint-row">
        ผลตอบแทนธุรกิจ (P/I) = <b>{pctStr(m.businessRoi)}</b> · เทียบดอกเบี้ย {pctStr(r)} →{' '}
        <b style={{ color: 'var(--red)' }}>{m.advice}</b>
      </div>

      {/* 3 โมเดล */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {MODELS.map(({ key, name, emoji, d }) => (
          <div key={key} className="model-card">
            <div className="model-head">{emoji} {name}
              {d.returnsPrincipal ? <span className="tag tag-ok">คืนต้น ✓</span> : <span className="tag tag-eq">ถือหุ้น</span>}
            </div>
            <div className="model-grid">
              <div className="model-col">
                <div className="model-col-h">👤 ผู้ลงทุน</div>
                <div>ได้/ปี <b>{thb(d.investorYr)}</b></div>
                <div>ROI <b>{pctStr(d.investorRoi)}</b></div>
                <div className="model-sum">รวม {T} ปี ≈ {thb(d.investorYr * T + (d.returnsPrincipal ? +I : 0))}</div>
              </div>
              <div className="model-col">
                <div className="model-col-h" style={{ color: 'var(--red)' }}>🏪 เจ้าของ</div>
                <div>ต้นทุน <b>{thb(d.ownerCost)}</b></div>
                <div>เก็บกำไร <b style={{ color: STATUS_COLORS.green }}>{thb(d.ownerKeep)}</b></div>
                <div className="model-sum">ภาระ: {d.ownerBurden}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
