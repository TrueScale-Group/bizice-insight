// สิทธิ์ตามระบบ Hub — owner/admin = แก้ได้ · staff ตาม apps['insight'] (editor/viewer) · mode param มาก่อน localStorage
export function useSession() {
  const s = window._bizSession || {}
  const bizMode = window._bizMode || ''
  return {
    session: s,
    // แก้ข้อมูลได้ไหม (owner/admin หรือ editor)
    isEditor: () => {
      if (!s) return false
      if (s.role === 'owner' || s.role === 'admin') return true
      if (bizMode === 'viewer') return false
      if (bizMode === 'editor' || bizMode === 'owner') return true
      return s.apps?.['insight'] === 'editor'
    },
    isOwner: () => s?.role === 'owner' || s?.role === 'admin',
    isViewer: () => {
      if (s?.role === 'owner' || s?.role === 'admin') return false
      if (bizMode === 'viewer') return true
      if (bizMode === 'editor' || bizMode === 'owner') return false
      return s?.role === 'viewer' || !s?.apps?.['insight']
    },
    name: s.name || '',
    phone: s.phone || '',
    role: s.role || '',
    photo: s.photo || (s.phone ? (() => { try { return localStorage.getItem('bizice_avatar_' + s.phone) } catch { return null } })() : null) || '',
    initials: (s.name || '?').replace(/^(พี่|น้อง|คุณ)/, '').trim().charAt(0) || '?',
  }
}
