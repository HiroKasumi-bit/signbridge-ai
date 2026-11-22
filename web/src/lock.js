// Khoá tab "Ký hiệu riêng". Sau này là tài khoản trả phí; tạm thời mở bằng một mật khẩu chung.
// Mật khẩu chỉ lưu dạng băm, nhưng vẫn nằm trong web: đây là khoá để trình diễn, không phải bảo mật thật.
const HASH = '8ce38026aa9cfbfc50672269df7228a3f40a82d3821a97183fcecd10786968f3'
const KEY = 'signbridge.mine.unlocked'

const localStore = {
  get: k => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { localStorage.setItem(k, v) } catch {} },
  del: k => { try { localStorage.removeItem(k) } catch {} },
}
const sha256 = async text => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))]
  .map(b => b.toString(16).padStart(2, '0')).join('')

export function createLock(store = localStore) {
  return {
    unlocked: () => store.get(KEY) === '1',
    /** Đúng mật khẩu thì mở và nhớ trong máy. Bỏ qua chữ hoa và dấu cách thừa (bàn phím điện thoại hay tự viết hoa). */
    async unlock(pass) {
      const ok = (await sha256(String(pass).trim().toLowerCase())) === HASH
      if (ok) store.set(KEY, '1')
      return ok
    },
    lock: () => store.del(KEY),
  }
}
