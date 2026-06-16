// ลงสีชื่อแหล่งข้อมูลในข้อความ
//   Insight        → น้ำเงินเข้ม (แอพนี้กรอกเอง)
//   Daily Income · Inventory → เขียว (ดึงมา แก้ที่นี่ไม่ได้)
const SRC_COLOR = {
  'Insight': '#1E3A8A',
  'Daily Income': '#1A7F37',
  'Inventory': '#1A7F37',
}
const NAMES = ['Daily Income', 'Inventory', 'Insight']
const RE = new RegExp(`(${NAMES.join('|')})`, 'g')

export function SourceText({ text }) {
  if (!text) return null
  return text.split(RE).map((p, i) =>
    SRC_COLOR[p]
      ? <b key={i} style={{ color: SRC_COLOR[p], fontWeight: 700 }}>{p}</b>
      : <span key={i}>{p}</span>
  )
}
