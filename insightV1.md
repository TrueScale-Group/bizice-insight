# insight.md — BizICE Insight (Financial Dashboard)
> Spec สำหรับ Claude Code · BizICE Platform · พี่จีโน่
> Owner-only · รวม 7 ดัชนีการเงิน + Investor Pitch calculator
> Last updated: 16 มิ.ย. 2569

---

## 0. ⚠️ CONSOLIDATION & CLEANUP — ทำก่อนเป็นอย่างแรก

ก่อนหน้านี้วางแผนแยกเป็นหลายแอพ (โฟลเดอร์ `05`–`10`) ตอนนี้ **ยุบรวมเป็นแอพเดียว = `05 - Insight`**

### ของเก่าที่ต้องลบ (ทั้งไฟล์ในเครื่อง + GitHub repo ถ้าสร้างไว้แล้ว)
| โฟลเดอร์เดิม | กลายเป็น (ดัชนีใน Insight) |
|---|---|
| `05 - Labor Cost` | → ดัชนี: ค่าแรง% |
| `06 - Marketing` | → ดัชนี: ค่าการตลาด% |
| `07 - Operation` | → ดัชนี: ค่าดำเนินงาน% (Opex) |
| `08 - Net Profit` | → ดัชนี: กำไรสุทธิ% |
| `09 - ROI & ROE` | → ดัชนี: ROI / ROE + Investor calculator |
| `10 - Break-even` | → ดัชนี: จุดคุ้มทุน (BEP) |

### ขั้นตอน cleanup
1. **สำรองก่อนลบทุกครั้ง** — zip/archive โฟลเดอร์ `05`–`10` หรือ `git tag pre-insight-merge` ไว้ก่อน (ลบแล้วกู้ไม่ได้)
2. ลบโฟลเดอร์ในเครื่อง `05`–`10` หลังสำรอง
3. ถ้ามี GitHub repo ของแต่ละตัว (เช่น `bizice-labor`, `bizice-marketing` ฯลฯ) → archive หรือ delete repo
4. สร้างโฟลเดอร์ใหม่ `05 - Insight` + repo เดียว `truescale-group/bizice-insight`
5. **เก็บไว้ อย่าลบ:** `design-patterns`, `function-back` (เป็นไฟล์ reference รวม ใช้ร่วมทุกแอพ) — review ก่อน ไม่ลบอัตโนมัติ

### Hub grid (00 - Hub)
- ลบ tile **"Labor Cost" / "Net Profit" / "Report"** (Soon) ออกจาก MINI-APPS grid
- เพิ่ม tile เดียว **"Insight"** (owner-only · แสดงเฉพาะ role owner) ลิงก์ไป `bizice-insight`

---

## 1. Overview

| Item | Detail |
|------|--------|
| App name | BizICE Insight |
| Deploy URL | https://truescale-group.github.io/bizice-insight/ |
| GitHub repo | truescale-group/bizice-insight |
| Firebase project | mixue-cost-manager (shared) |
| Tech stack | React + Vite + Tailwind CSS (เดียวกับ Inventory) |
| Deploy | GitHub Pages (gh-pages branch) |
| Platform | Mobile-first · iOS Safari primary |
| Access | **Owner only** (พี่จีโน่ + ปุ๊กกี้) — staff เข้าไม่ได้ |
| Visual reference | `bizice-insight-demo-v3.html` (demo ที่ approve แล้ว) |
| Firestore prefix | `insight_` (ตัวเล็กเต็มคำ) |

---

## 2. Firebase Config

```js
const firebaseConfig = {
  apiKey: "AIzaSyDRs60WURPcNArQXl5RRuwqJcLjtN3CMe4",
  authDomain: "mixue-cost-manager.firebaseapp.com",
  projectId: "mixue-cost-manager",
  storageBucket: "mixue-cost-manager.firebasestorage.app",
  messagingSenderId: "414432707376",
  appId: "1:414432707376:web:1cf394f174257a86cdbef5"
};
```

