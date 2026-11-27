// Trang Từ vựng: bấm vào từ là xem cách ký (VSL: video VieSign trong app; ASL: trang SignASL.org).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { SIGNS, signLink, signVideo } from '../src/signs.js'

test('every_vsl_word_has_a_video', () => {
  const missing = SIGNS.vsl.words.filter(w => !existsSync(new URL(`../public/signs/vsl/${w}.mp4`, import.meta.url)))
  assert.deepEqual(missing, [])
})

test('vsl_video_path_is_url_safe', () => {
  assert.equal(signVideo('vsl', 'khẩu_trang'), `/signs/vsl/${encodeURIComponent('khẩu_trang')}.mp4`)
  assert.equal(signVideo('asl', 'water'), null)
})

test('asl_links_go_to_signasl_and_fix_joined_labels', () => {
  assert.equal(signLink('asl', 'water'), 'https://www.signasl.org/sign/water')
  assert.equal(signLink('asl', 'thankyou'), 'https://www.signasl.org/sign/thank-you')
  assert.equal(signLink('asl', 'TV'), 'https://www.signasl.org/sign/tv')
  assert.equal(signLink('vsl', 'khẩu_trang'), null)
})
