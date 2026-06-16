// Insight = owner-only (index.html gate การันตี role === 'owner' แล้ว)
export function useSession() {
  const s = window._bizSession || {}
  return {
    session: s,
    isOwner: () => s?.role === 'owner',
    name: s.name || '',
    phone: s.phone || '',
    role: s.role || '',
    photo: s.photo || (s.phone ? (() => { try { return localStorage.getItem('bizice_avatar_' + s.phone) } catch { return null } })() : null) || '',
    initials: (s.name || '?').replace(/^(พี่|น้อง|คุณ)/, '').trim().charAt(0) || '?',
  }
}