---

## 3. Session Guard + Owner Gate

ใส่ใน `index.html` `<head>` ก่อน React mount (เหมือนทุก mini-app + เพิ่ม owner gate)

```js
(function () {
  const HUB = 'https://truescale-group.github.io/mixue-ice-sakon/';
  try {
    const s = JSON.parse(localStorage.getItem('bizice_session') || 'null');
    if (!s || !s.name) { window.location.replace(HUB); return; }
    if (s.expiry && Date.now() > s.expiry) {
      localStorage.removeItem('bizice_session');
      window.location.replace(HUB); return;
    }
    // ⚠️ OWNER-ONLY: staff เด้งกลับ Hub
    if (s.role !== 'owner') { window.location.replace(HUB); return; }
    window._bizSession = s;
  } catch (e) { window.location.replace(HUB); }
})();
```

### Session Object (เหมือนทุกแอพ)
```ts
interface BizSession {
  phone: string;       // "0843904727"
  name: string;        // "พี่จีโน่"
  role: 'owner' | 'staff';
  apps: Record<string, 'editor' | 'viewer' | 'none'>;
  expiry: number;
}
```

> iOS Safari: รองรับ URL params fallback สำหรับ session (เหมือน Inventory)

---

## 4. Design Tokens

```css
--brand-red: #E31E24;     /* Mixue */
--gold:      #D4A017;     /* accent ROI/ROE */
font: 'Prompt' (heading) + 'Sarabun' (body)
```

### ไฟสถานะ — ดัชนี ratio (3 ระดับ)
| สี | hex |
|---|---|
| 🟢 เขียว (ดี) | #1A7F37 |
| 🟡 เหลือง (เฝ้าระวัง) | #C99700 |
| 🔴 แดง (อันตราย) | #E24B4A |

### ไฟสถานะ — ROI/ROE (4 ระดับ — เพิ่มฟ้า "ดีเยี่ยม")
| สี | hex |
|---|---|
| 🔵 ฟ้า (ดีเยี่ยม) | #185FA5 |
| 🟢 เขียว | #1A7F37 |
| 🟡 เหลือง | #C99700 |
| 🔴 แดง | #E24B4A |

### BEP gauge = hero element หน้าแรก (เข็มชี้ % คุ้มทุนวันนี้)

---

## 5. App Structure — 5 แท็บ

```
[ภาพรวม] [ปฏิทิน] [รายงาน*] [ROI-ROE] [ตั้งค่า]
                      ↑ FAB กลาง
```
- **กดสั้น** ปุ่มกลาง (รายงาน) = ไปแท็บรายงาน
- **กดค้าง (long-press)** ปุ่มกลาง = เปิด "เมนูกรอกข้อมูลรวม" (กรอกทุกอย่างทีเดียว) — มี hint เล็กๆ กันลืม
- AppBar: ปุ่มกลับ Hub + dropdown สาขา + Refresh
- หน้ากรอกข้อมูลทั้งหมด = accordion ยุบไว้ จะกรอกค่อยกดเปิด

### แท็บ 1 — ภาพรวม
- BEP gauge (hero) — % คุ้มทุนวันนี้ + ไฟเขียว/เหลือง/แดง
- การ์ดสรุป 7 ดัชนี (ชื่อไทยล้วน ไม่มีเลข 0x นำหน้า) + ไฟสถานะ
- toggle [สัปดาห์ | เดือน] · กดดัชนีแต่ละตัว → กางกราฟ trend

### แท็บ 2 — ปฏิทิน
- มุมมองเดือน · แต่ละวันแสดง hitBep (ทะลุ/ไม่ทะลุ) + ยอดขาย
- DayView: กดวัน → กำไรขั้นต้นวันนั้น + รายละเอียด

