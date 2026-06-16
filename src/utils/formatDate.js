// dateKey format: YYYY-MM-DD (CE/AD) — ตรงกับ income_records / Inv_cut_logs
export function toDateKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// monthKey "YYYYMM" (AD) — สำหรับ insight_monthlyData / kpiHistory
export function toMonthKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}${m}`
}

// quarterKey "YYYYQn" (AD)
export function toQuarterKey(date = new Date()) {
  const y = date.getFullYear()
  const q = Math.floor(date.getMonth() / 3) + 1
  return `${y}Q${q}`
}

// เลื่อนวัน (คืน Date ใหม่)
export function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

// ── แสดงผลภาษาไทย พ.ศ. ──
export function toThaiDate(dateOrKey = new Date()) {
  const d = typeof dateOrKey === 'string' ? new Date(dateOrKey + 'T00:00:00') : dateOrKey
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function toThaiShort(dateOrKey = new Date()) {
  const d = typeof dateOrKey === 'string' ? new Date(dateOrKey + 'T00:00:00') : dateOrKey
  return d.toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric' })
}

export function toThaiMonth(dateOrKey = new Date()) {
  const d = typeof dateOrKey === 'string' ? new Date(dateOrKey + 'T00:00:00') : dateOrKey
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long' })
}

export function toThaiTime(ts) {
  const d = ts?.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}
