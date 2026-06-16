import { useRef, useState, useCallback } from 'react'

const THRESHOLD = 100
const MAX_PULL = 115
const CIRC = 126

/** PullToRefresh wrapper (Instagram-style) — <PullToRefresh onRefresh={fn}>...</PullToRefresh> */
export default function PullToRefresh({ onRefresh, children }) {
  const [pullH, setPullH] = useState(0)
  const [ptrState, setPtrState] = useState('idle')
  const [arcOffset, setArcOffset] = useState(CIRC)

  const startY = useRef(0)
  const pulling = useRef(false)
  const refreshing = useRef(false)
  const scrollRef = useRef(null)
  const pullHRef = useRef(0)

  const setArc = (p) => setArcOffset(CIRC * (1 - Math.min(p, 1)))
  const resetPtr = () => { setPullH(0); pullHRef.current = 0; setPtrState('idle'); setArcOffset(CIRC) }

  const doRefresh = useCallback(async () => {
    if (refreshing.current) return
    refreshing.current = true
    setPtrState('loading'); setPullH(THRESHOLD)
    try { await onRefresh?.() } catch {}
    await new Promise(r => setTimeout(r, 400))
    resetPtr(); refreshing.current = false
  }, [onRefresh])

  const onTouchStart = (e) => {
    const el = scrollRef.current
    if (!el || el.scrollTop > 0) return
    startY.current = e.touches[0].clientY; pulling.current = true
  }
  const onTouchMove = (e) => {
    if (!pulling.current || refreshing.current) return
    const el = scrollRef.current
    if (!el || el.scrollTop > 0) { pulling.current = false; return }
    const dy = e.touches[0].clientY - startY.current
    if (dy <= 0) { resetPtr(); return }
    const h = Math.min(dy * 0.42, MAX_PULL)
    setArc(h / THRESHOLD); setPullH(h); pullHRef.current = h
    setPtrState(h >= THRESHOLD ? 'ready' : 'idle')
  }
  const onTouchEnd = () => {
    if (!pulling.current) return
    pulling.current = false
    if (pullHRef.current >= THRESHOLD) doRefresh(); else resetPtr()
  }

  const label = ptrState === 'ready' ? '🎉 ปล่อยเพื่อรีเฟรช' : ptrState === 'loading' ? 'กำลังโหลด…' : 'ดึงลงเพื่อรีเฟรช'

  return (
    <div ref={scrollRef} className="ptr-scroll"
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div style={{
        height: pullH, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 6,
        transition: ptrState === 'loading' ? 'height .22s cubic-bezier(.34,1.56,.64,1)' : 'none',
      }}>
        <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
          <svg width="44" height="44" viewBox="0 0 44 44" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
            <defs>
              <linearGradient id="ptr-grad-insight" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e31e24" /><stop offset="100%" stopColor="#ff7b7b" />
              </linearGradient>
            </defs>
            <circle cx="22" cy="22" r="20" fill="none" stroke="#e5e7eb" strokeWidth="3" />
            <circle cx="22" cy="22" r="20" fill="none" stroke="url(#ptr-grad-insight)" strokeWidth="3"
              strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={arcOffset}
              style={ptrState === 'loading'
                ? { animation: 'ptr-spin-arc 1s linear infinite', strokeDashoffset: 32 }
                : { transition: 'stroke-dashoffset .08s linear' }} />
          </svg>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, transition: 'transform .2s ease',
            transform: ptrState === 'ready' ? 'scale(1.15)' : 'scale(1)',
            animation: ptrState === 'loading' ? 'ptr-bounce .6s ease infinite alternate' : 'none',
          }}>💡</div>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '.3px' }}>{label}</div>
      </div>

      {children}

      <style>{`
        @keyframes ptr-bounce { 0%{transform:scale(1) rotate(-8deg)} 100%{transform:scale(1.2) rotate(8deg)} }
        @keyframes ptr-spin-arc { to { transform: rotate(270deg) } }
      `}</style>
    </div>
  )
}