### แท็บ 3 — รายงาน
- 7 ดัชนีพร้อมไฟสถานะ + กราฟ trend รายสัปดาห์/เดือน/ไตรมาส (Opex)

### แท็บ 4 — ROI/ROE
- ผลลัพธ์ (ROI/ROE/คืนทุน) โชว์บนสุด
- เครื่องคำนวณ Investor Pitch (3 โมเดล) — ดูข้อ 13
- ช่องกรอก (เงินลงทุน/โครงสร้างทุน) ยุบเป็น dropdown ด้านล่าง

### แท็บ 5 — ตั้งค่า
- accordion 6 หัวข้อ: สาขา / แปรผัน / คงที่ / เกณฑ์ / นิยามกำไร / เชื่อมต่อ
- ปรับเกณฑ์ไฟทุกตัวได้รายสาขา

---

## 6. Data Sources (อ่านอย่างเดียว — ไม่กรอกซ้ำ)

### 6.1 Daily Income → ยอดขาย
```js
// income_records doc keyed by dateKey "2569-05-14" (พ.ศ.)
// แยกกะ: morning.total + afternoon.total = ยอดรวม (รวม VAT)
// VAT 7% (จาก SOP Parameters ของ Daily Income)
async function getNetRevenue(dateKey) {
  const doc = await db.collection('income_records').doc(dateKey).get();
  if (!doc.exists) return 0;
  const d = doc.data();
  const gross = (d.morning?.total || 0) + (d.afternoon?.total || 0);
  const vat = 0.07;                      // อ่านจาก config ได้
  return gross / (1 + vat);              // ยอดขายสุทธิ (ไม่รวม VAT)
}
```
> ⚠️ ยืนยันก่อน implement: `.total` รวม VAT แล้วหรือยัง — ถ้า Daily Income เก็บ net แยกไว้ ให้ใช้ field นั้นตรงๆ
> หมายเหตุ: Daily Income มี `Food Cost % = 35` (static reference) — **ห้ามใช้** Insight ต้องคำนวณ actual จาก Inventory

### 6.2 Inventory → ต้นทุนวัตถุดิบ (COGS)
```js
// cut_stock_logs: { date "2569-05-14", warehouseId, totalCost, ... }
// = "มูลค่าใช้ตัดสต็อกวันนี้" บน dashboard Inventory (real-time จาก Cost Manager)
async function getCOGS(dateKey, warehouseId) {
  const snap = await db.collection('cut_stock_logs')
    .where('date', '==', dateKey)
    .where('warehouseId', '==', warehouseId)
    .where('deletedAt', '==', null)
    .get();
  return snap.docs.reduce((sum, d) => sum + (d.data().totalCost || 0), 0);
}
```
> Inventory > รายงาน > Analyze มี Food Cost% Actual + Gross Profit อยู่แล้ว → reuse logic เดียวกัน

### 6.3 Cost Manager → ราคาต้นทุน master
- `mixue_data/mixue-cost-manager` → `library[]` (ราคา/หน่วยวัตถุดิบ)
- ปรับต้นทุนที่ Cost Manager เท่านั้น (master) · Inventory = ใช้จริง

---

## 7. Firestore Schema (`insight_*`)

