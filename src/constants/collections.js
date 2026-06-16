/**
 * Firestore Collection Names — Insight App
 *
 * Insight-owned (prefix insight_) : เก็บค่ากรอกมือ + snapshot ดัชนี
 * Cross-app (read-only)           : อ่านจากแอพอื่น ห้ามเขียน
 *   income_records  → Daily Income (ยอดขาย)
 *   Inv_cut_logs    → Inventory    (ต้นทุนตัดสต็อก / COGS)
 *   mixue_data      → Cost Manager (ราคาวัตถุดิบ master)
 *
 * ⚠️ date key ทุกตัวใช้ AD "YYYY-MM-DD" (ตรงกับข้อมูลจริงของแอพอื่น) — แสดงผลค่อยแปลง พ.ศ.
 */

export const COL = {
  // ─── Insight-owned ─────────────────────────────────────────────
  BRANCHES:       'insight_branches',       // {branchId}
  CONFIG:         'insight_config',          // {branchId}
  DAILY_SNAPSHOT: 'insight_dailySnapshot',   // {branchId}_{YYYY-MM-DD}
  MONTHLY_DATA:   'insight_monthlyData',     // {branchId}_{YYYYMM}
  QUARTERLY_DATA: 'insight_quarterlyData',   // {branchId}_{YYYYQ}
  CAPITAL:        'insight_capital',         // {branchId}
  KPI_HISTORY:    'insight_kpiHistory',      // {branchId}_{YYYYMM}
  PITCH_SCENARIOS:'insight_pitchScenarios',  // {branchId}_{name}

  // ─── Cross-app (read-only) ─────────────────────────────────────
  INCOME_RECORDS: 'income_records',   // Daily Income owns
  CUT_STOCK_LOGS: 'Inv_cut_logs',     // Inventory owns
  MIXUE_DATA:     'mixue_data',       // Cost Manager owns
  WAREHOUSES:     'Inv_warehouses',   // Inventory owns — สาขา sync จากตรงนี้ (branch = warehouse)
}

// doc id ของ Cost Manager master
export const MIXUE_DATA_DOC = 'mixue-cost-manager'
