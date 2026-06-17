/**
 * calc.js — สูตรการเงินล้วน (pure functions, testable)
 * เกณฑ์ไฟ default ตาม insight.md §16 · ปรับได้รายสาขาผ่าน insight_config
 */

export const DEFAULT_CONFIG = {
  openDays: 30,
  vatRate: 7,
  foodCostWindow: 30,
  // ค่าแรง%
  laborGreen: 25, laborCeiling: 30,
  // การตลาด%
  mktFloor: 1, mktTarget: 2, mktCeiling: 3,
  // Opex% (ไตรมาส)
  opexGreen: 45, opexCeiling: 48,
  // กำไรเดือน
  netProfitTarget: 8,
  // ROI/ROE — ยึดปีคืนทุน
  paybackBlue: 2, paybackGreen: 3, paybackYellow: 5,
  // เตือนเดือนขาดทุน
  lossAlertDays: 5,
  // ต้นทุนคงที่ (กรอกมือ)
  rentCost: 0, annualFeeYearly: 0,
  firstMonthRevenueEst: 0,
}

// แมปสถานะ → สี (hex จาก insight.md §4)
export const STATUS_COLORS = {
  blue:   '#185FA5',
  green:  '#1A7F37',
  yellow: '#C99700',
  red:    '#E24B4A',
  white:  '#8E8E93',
  none:   '#C7C7CC',
}

// ── ร้านเปิดจริง 9 ก.ย. 2025 ──
export const STORE_OPEN_MONTH = '202509'
export const STORE_OPEN_DAY = 9
// จำนวนวันในเดือน (monthKey "YYYYMM")
export function monthDaysCount(monthKey) {
  const y = +monthKey.slice(0, 4), m = +monthKey.slice(4, 6)
  return new Date(y, m, 0).getDate()
}
// วันเปิดขาย default ต่อเดือน: เดือนเปิดร้าน = นับจากวันเปิดถึงสิ้นเดือน (09/2025 = 22 วัน) · เดือนอื่น = normalDefault (30)
export function defaultOpenDays(monthKey, normalDefault = 30) {
  if (monthKey === STORE_OPEN_MONTH) return monthDaysCount(monthKey) - STORE_OPEN_DAY + 1
  return normalDefault
}

// ── helper ──
const pct = (num, den) => (den > 0 ? (num / den) * 100 : 0)
const safe = (v) => (Number.isFinite(v) ? v : 0)

// ── ยอดขายสุทธิ (หัก VAT) ──
export function netRevenue(gross, vatRate = 7) {
  return safe(gross) / (1 + vatRate / 100)
}

// ── Food Cost % + กำไรขั้นต้น ──
export function foodCostPct(cogs, revenueNet) {
  return pct(safe(cogs), safe(revenueNet))
}
export function grossProfit(revenueNet, cogs) {
  return safe(revenueNet) - safe(cogs)
}
export function grossProfitPct(revenueNet, cogs) {
  return pct(grossProfit(revenueNet, cogs), safe(revenueNet))
}

// ── BEP ──
// BEP/วัน = (Fixed/เดือน ÷ openDays) ÷ (1 − FoodCost%)
export function bepDaily(fixedMonthly, foodCostPctVal, openDays = 30) {
  const gpFrac = 1 - safe(foodCostPctVal) / 100
  if (gpFrac <= 0 || openDays <= 0) return 0
  return safe(fixedMonthly) / openDays / gpFrac
}
// BEP/เดือน = Fixed ÷ (1 − FoodCost%)
export function bepMonthly(fixedMonthly, foodCostPctVal) {
  const gpFrac = 1 - safe(foodCostPctVal) / 100
  if (gpFrac <= 0) return 0
  return safe(fixedMonthly) / gpFrac
}
export function hitBep(revenueDayNet, bepDayVal) {
  return safe(revenueDayNet) >= safe(bepDayVal) && safe(bepDayVal) > 0
}
// % ของ BEP ที่ทำได้วันนี้ (สำหรับ gauge) — cap 0..150
export function bepProgressPct(revenueDayNet, bepDayVal) {
  if (!(bepDayVal > 0)) return 0
  return Math.max(0, Math.min(150, (safe(revenueDayNet) / bepDayVal) * 100))
}

// ── ค่าแรง headroom (เพดาน 30%) ──
export function laborHeadroom(revenueMonthNet, laborTotal, ceilingPct = 30) {
  const cap = safe(revenueMonthNet) * (ceilingPct / 100)
  return cap - safe(laborTotal) // บวก = เหลือ, ลบ = เกินเพดาน
}

// ── การตลาด: เพดานงบ forward (อิงยอดเดือนก่อน) ──
export function marketingBudget(prevMonthRevenueNet, cfg = DEFAULT_CONFIG) {
  return {
    target:  safe(prevMonthRevenueNet) * (cfg.mktTarget / 100),
    ceiling: safe(prevMonthRevenueNet) * (cfg.mktCeiling / 100),
  }
}

// ── ROI / ROE ──
export function roi(annualProfit, totalInvestment) {
  return pct(safe(annualProfit), safe(totalInvestment))
}
export function roe(annualProfit, ownerEquity) {
  return pct(safe(annualProfit), safe(ownerEquity))
}
export function paybackYears(totalInvestment, annualProfit) {
  return safe(annualProfit) > 0 ? safe(totalInvestment) / annualProfit : Infinity
}