```ts
// 7.1 insight_branches/{branchId}    เช่น branchId = "509" (Mixue - 509)
{ id, name, code, active, createdAt }

// 7.2 insight_config/{branchId}
{
  openDays: 30,                       // วันเปิด/เดือน ตายตัว
  vatRate: 7,                         // %
  foodCostWindow: 30,                 // เฉลี่ยกี่วันล่าสุด
  // เกณฑ์ไฟ (ปรับได้รายสาขา)
  laborGreen: 25, laborCeiling: 30,
  mktFloor: 1, mktTarget: 2, mktCeiling: 3,
  opexGreen: 45, opexCeiling: 48,
  netProfitTarget: 8,
  // ROI/ROE ยึด payback (ปี) — Claude Code ปรับได้
  paybackBlue: 2, paybackGreen: 3, paybackYellow: 5,
  // เตือนเดือนขาดทุน
  lossAlertDays: 5,
  // ต้นทุนคงที่กรอกมือ
  rentCost: 0, annualFeeYearly: 0,    // ธรรมเนียมรายปี → ระบบหาร 12
  firstMonthRevenueEst: 0,            // ฐานเดือนแรก (ไม่มีเดือนก่อน)
  updatedAt
}

// 7.3 insight_dailySnapshot/{branchId}_{dateKey}   dateKey "2569-05-14"
{
  revenue,        // net (ไม่รวม VAT)
  cogs,           // มูลค่าตัดสต็อก
  foodCostPct,
  grossProfit, grossProfitPct, grossStatus,   // กำไรขั้นต้นรายวัน
  bepDaily, hitBep                              // BEP รายวัน
}

// 7.4 insight_monthlyData/{branchId}_{YYYYMM}   "256906"
{
  revenueMonth,
  // ค่าแรง (owner draw ไม่นับ · + ประกันสังคมนายจ้าง 5%)
  laborCostMonthly, laborCostPct, laborStatus, laborHeadroom,
  // การตลาด (เพดานงบ forward จากยอดเดือนก่อน)
  mktSpentReal, mktPromoEst, mktPromoNote,
  mktSpentTotal, marketingPct, marketingStatus,
  marketingBudget, marketingHeadroom,
  // Opex = SG&A เต็ม (รวม labor+mktg) · ตัด depreciation v1
  opexUtility, opexMaintenance, opexSupplies, opexPaymentFee,
  opexRoyalty, opexCommission, opexMisc,
  opexTotalMonthly,
  // กำไร
  interestExpense,                  // ดอกเบี้ย (default 0 · ผูก Investor View)
  ebit, ebt, netProfitPct, netProfitStatus,    // ก่อนภาษี (ตัด tax v1)
  // BEP สะสม + เดือน
  bepMonthly, bepCumulative, bepDaysHit, bepDaysElapsed, monthStatus,
  lossStreak, shortfallAccumulated
}

// 7.5 insight_quarterlyData/{branchId}_{YYYYQ}   "2569Q2"
{ opexTotalQ, revenueQ, opexPctQ, opexStatusQ }

// 7.6 insight_capital/{branchId}   (กรอกครั้งเดียว)
{
  franchiseFee, franchiseDepositRefundable,    // มัดจำ tag "คืนได้"
  equipmentCost, renovationCost, workingCapital, otherCost,
  totalInvestment, ownerEquity, loanDebt,
  // ผลลัพธ์คำนวณ
  roiAnnual, roiNetOfDeposit, roeAnnual, paybackYears,
  returnStatus
}

// 7.7 insight_kpiHistory/{branchId}_{YYYYMM}    (เก็บ trend)
{ labor, marketing, opex, netProfit, bep, roi, roe }

// 7.8 insight_pitchScenarios/{branchId}_{name}  (เซฟ scenario — optional)
{ raiseAmount, projectedProfit, termYears, lowRate, equityShare, createdAt }
```

**Real-time:** ใช้ `onSnapshot()` เท่านั้น · unsubscribe เมื่อออก/เปลี่ยน filter · ไม่มี Manual Sync

---

## 8. ดัชนี — จุดคุ้มทุน (BEP) · 5 มิติ

```
BEP รายวัน = (Fixed/เดือน ÷ 30) ÷ (1 − FoodCost%)

• Fixed/เดือน = ค่าแรง(เดือนก่อน) + ต้นทุนอื่น(กรอก)
              ธรรมเนียมรายปี: กรอกเต็มปี → หาร 12
• FoodCost%   = เฉลี่ย 30 วันล่าสุด (cogs ÷ revenue net)
• วันเปิด     = 30 ตายตัว
```

