import { useEffect, useRef, useState } from 'react'

/**
 * Bottom-sheet/dialog Modal — มาตรฐาน BizICE (ดู function-back.md)
 * (1) กากบาทแดง · (2) กด backdrop ไม่ปิด → เด้งกากบาท · (3) ปุ่ม back มือถือปิด popup ก่อน
 */
export function Modal({ open, onClose, title, children }) {
  const [xBounce, setXBounce] = useState(false)
  const closeRef = useRef(onClose); closeRef.current = onClose

  // back-stack: ปุ่ม back มือถือปิด popup นี้ก่อน
  useEffect(() => {
    if (!open) return
    const closer = () => { try { closeRef.current?.() } catch {} }
    const stack = (window.__bizBackStack = window.__bizBackStack || [])
    stack.push(closer)
    const onKey = (e) => e.key === 'Escape' && closeRef.current?.()
    window.addEventListener('keydown', onKey)
    return () => {
      const i = stack.indexOf(closer); if (i >= 0) stack.splice(i, 1)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!open) return null

  function bounceX(e) {
    if (e) { e.stopPropagation(); e.preventDefault() }
    setXBounce(false)
    requestAnimationFrame(() => requestAnimationFrame(() => setXBounce(true)))
  }

  return (
    <div className="sheet-backdrop" onClick={bounceX} onPointerDown={bounceX}>
      <div className="sheet" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
        <div className="sheet-head">
          <span className="sheet-title">{title}</span>
          <button className="sheet-close" onClick={onClose} aria-label="ปิด"
            onAnimationEnd={() => setXBounce(false)}
            style={{ animation: xBounce ? 'xBounce .45s ease' : 'none' }}>×</button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}