// ════════ สถานะไฟ ════════
export function laborStatus(p, cfg = DEFAULT_CONFIG) {
  if (p <= cfg.laborGreen) return 'green'
  if (p <= cfg.laborCeiling) return 'yellow'
  return 'red'
}
export function marketingStatus(p, cfg = DEFAULT_CONFIG) {
  if (p < cfg.mktFloor) return 'white'      // ลงทุนน้อย
  if (p <= cfg.mktCeiling) return 'green'
  return 'red'
}
export function opexStatus(p, cfg = DEFAULT_CONFIG) {
  if (p <= cfg.opexGreen) return 'green'
  if (p <= cfg.opexCeiling) return 'yellow'
  return 'red'
}
export function netProfitMonthlyStatus(p, cfg = DEFAULT_CONFIG) {
  if (p >= cfg.netProfitTarget) return 'green'
  if (p >= 0) return 'yellow'
  return 'red'
}
// กำไรขั้นต้นรายวัน (ยิ่งสูงยิ่งดี): 🟢≥54 · 🟡50–54 · 🔴<50
export function grossDailyStatus(p) {
  if (p >= 54) return 'green'
  if (p >= 50) return 'yellow'
  return 'red'
}
// ROI/ROE — ยึดปีคืนทุน 4 ระดับ
export function paybackStatus(years, cfg = DEFAULT_CONFIG) {
  if (years <= cfg.paybackBlue) return 'blue'
  if (years <= cfg.paybackGreen) return 'green'
  if (years <= cfg.paybackYellow) return 'yellow'
  return 'red'
}
// BEP รายวัน gauge — เทียบ progress
export function bepStatus(progressPct) {
  if (progressPct >= 100) return 'green'
  if (progressPct >= 80) return 'yellow'
  return 'red'
}

// ════════ ดัชนีรายเดือน (§9–12) ════════
export function ratio(num, den) { return pct(safe(num), safe(den)) }

// ค่าแรงรวม = เงินเดือน+รายวัน+PT+OT+เบี้ย/โบนัส แล้ว +ประกันสังคมนายจ้าง 5% (ไม่นับ owner draw)
export function laborTotal(parts = {}, ssoEmployerPct = 5) {
  const base = ['salary', 'daily', 'pt', 'ot', 'bonus'].reduce((s, k) => s + safe(parts[k]), 0)
  return base * (1 + ssoEmployerPct / 100)
}

// การตลาดใช้จริง = ค่าจริง (ads/ใบปลิว/ป้าย/ของแถม/event) + ส่วนลด/โปร (ประมาณการ)
export function marketingSpent(real = 0, promoEst = 0) {
  return safe(real) + safe(promoEst)
}

// Opex = SG&A เต็ม (รวม labor + marketing + ธรรมเนียมรายปี/12) — ตัด depreciation v1
export function opexTotal(parts = {}) {
  return ['labor', 'marketing', 'rent', 'utility', 'maintenance', 'supplies',
    'paymentFee', 'royalty', 'commission', 'misc', 'annualFee'].reduce((s, k) => s + safe(parts[k]), 0)
}

// กำไร: EBIT = ยอดขาย − ต้นทุนวัตถุดิบ − Opex · EBT = EBIT − ดอกเบี้ย
export function ebit(revenueNet, cogs, opex) {
  return safe(revenueNet) - safe(cogs) - safe(opex)
}
export function ebt(ebitVal, interest = 0) {
  return safe(ebitVal) - safe(interest)
}

// ════════ ROI/ROE — เงินจมจริง (หักมัดจำคืนได้) ════════
export function totalInvestment(cap = {}) {
  return ['franchiseFee', 'franchiseDepositRefundable', 'equipmentCost',
    'renovationCost', 'workingCapital', 'otherCost'].reduce((s, k) => s + safe(cap[k]), 0)
}
export function investedNet(cap = {}) {
  return totalInvestment(cap) - safe(cap.franchiseDepositRefundable) // หักมัดจำที่คืนได้
}

// ════════ Investor Pitch — 3 โมเดล (§13.3) ════════
// I=เงินระดม · P=กำไรคาดการณ์/ปี · r=ดอกเบี้ย% · s=สัดส่วนหุ้น%
export function investorModels(I, P, r, s) {
  I = safe(I); P = safe(P); r = safe(r); s = safe(s)
  const interest = I * (r / 100)
  const share = P * (s / 100)
  return {
    free: {  // ปลอดดอก
      investorYr: 0, investorRoi: 0, returnsPrincipal: true,
      ownerCost: 0, ownerKeep: P, ownerBurden: 'คืนเงินต้น',
    },
    lowRate: {  // ดอกต่ำ
      investorYr: interest, investorRoi: r, returnsPrincipal: true,
      ownerCost: interest, ownerKeep: P - interest, ownerBurden: 'คืนเงินต้น + ดอกเบี้ย',
    },
    equity: {  // ร่วมหุ้น
      investorYr: share, investorRoi: I > 0 ? (share / I) * 100 : 0, returnsPrincipal: false,
      ownerCost: share, ownerKeep: P - share, ownerBurden: 'แบ่งกำไรตลอดไป',
    },
    // ผลตอบแทนธุรกิจ (P/I) เทียบดอกเบี้ย → แนะนำ
    advice: I > 0 && (P / I) * 100 > r ? 'กู้ดอกต่ำคุ้มกว่า' : 'ร่วมหุ้นปลอดภัยกว่า',
    businessRoi: I > 0 ? (P / I) * 100 : 0,
  }
}

// ── format บาท ──
export function thb(v, digits = 0) {
  return '฿' + safe(v).toLocaleString('th-TH', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}
export function pctStr(v, digits = 1) {
  return safe(v).toFixed(digits) + '%'
}