| มิติ | logic | fields |
|---|---|---|
| รายวัน | hitBep = ยอดขายวันนั้น ≥ BEP/วัน | bepDaily · hitBep |
| สะสม | BEP สะสม = BEP/วัน × วันที่ผ่านมา → เทียบ revenueMTD → "นำ +฿X / ตาม −฿X" | bepCumulative · revenueMTD |
| วันทะลุ | นับ hitBep=true → 6/9 วัน (67%) | bepDaysHit / bepDaysElapsed |
| จบเดือน | BEP เดือน = Fixed ÷ (1 − FoodCost%) → revenueMTD ≥ ? = ผ่าน/ไม่ผ่าน | bepMonthly · monthStatus |
| เดือนขาดทุน | ขาดต่อเนื่อง + ยอดขาดสะสม | lossStreak · shortfallAccumulated |

### เตือนเดือนขาดทุน — 2 จังหวะ
```
🔴 วันที่ 5 (lossStreak ครบเกณฑ์) → เตือนครั้งแรกแรงๆ: Hub Alerts + badge แดง + ยอดขาดสะสม
🟠 วันที่ 6,7,8...                  → ซ้ำทุกวัน อัปเดตยอดขาดเรื่อยๆ
✅ ทะลุ BEP เมื่อไหร่               → reset lossStreak=0 + แจ้ง "กลับมาคุ้มทุนแล้ว"
```

---

## 9. ดัชนี — ค่าแรง%

```
ค่าแรง% = ค่าแรงรวมเดือน ÷ ยอดขายสุทธิเดือน
```
- **ตัวเศษ:** เงินเดือนประจำ + รายวัน + PT + OT + เบี้ยขยัน/โบนัส + **ประกันสังคมนายจ้าง 5%**
- **ไม่นับ owner draw** (เงินเดือนพี่จีโน่)
- **กึ่งแปรผัน** จับที่ระดับรายเดือน (กรอกจริงทุกเดือน) — v1 ใช้ก้อนเดียว fixed

### Headroom (เพดานจ้างคน)
```
space (บาท) = (ยอดขายเดือน × 30%) − ค่าแรงรวม
แสดง: "เหลืออีก ฿X (Y pt) ก่อนแตะเพดาน 30%"
ถ้าเกิน 30% → space ติดลบ → "เกินเพดาน −฿X" (แดง)
```

### ไฟ: 🟢 ≤25% · 🟡 25–30% · 🔴 >30%

---

## 10. ดัชนี — ค่าการตลาด%

```
ค่าการตลาด% = ใช้จริง ÷ ยอดขายสุทธิเดือน   (วัดตอนจบเดือน)
```

### เพดานงบ (forward-looking · ดูระหว่างเดือน)
```
ฐาน = ยอดขายเดือนก่อน
งบแนะนำ = ฐาน × 2% (target) · เพดาน = ฐาน × 3% (ceiling)
เหลือใช้ได้ = เพดาน − ใช้ไปแล้ว
```
- ใช้จริง = ค่าการตลาดจริง (ads/ใบปลิว/ป้าย/ของแถม/event) + **ส่วนลด/โปร (ประมาณการ + note)**
- เกณฑ์ franchise (ประหยัด — Mixue มี brand equity แล้ว ไม่ต้อง build awareness)

### ไฟ: ⚪ <1% (ลงทุนน้อย) · 🟢 1–3% · 🔴 >3%

---

## 11. ดัชนี — ค่าดำเนินงาน% (Opex)

