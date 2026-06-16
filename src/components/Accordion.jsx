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

/** ช่องกรอกตัวเลข + label + หน่วย */
export function NumField({ label, value, onChange, unit = '฿', step = 1, hint }) {
  return (
    <label className="fld">
      <span className="fld-label">{label}{hint && <span className="fld-hint"> · {hint}</span>}</span>
      <div className="fld-input">
        <input type="number" inputMode="decimal" step={step}
          value={value ?? ''} onChange={e => onChange(e.target.value === '' ? '' : +e.target.value)} />
        <span className="fld-unit">{unit}</span>
      </div>
    </label>
  )
}
