import { useState } from 'react'
import { useInsightData } from '../hooks/useInsightData'
import { useMonthlyInsight } from '../hooks/useMonthlyInsight'
import { useHistory } from '../hooks/useHistory'
import { KpiCard } from '../components/KpiCard'
import { TrendChart } from '../components/TrendChart'
import { grossProfitPct, grossDailyStatus, STATUS_COLORS, thb, pctStr } from '../utils/calc'
import { toThaiShort, toThaiMonth } from '../utils/formatDate'

function foodStatus(p) { return p <= 45 ? 'green' : p <= 48 ? 'yellow' : 'red' }
const moLabel = (mk) => new Date(+mk.slice(0, 4), +mk.slice(4, 6) - 1, 1).toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })

export function Report({ branchId = 'default' }) {
  const { loading, today, avgFoodCostPct, series } = useInsightData(branchId)
  const mo = useMonthlyInsight(branchId)
  const { history, quarterly } = useHistory(branchId, mo.cfg)
  const [range, setRange] = useState('week')

  if (loading) return <div className="loading">กำลังโหลดรายงาน…</div>

  const win = range === 'week' ? 7 : 30
  const recent = series.slice(-win)
  const trendOf = (sel) => recent.map(d => ({ label: toThaiShort(d.dateKey), value: sel(d) }))
  const t = today || {}
  const gpPct = grossProfitPct(t.net, t.cogs)
  const I = mo.indices
  const moTrend = (key) => history.map(h => ({ label: moLabel(h.monthKey), value: +(+h[key] || 0).toFixed(1) }))

  return (
    <div className="page">
      <div className="rep-title">รายงานดัชนีการเงิน · {toThaiMonth(new Date())}</div>

      {/* รายวัน */}
      <div className="rep-section">รายวัน (อิงข้อมูลจริง)</div>
      <div className="seg">
        {['week', 'month'].map(r => (
          <button key={r} className={`seg-btn ${range === r ? 'active' : ''}`} onClick={() => setRange(r)}>
            {r === 'week' ? '7 วัน' : '30 วัน'}
          </button>
        ))}
      </div>
      <div className="kpi-grid">
        <KpiCard title="Food Cost %" value={pctStr(avgFoodCostPct)} sub="เฉลี่ยช่วงนี้"
          status={avgFoodCostPct > 0 ? foodStatus(avgFoodCostPct) : 'none'}
          trend={trendOf(d => +d.foodCostPct.toFixed(1))} trendColor={STATUS_COLORS.red} />
        <KpiCard title="กำไรขั้นต้น %" value={pctStr(gpPct)} sub={thb(t.grossProfit)}
          status={t.net > 0 ? grossDailyStatus(gpPct) : 'none'}
          trend={trendOf(d => +grossProfitPct(d.net, d.cogs).toFixed(1))} trendColor={STATUS_COLORS.green} />
        <KpiCard title="ยอดขายสุทธิ" value={thb(t.net)} sub="ต่อวัน"
          status="none" trend={trendOf(d => Math.round(d.net))} trendColor="#1D4ED8" />
        <KpiCard title="จุดคุ้มทุน/วัน" value={thb(t.bepDaily)} sub={t.hitBep ? '✓ วันนี้ทะลุ' : '✗ ยังไม่ทะลุ'}
          status={t.bepDaily > 0 ? (t.hitBep ? 'green' : 'red') : 'none'}
          trend={trendOf(d => Math.round(d.net))} trendColor={STATUS_COLORS.green} />
      </div>

      {/* รายเดือน */}
      <div className="rep-section">รายเดือน {mo.isCurrentMonth && <span className="rep-tag">เดือนปัจจุบัน · งบ/ความคืบหน้า</span>}</div>
      <div className="kpi-grid">
        <KpiCard title="ค่าแรง %" value={I ? pctStr(I.labor.pct) : '—'}
          sub={I ? `เหลือเพดาน ${thb(I.labor.headroom)}` : ''} status={I?.labor.status || 'none'} pending={!I} />
        <KpiCard title="ค่าการตลาด %" value={I ? pctStr(I.marketing.pct) : '—'}
          sub={I ? `เหลืองบ ${thb(I.marketing.remaining)}` : ''} status={I?.marketing.status || 'none'} pending={!I} />
        <KpiCard title="Opex % (เดือน)" value={I ? pctStr(I.opex.pct) : '—'}
          sub={I ? `รวม ${thb(I.opex.value)}` : ''} status={I?.opex.status || 'none'} pending={!I} />
        <KpiCard title="กำไรสุทธิ % (ก่อนภาษี)" value={I ? pctStr(I.netProfit.pct) : '—'}
          sub={I ? thb(I.netProfit.ebt) : ''} status={I?.netProfit.status || 'none'} pending={!I} />
      </div>

      {/* ไตรมาส */}
      <div className="rep-section">รายไตรมาส (Opex · rolling 3 เดือน)</div>
      <div className="kpi-grid">
        <KpiCard title="Opex % (ไตรมาส)"
          value={quarterly.monthsHit ? pctStr(quarterly.opexPct) : '—'}
          sub={quarterly.monthsHit ? `${quarterly.monthsHit}/3 เดือน · รวม ${thb(quarterly.opexValue)}` : 'รอข้อมูลครบ 3 เดือน'}
          status={quarterly.status}
          pending={!quarterly.monthsHit}
          src="Insight · Daily Income"
          formula="Opex%ไตรมาส = (Opex 3 เดือนรวม) ÷ (ยอดขาย 3 เดือนรวม)"
          legend="🟢 ≤45% · 🟡 45–48% · 🔴 >48%" />
      </div>

      {/* แนวโน้มรายเดือน (จาก history) */}
      {history.length >= 2 && (<>
        <div className="rep-section">แนวโน้มรายเดือน ({history.length} เดือน)</div>
        <div className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div><div className="kpi-title" style={{ marginBottom: 2 }}>ค่าแรง %</div><TrendChart data={moTrend('labor')} color={STATUS_COLORS.yellow} suffix="%" /></div>
          <div><div className="kpi-title" style={{ marginBottom: 2 }}>Opex %</div><TrendChart data={moTrend('opex')} color={STATUS_COLORS.red} suffix="%" /></div>
          <div><div className="kpi-title" style={{ marginBottom: 2 }}>กำไรสุทธิ %</div><TrendChart data={moTrend('netProfit')} color={STATUS_COLORS.green} suffix="%" /></div>
        </div>
      </>)}

      <div className="rep-note">
        💡 Opex ประเมินจริงรายไตรมาส (rolling 3 เดือน) · ค่าแรง/การตลาดเป็นตัวเจาะย่อยของ Opex<br />
        ไฟสถานะรายเดือนขึ้นเมื่อจบเดือน · แนวโน้มสะสมจากเดือนที่เปิดดูแล้ว
      </div>
    </div>
  )
}