นิยาม = **SG&A เต็ม** (ทุกอย่างที่ไม่ใช่ต้นทุนวัตถุดิบ · ตัดดอกเบี้ย+ภาษี) → **ครอบ labor + marketing**
```
Opex = ค่าแรง + การตลาด + ค่าเช่า + น้ำไฟเน็ต + ซ่อม + วัสดุ
     + fee + royalty + ขนส่ง/คอม + เบ็ดเตล็ด
     (ตัด depreciation ไว้ v1 · ดึงค่าจากดัชนี labor/marketing มารวม)
Opex% = Opex ÷ ยอดขาย
```
- ค่าแรง%/การตลาด% = **ตัวเจาะย่อย** ของ Opex (top-line + breakdown)
- **ประเมินรายไตรมาส** (rolling 3 เดือน) — บันทึกออโต้รายเดือน เพราะ 1-2 เดือนยังไม่เห็นผล
```
Opex%ไตรมาส = (Opex 3 เดือนรวม) ÷ (ยอดขาย 3 เดือนรวม)
```

### ไฟ (รายไตรมาส · ตายตัว): 🟢 ≤45% · 🟡 45–48% · 🔴 >48%
> หมายเหตุ: food cost จริง 45–48% (สูง) → กำไรขั้นต้นเหลือ ~53% → Opex เพดาน 45% บีบให้คุมเข้ม

---

## 12. ดัชนี — กำไรสุทธิ%

```
EBIT = ยอดขาย − ต้นทุนวัตถุดิบ − Opex
กำไรก่อนภาษี (EBT) = EBIT − ดอกเบี้ย
```
- **ตัดภาษีไว้ v1** → แสดง "กำไรก่อนภาษี" ตรงตามชื่อ (ภาษีจริงดูใน Flowaccount ตอนปิดปี)
- กรอกเพิ่มแค่ **ดอกเบี้ย** (default 0 · ผูก Investor View)

### การแสดงผล 2 ชั้น
| ระดับ | แสดง | เหตุผล |
|---|---|---|
| รายวัน | **กำไรขั้นต้น** = ยอดขาย − cogs | Opex ไม่มีรายวัน · ดู food cost วันต่อวัน |
| รายเดือน ⭐ | **กำไรก่อนภาษี** | หักครบ = KPI จริง |

### ไฟ (ยิ่งสูงยิ่งดี)
- รายวัน (gross): 🟢 ≥54% · 🟡 50–54% · 🔴 <50%
- รายเดือน (net): 🟢 ≥8% · 🟡 0–8% · 🔴 <0%

---

## 13. ดัชนี — ROI / ROE + Investor Pitch Calculator

### 13.1 สูตร
```
ROI = กำไรต่อปี ÷ เงินลงทุนรวม × 100      (ทุน + เงินกู้)
ROE = กำไรต่อปี ÷ ส่วนทุนเจ้าของ × 100     (เงินเองล้วน)
คืนทุน(ปี) = เงินลงทุนรวม ÷ กำไรต่อปี = 1 ÷ ROI
```
- กำไรต่อปี = กำไรก่อนภาษี × 12 (หรือสะสม 12 เดือน)
- เงินลงทุน 5 ช่อง (ข้อ 7.6) · มัดจำแฟรนไชส์ tag "คืนได้"
- โชว์ ROI 2 แบบ: **รวม** + **เงินจมจริง** (หักมัดจำคืนได้)

### 13.2 ไฟสถานะ — 4 ระดับ (ยึดคืนทุน)
| สี | คืนทุน | ROI เทียบเท่า |
|---|---|---|
| 🔵 ฟ้า ดีเยี่ยม | ≤ 2 ปี | ≥ 50% |
| 🟢 เขียว ดี | 2–3 ปี | 33–50% |
| 🟡 เหลือง พอใช้ | 3–5 ปี | 20–33% |
| 🔴 แดง ต้องปรับ | > 5 ปี | < 20% |

แสดงคู่กัน: `ROI 32% · คืนทุน 3.1 ปี 🟢` (สีตัดสินจากปีคืนทุน)
> เกณฑ์ปี (paybackBlue/Green/Yellow) ใน config — ปรับใน Claude Code ได้

### 13.3 Investor Pitch Calculator (เครื่องคำนวณ — ในแท็บ ROI/ROE)
จำลองตอนระดมทุน/pitch ผู้ร่วมทุน · มี 2 มุม (ผู้ลงทุน / เจ้าของ)

