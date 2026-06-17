import { useState } from 'react'
import { useInsightData } from '../hooks/useInsightData'
import { useMonthlyInsight } from '../hooks/useMonthlyInsight'
import { BepGauge } from '../components/BepGauge'
import { KpiCard } from '../components/KpiCard'
import { FoodCostPanel } from '../components/FoodCostPanel'
import { Modal } from '../components/Modal'
import {
  bepProgressPct, bepStatus, grossProfitPct, grossDailyStatus,
  STATUS_COLORS, thb, pctStr,
} from '../utils/calc'
import { toThaiShort } from '../utils/formatDate'

// ไฟ Food Cost (ต่ำ=ดี): 🟢≤45 · 🟡≤48 · 🔴>48
function foodStatus(p) {
  if (p <= 45) return 'green'
  if (p <= 48) return 'yellow'
  return 'red'
}

export function Overview({ branchId = 'default', onTab }) {
  const { loading, today, avgFoodCostPct, series } = useInsightData(branchId)
  const mo = useMonthlyInsight(branchId)
  const [range, setRange] = useState('week') // week | month
  const [bepOpen, setBepOpen] = useState(false)

  if (loading) return <div className="loading">กำลังโหลดข้อมูล…</div>

  const win = range === 'week' ? 7 : 30
  const recent = series.slice(-win)
  const trendOf = (sel) => recent.map(d => ({ label: toThaiShort(d.dateKey), value: sel(d) }))

  const t = today || {}
  const progress = bepProgressPct(t.net, t.bepDaily)
  const bStatus = bepStatus(progress)
  const bColor = STATUS_COLORS[bStatus]
  const bLabel = progress >= 100 ? 'ทะลุจุดคุ้มทุนแล้ว' : progress >= 80 ? 'ใกล้ถึงจุดคุ้มทุน' : 'ต่ำกว่าจุดคุ้มทุน'

  // วันทะลุ BEP ในช่วง
  const hitDays = recent.filter(d => d.hitBep).length
  const dataDays = recent.filter(d => d.hasData).length

  const gpPct = grossProfitPct(t.net, t.cogs)

  return (
    <div className="page">
      {/* ── Hero: BEP gauge (2 คอลัมน์) ── */}
      <div className="card hero">
        <div className="hero-head">
          <span className="card-label" style={{ textAlign: 'left', margin: 0 }}>จุดคุ้มทุนวันนี้ · {toThaiShort(t.dateKey)}</span>
          <div className="mini-seg">
            <button className={range === 'week' ? 'on' : ''} onClick={() => setRange('week')}>Weekly</button>
            <button className={range === 'month' ? 'on' : ''} onClick={() => setRange('month')}>Monthly</button>
          </div>
        </div>
        <div className="hero-2col">
          <div className="hero-left">
            <BepGauge progress={progress} status={bStatus} revenueNet={t.net} bep={t.bepDaily} dialOnly />
          </div>
          <div className="hero-div" />
          <div className="hero-right">
            <div className="hero-status" style={{ color: bColor, background: bColor + '14' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: bColor }} />{bLabel}
            </div>
            <div className="hero-stat">
              <span>ยอดขายวันนี้</span><b style={{ color: '#1D4ED8' }}>{thb(t.net)}</b>
            </div>
            <div className="hero-stat">
              <span>จุดคุ้มทุน/วัน</span><b>{thb(t.bepDaily)}</b>
            </div>
            <div className="hero-stat">
              <span>ทะลุ BEP</span><b style={{ color: STATUS_COLORS.green }}>{hitDays}/{dataDays} วัน</b>
            </div>
            <div className="hero-stat">
              <span>Food Cost เฉลี่ย</span><b style={{ color: avgFoodCostPct > 48 ? STATUS_COLORS.red : STATUS_COLORS.green }}>{pctStr(avgFoodCostPct)}</b>
            </div>
          </div>
        </div>
        {mo.bep?.lossAlert && (
          <div className="loss-banner">
            🔴 เดือนนี้ขาดต่อเนื่อง {mo.bep.lossStreak} วัน · ยอดขาดสะสม {thb(mo.bep.shortfall)} — ต้องเร่งยอด!
          </div>
        )}
        {t.bepDaily === 0 && (
          <div className="hero-hint">⚠️ ยังไม่ได้ตั้งต้นทุนคงที่ — ไปแท็บตั้งค่า กรอกค่าเช่า/ค่าแรง เพื่อให้ BEP แม่นยำ</div>
        )}
        <button className="bep-more-btn" onClick={() => setBepOpen(true)}>📊 ดูจุดคุ้มทุนครบ 5 มิติ ›</button>
      </div>

      {/* ── BEP 5 มิติ (popup) ── */}
      <Modal open={bepOpen} onClose={() => setBepOpen(false)} title="จุดคุ้มทุน · 5 มิติ">
        {mo.bep ? (() => {
          const b = mo.bep
          const dim = (icon, name, value, color, note) => (
            <div className="bep-dim">
              <div className="bep-dim-h"><span>{icon} {name}</span><b style={{ color }}>{value}</b></div>
              {note && <div className="bep-dim-note">{note}</div>}
            </div>
          )
          return <>
            {dim('📅', 'รายวัน (วันนี้)', `${Math.round(progress)}%`, bColor,
              `ยอด ${thb(t.net)} / BEP ${thb(b.daily)}/วัน`)}
            {dim('📈', 'สะสมเทียบ BEP', b.cumDiff >= 0 ? `นำ +${thb(b.cumDiff)}` : `ตาม −${thb(Math.abs(b.cumDiff))}`,
              b.cumDiff >= 0 ? STATUS_COLORS.green : STATUS_COLORS.red,
              `ยอดสะสม ${thb(b.revenueMTD)} / ควรได้ ${thb(b.cumulative)} (${b.daysElapsed} วัน)`)}
            {dim('✅', 'วันทะลุ BEP', `${b.daysHit}/${b.daysData} วัน`,
              b.daysData && b.daysHit / b.daysData >= 0.67 ? STATUS_COLORS.green : STATUS_COLORS.yellow,
              b.daysData ? `${Math.round((b.daysHit / b.daysData) * 100)}% ของวันที่มีข้อมูล` : 'ยังไม่มีข้อมูล')}
            {dim('🏁', 'จบเดือน', mo.isCurrentMonth ? (b.monthEndPass ? 'ผ่านแล้ว ✓' : 'ยังไม่ถึง') : (b.monthEndPass ? 'ผ่าน ✓' : 'ไม่ผ่าน'),
              STATUS_COLORS[b.monthEndStatus] || (b.monthEndPass ? STATUS_COLORS.green : STATUS_COLORS.yellow),
              `ยอดเดือน ${thb(b.revenueMTD)} / BEP เดือน ${thb(b.monthly)}${mo.isCurrentMonth ? ' (ระหว่างเดือน)' : ''}`)}
            {dim('💸', 'เดือนขาดทุน', b.lossStreak > 0 ? `ขาด ${b.lossStreak} วันติด` : 'ปกติ',
              b.lossAlert ? STATUS_COLORS.red : b.lossStreak > 0 ? STATUS_COLORS.yellow : STATUS_COLORS.green,
              b.lossStreak > 0 ? `ยอดขาดสะสม ${thb(b.shortfall)}${b.lossAlert ? ` · ⚠️ ครบเกณฑ์เตือน ${mo.cfg?.lossAlertDays} วัน` : ''}` : 'ทะลุ BEP ต่อเนื่อง 👍')}
          </>
        })() : <div className="kpi-pending">ยังไม่มีข้อมูล</div>}
      </Modal>

      {/* ── กลุ่ม รายวัน (ฟ้าพาสเทล) ── */}
      <div className="grp-box" style={{ borderColor: DAILY_BD }}>
      <div className="grp-head"><span className="grp-bar" style={{ background: DAILY_BD }} />📆 รายวัน (เรียลไทม์)</div>
      <div className="kpi-grid">
        <KpiCard bg={DAILY_BG}
          title="กำไรขั้นต้น (วันนี้)"
          value={thb(t.grossProfit)}
          valueColor={t.grossProfit < 0 ? STATUS_COLORS.red : POS_GREEN}
          sub={`${pctStr(gpPct)} ของยอดขาย`}
          status={t.net > 0 ? grossDailyStatus(gpPct) : 'none'}
          src="Daily Income · Inventory"
          formula="กำไรขั้นต้น = ยอดขายสุทธิ − ต้นทุนวัตถุดิบ"
          rows={[
            { label: 'ยอดขายสุทธิ (Daily Income)', value: thb(t.net) },
            { label: 'ต้นทุนวัตถุดิบ (Inventory)', value: thb(t.cogs) },
            { label: 'กำไรขั้นต้น', value: thb(t.grossProfit), color: t.grossProfit < 0 ? STATUS_COLORS.red : POS_GREEN },
            { label: 'คิดเป็น %', value: pctStr(gpPct) },
          ]}
          legend="🟢 ≥54% · 🟡 50–54% · 🔴 <50% (รายวัน)"
          trend={trendOf(d => Math.round(d.grossProfit))}
          trendColor={STATUS_COLORS.green}
        />
        <KpiCard bg={DAILY_BG}
          title="Food Cost % (เฉลี่ย 30 วัน)"
          value={pctStr(avgFoodCostPct)}
          sub={`ต้นทุน ${thb(t.cogs)} วันนี้`}
          status={avgFoodCostPct > 0 ? foodStatus(avgFoodCostPct) : 'none'}
          src="Inventory ÷ Daily Income"
          formula="Food Cost% = ต้นทุนตัดสต็อก ÷ ยอดขายสุทธิ (เฉลี่ย 30 วันล่าสุด)"
          rows={[
            { label: 'ต้นทุนวันนี้ (Inventory)', value: thb(t.cogs) },
            { label: 'ยอดขายวันนี้ (Daily Income)', value: thb(t.net) },
            { label: 'เฉลี่ย 30 วัน', value: pctStr(avgFoodCostPct) },
          ]}
          customBody={<FoodCostPanel series={series} />}
        />
        <KpiCard bg={DAILY_BG}
          title="ยอดขายสุทธิ (วันนี้)"
          value={thb(t.net)}
          sub={`รวม VAT ${thb(t.gross)}`}
          status="none"
          src="Daily Income (income_records)"
          formula="ยอดขายสุทธิ = (กะเช้า + กะบ่าย) ÷ 1.07 (หัก VAT 7%)"
          rows={[
            { label: 'ยอดรวม VAT (Daily Income)', value: thb(t.gross) },
            { label: 'ยอดขายสุทธิ (หัก VAT)', value: thb(t.net), color: '#1D4ED8' },
          ]}
          trend={trendOf(d => Math.round(d.net))}
          trendColor="#1D4ED8"
        />
      </div>
      </div>

      {/* ── กลุ่ม รายเดือน (ม่วงพาสเทล) ── */}
      <div className="grp-box" style={{ borderColor: MONTH_BD }}>
      <div className="grp-head"><span className="grp-bar" style={{ background: MONTH_BD }} />🗓️ รายเดือน
        {mo.isCurrentMonth && mo.indices && <span className="grp-tag">เดือนปัจจุบัน · งบ/ความคืบหน้า</span>}
      </div>
      <div className="kpi-grid">
        <KpiCard bg={MONTH_BG}
          title="ค่าแรง %"
          value={mo.indices ? pctStr(mo.indices.labor.pct) : '—'}
          sub={mo.indices ? `เหลือเพดาน ${thb(mo.indices.labor.headroom)}` : monthHint}
          status={mo.indices?.labor.status || 'none'}
          src="Insight ÷ Daily Income"
          formula="ค่าแรง% = ค่าแรงรวม (+ ประกันสังคมนายจ้าง 5%) ÷ ยอดขายสุทธิเดือน · ไม่นับเงินเดือนเจ้าของ"
          rows={mo.indices ? [
            { label: 'ค่าแรงรวม (Insight)', value: thb(mo.indices.labor.value) },
            { label: mo.indices.labor.headroom >= 0 ? 'เหลือก่อนแตะเพดาน 30%' : 'เกินเพดาน 30%', value: thb(mo.indices.labor.headroom), color: mo.indices.labor.headroom >= 0 ? STATUS_COLORS.green : STATUS_COLORS.red },
            { label: 'ยอดขายเดือน (Daily Income)', value: thb(mo.revenueMonthNet) },
          ] : null}
          legend="🟢 ≤25% · 🟡 25–30% · 🔴 >30%"
          pending={!mo.indices}
        />
        <KpiCard bg={MONTH_BG}
          title="ค่าการตลาด %"
          value={mo.indices ? pctStr(mo.indices.marketing.pct) : '—'}
          sub={mo.indices ? `เหลืองบ ${thb(mo.indices.marketing.remaining)}` : monthHint}
          status={mo.indices?.marketing.status || 'none'}
          src="Insight"
          formula="การตลาด% = (ค่าจริง + โปร/ส่วนลด) ÷ ยอดขายสุทธิเดือน · เพดานงบอิงยอดเดือนก่อน × 3%"
          rows={mo.indices ? [
            { label: 'ใช้จริง (Insight)', value: thb(mo.indices.marketing.value) },
            { label: 'งบเพดานเดือนนี้', value: thb(mo.indices.marketing.budget.ceiling) },
            { label: mo.indices.marketing.remaining >= 0 ? 'เหลือใช้ได้' : 'เกินงบ', value: thb(mo.indices.marketing.remaining), color: mo.indices.marketing.remaining >= 0 ? STATUS_COLORS.green : STATUS_COLORS.red },
          ] : null}
          legend="⚪ <1% · 🟢 1–3% · 🔴 >3%"
          pending={!mo.indices}
        />
        <KpiCard bg={MONTH_BG}
          title="ค่าดำเนินงาน % (Opex)"
          value={mo.indices ? pctStr(mo.indices.opex.pct) : '—'}
          sub={mo.indices ? `รวม ${thb(mo.indices.opex.value)}` : monthHint}
          status={mo.indices?.opex.status || 'none'}
          src="Insight + ค่าแรง + การตลาด"
          formula="Opex% = SG&A เต็ม ÷ ยอดขายเดือน (รวมค่าแรง+การตลาด+ค่าเช่า+อื่นๆ · ตัด depreciation)"
          rows={mo.indices ? [
            { label: 'Opex รวม (Insight)', value: thb(mo.indices.opex.value) },
            { label: 'ยอดขายเดือน (Daily Income)', value: thb(mo.revenueMonthNet) },
          ] : null}
          legend="🟢 ≤45% · 🟡 45–48% · 🔴 >48% (ประเมินรายไตรมาส)"
          pending={!mo.indices}
        />
        <KpiCard bg={MONTH_BG}
          title="กำไรสุทธิ % (เดือน)"
          value={mo.indices ? pctStr(mo.indices.netProfit.pct) : '—'}
          sub={mo.indices ? `ก่อนภาษี ${thb(mo.indices.netProfit.ebt)}` : monthHint}
          status={mo.indices?.netProfit.status || 'none'}
          src="Daily Income · Inventory · Insight"
          formula="กำไรก่อนภาษี = ยอดขาย − ต้นทุนวัตถุดิบ − Opex − ดอกเบี้ย (ตัดภาษีไว้ v1)"
          rows={mo.indices ? [
            { label: 'ยอดขายเดือน (Daily Income)', value: thb(mo.revenueMonthNet) },
            { label: 'ต้นทุนวัตถุดิบ (Inventory)', value: thb(mo.cogsMonth) },
            { label: 'EBIT', value: thb(mo.indices.netProfit.ebit) },
            { label: 'กำไรก่อนภาษี', value: thb(mo.indices.netProfit.ebt), color: STATUS_COLORS.green },
          ] : null}
          legend="🟢 ≥8% · 🟡 0–8% · 🔴 <0%"
          pending={!mo.indices}
        />
      </div>
      </div>

    </div>
  )
}

const monthHint = 'ยังไม่ได้กรอกข้อมูลเดือนนี้'

// สีพื้นพาสเทลแยกกลุ่ม
const POS_GREEN = '#22C55E'  // เขียวอ่อน — กำไรเป็นบวก (ติดลบ = แดง)
const DAILY_BG = '#EAF1FC'   // ฟ้าพาสเทล — รายวัน
const MONTH_BG = '#F2ECFB'   // ม่วงลาเวนเดอร์ — รายเดือน
const INVEST_BG = '#FCF1E3'  // พีช-ทอง — การลงทุน
// สีกรอบ (เข้มกว่าพื้นเล็กน้อย)
const DAILY_BD = '#B9D1F4'
const MONTH_BD = '#D9C7F1'
const INVEST_BD = '#F0D6AC'
