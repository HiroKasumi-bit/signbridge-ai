// Khoá của tab "Ký hiệu riêng" (tính năng trả phí, tạm thời mở bằng mật khẩu).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createLock } from '../src/lock.js'

const memStore = () => { const m = new Map(); return { get: k => m.get(k) ?? null, set: (k, v) => m.set(k, v), del: k => m.delete(k) } }

test('wrong_password_keeps_it_locked', async () => {
  const lock = createLock(memStore())
  assert.equal(await lock.unlock('sai mat khau'), false)
  assert.equal(await lock.unlock(''), false)
  assert.equal(lock.unlocked(), false)
})

test('right_password_unlocks_and_is_remembered', async () => {
  const store = memStore()
  assert.equal(await createLock(store).unlock('signlanguage'), true)
  assert.equal(createLock(store).unlocked(), true)
})

test('phone_keyboards_capitals_and_spaces_are_forgiven', async () => {
  assert.equal(await createLock(memStore()).unlock(' Signlanguage '), true)
})

test('locking_again_forgets_the_unlock', async () => {
  const store = memStore()
  const lock = createLock(store)
  await lock.unlock('signlanguage')
  lock.lock()
  assert.equal(createLock(store).unlocked(), false)
})