**Inputs:** เงินที่ระดม (I) · กำไรคาดการณ์/ปี (P) · ระยะเวลา (T) · ดอกเบี้ย% (r) · สัดส่วนหุ้น% (s)

**3 โมเดล:**
```
ปลอดดอก:  ผู้ลงทุน/ปี = 0 · คืนต้น ✓
          เจ้าของ: ต้นทุน 0 · เก็บกำไร 100% · ภาระ คืนต้น
ดอกต่ำ:   ผู้ลงทุน/ปี = I×r% · ROI = r% · คืนต้น ✓
          เจ้าของ: ต้นทุน = ดอกเบี้ย · เก็บ P−ดอก · ภาระ คืนต้น+ดอก
ร่วมหุ้น:  ผู้ลงทุน/ปี = P×s% · ROI = (P×s)/I · ถือหุ้น (ไม่คืนต้น)
          เจ้าของ: ต้นทุน = P×s · เก็บ P×(1−s) · ภาระ แบ่งกำไรตลอดไป
```
**Insight line:** ถ้าผลตอบแทนธุรกิจ (P/I) > ดอกเบี้ย r → "กู้ดอกต่ำคุ้มกว่า" · ไม่งั้น "ร่วมหุ้นปลอดภัยกว่า"
> reference UI: widget `investor_pitch_calculator_roi_roe` (live calculator · stateless · เซฟ scenario optional)

---

## 14. Two-Phase Monthly Logic (ทุกดัชนี ratio)

```
ระหว่างเดือน  → ฐานงบ = "ยอดขายเดือนก่อน" (ยังไม่รู้ยอดเดือนนี้)
              โชว์: ใช้ไปกี่บาท / เหลืองบกี่บาท (ไม่มีไฟสถานะ)
จบเดือน       → ratio จริง = ใช้จริง ÷ ยอดขาย "เดือนตัวเอง"
              → ไฟสถานะ 🟢🟡🔴 ขึ้นตอนนี้
```
- ระหว่างเดือนดูงบอย่างเดียว · ไฟขึ้นจบเดือน (lean)
- ทุกดัชนีจบเดือนเทียบยอดขายเดือนตัวเอง (ชุดเดียวกัน)
- **edge case เดือนแรก:** ไม่มีเดือนก่อน → ใช้ `firstMonthRevenueEst` (กรอกมือ)

---

## 15. หน้ากรอกข้อมูล

- ทุกฟอร์ม = **accordion ยุบไว้** จะกรอกค่อยกดเปิด
- **กรอกล่วงหน้า (วางแผน) + ย้อนหลัง** ได้ (เลือกเดือน)
- long-press ปุ่มรายงาน = เมนูกรอกข้อมูลรวม (กรอกทุกอย่างทีเดียว)
- capital (เงินลงทุน/โครงสร้างทุน) = กรอกครั้งเดียว

---

## 16. เกณฑ์รวม (config defaults — ปรับได้รายสาขา)

| ดัชนี | เขียว | เหลือง | แดง/อื่น |
|---|---|---|---|
| ค่าแรง | ≤25% | 25–30% | >30% |
| การตลาด | 1–3% | — | ⚪<1% · 🔴>3% |
| Opex (ไตรมาส) | ≤45% | 45–48% | >48% |
| กำไรเดือน | ≥8% | 0–8% | <0% |
| ROI/ROE | คืนทุน 2–3ปี | 3–5ปี | 🔵≤2ปี · 🔴>5ปี |

---

## 17. Hub Integration

- Summary card บน Hub (owner): สถานะ BEP วันนี้ + เตือนเดือนขาดทุน (lossStreak)
- Alerts: push เมื่อ lossStreak ครบเกณฑ์ (ข้อ 8)
- `<ConnectionStatus />` shared component (3 states) เหมือนทุกแอพ

---

## 18. Multi-Branch

