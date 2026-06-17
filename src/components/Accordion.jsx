import { useState } from 'react'

/** Accordion — ยุบไว้ จะกรอกค่อยกดเปิด (ตาม spec §15) */
export function Accordion({ title, icon, defaultOpen = false, children, badge }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="acc">
      <button className="acc-head" onClick={() => setOpen(o => !o)}>
        <span className="acc-icon">{icon}</span>
        <span className="acc-title">{title}</span>
        {badge != null && <span className="acc-badge">{badge}</span>}
        <span className="acc-chev">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="acc-body">{children}</div>}
    </div>
  )
}

/** ช่องกรอกตัวเลข + label + หน่วย · รับเฉพาะตัวเลข (บล็อก e/+/-/ตัวอักษร) */
export function NumField({ label, value, onChange, unit = '฿', step = 1, hint }) {
  const handle = (e) => {
    // เก็บเฉพาะ 0-9 และจุดทศนิยม
    let v = e.target.value.replace(/[^\d.]/g, '')
    const parts = v.split('.')
    if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('')  // จุดได้ตัวเดียว
    if (v === '') return onChange('')
    if (v.endsWith('.')) return onChange(v)        // ปล่อย string ชั่วคราวให้พิมพ์ทศนิยมต่อได้
    onChange(Number(v))                             // ปกติส่งเป็น number เหมือนเดิม
  }
  // กันวางทับ (paste) ค่าที่ไม่ใช่ตัวเลข + บล็อกปุ่ม e/E/+/-
  const block = (e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault() }
  return (
    <label className="fld">
      <span className="fld-label">{label}{hint && <span className="fld-hint"> · {hint}</span>}</span>
      <div className="fld-input">
        <input type="text" inputMode="decimal" step={step}
          value={value ?? ''} onChange={handle} onKeyDown={block} />
        <span className="fld-unit">{unit}</span>
      </div>
    </label>
  )
}