- Branch selector บน AppBar (เช่น Mixue - 509 / สาขาอื่น)
- ทุก collection key ด้วย `{branchId}` · config แยกรายสาขา
- branchId อ้างจาก `insight_branches` (sync กับ warehouseId ของ Inventory)

---

## 19. Project Structure

```
bizice-insight/
├── index.html                ← session guard + owner gate
├── src/
│   ├── main.jsx
│   ├── App.jsx               ← 5-tab nav + long-press FAB
│   ├── firebase.js
│   ├── hooks/
│   │   ├── useSession.js
│   │   ├── useInsightData.js  ← onSnapshot insight_*
│   │   └── useConnection.js
│   ├── components/
│   │   ├── ConnectionStatus.jsx   ← shared
│   │   ├── BepGauge.jsx
│   │   ├── KpiCard.jsx            ← ไฟสถานะ + trend
│   │   ├── TrendChart.jsx
│   │   ├── InvestorCalculator.jsx ← 3 โมเดล
│   │   └── Accordion.jsx
│   ├── pages/
│   │   ├── Overview.jsx
│   │   ├── Calendar.jsx
│   │   ├── Report.jsx
│   │   ├── RoiRoe.jsx
│   │   └── Settings.jsx
│   └── utils/
│       ├── calc.js          ← BEP, ratios, ROI/ROE, headroom
│       ├── integrations.js  ← getNetRevenue, getCOGS, getItemPrice
│       └── formatDate.js    ← dateKey "2569-05-14"
├── vite.config.js           ← base: '/bizice-insight/'
└── package.json
```

---

## 20. Build & Deploy

```bash
npm install
npm run dev      # localhost:5173/bizice-insight/
npm run build
npm run deploy   # gh-pages -d dist
```
```js
// vite.config.js
export default { base: '/bizice-insight/', build: { outDir: 'dist' } }
```

---

## 21. Test Accounts + Done Criteria

| Role | Phone |
|------|-------|
| Owner (พี่จีโน่) | 0843904727 |
| Owner (ปุ๊กกี้) | — |

### Checklist
**Cleanup**
- [ ] สำรอง 05–10 ก่อนลบ (zip / git tag)
- [ ] ลบโฟลเดอร์ + repo เก่า · เก็บ design-patterns / function-back
- [ ] Hub grid: ลบ Labor/Net Profit/Report tile → เพิ่ม Insight (owner-only)

**Core**
- [ ] Session guard + owner gate (staff เด้งกลับ Hub)
- [ ] 5 tabs + long-press FAB เมนูกรอกรวม
- [ ] onSnapshot real-time · ไม่มี Manual Sync · unsubscribe
- [ ] Branch selector + config รายสาขา

**7 ดัชนี**
- [ ] BEP gauge hero + 5 มิติ + เตือนเดือนขาดทุน 2 จังหวะ
- [ ] ค่าแรง% + headroom (ไม่นับ owner)
- [ ] การตลาด% + เพดานงบ forward + ส่วนลดประมาณ
- [ ] Opex% รายไตรมาส (SG&A เต็ม · ตัด depreciation)
- [ ] กำไร: รายวัน=ขั้นต้น / รายเดือน=ก่อนภาษี
- [ ] ROI/ROE 4 ระดับ (ยึดคืนทุน) + ROI 2 แบบ
- [ ] Investor Pitch calculator 3 โมเดล (2 มุม)

**Logic**
- [ ] Two-phase รายเดือน + first-month fallback
- [ ] FoodCost% เฉลี่ย 30 วัน (actual จาก Inventory · ไม่ใช้ static 35)
- [ ] ยอดขายสุทธิ = หัก VAT 7%
- [ ] กรอกล่วงหน้า + ย้อนหลัง · accordion

**Deploy**
- [ ] https://truescale-group.github.io/bizice-insight/
- [ ] base: '/bizice-insight/' · gh-pages branch
