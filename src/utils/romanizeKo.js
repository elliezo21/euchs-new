/**
 * 한글 → 로마자 (국어의 로마자 표기법, 개정 로마자) — 외부 라이브러리 없이 음절 분해 방식
 *
 * 쓰임: T/T 해외송금 인보이스의 송금인(BUYER) 영문 상호 "미리 채움" 값. 고객이 [수정하기]로 고칠 수 있다.
 *   예) 무니 → MUNI, 이니드 → INIDEU, 신라 → SILLA, 한국 → HANGUK
 *
 * 반영하는 발음 규칙(단어 안 연속된 한글 음절끼리만):
 *   - 연음: 받침 + ㅇ초성 → 받침을 다음 음절 첫소리로 (예: 옷이 → osi)
 *   - 유음화: ㄴ+ㄹ, ㄹ+ㄴ, ㄹ+ㄹ → ll
 *   - 비음화: ㄱ·ㄷ·ㅂ 계열 받침 + ㄴ·ㅁ → ng·n·m, ㄱ·ㅂ 받침 + ㄹ → ng+n·m+n, ㅁ·ㅇ 받침 + ㄹ → n
 *   반영하지 않는 규칙: 구개음화·거센소리되기·된소리(표기법도 된소리는 적지 않음) — 고유명사 표기 관례는 사람이 확인한다.
 *
 * 한글 음절이 아닌 글자: 영문·숫자·공백과 , . - & ( ) / ' # 는 그대로 두고, 그 밖의 글자는 뺀다.
 */

const INITIALS = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h']
const VOWELS = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i']

// 받침(0=없음) 표기 — 음절 끝소리(대표음)
const FINALS = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'l', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't']

// 연음(다음 음절이 ㅇ초성)일 때: [이 음절에 남는 소리, 다음 음절로 넘어가는 소리]
const LIAISON = [
  ['', ''], ['', 'g'], ['', 'kk'], ['k', 's'], ['', 'n'], ['n', 'j'], ['', 'n'], ['', 'd'], ['', 'r'],
  ['l', 'g'], ['l', 'm'], ['l', 'b'], ['l', 's'], ['l', 't'], ['l', 'p'], ['', 'r'], ['', 'm'], ['', 'b'],
  ['p', 's'], ['', 's'], ['', 'ss'], ['ng', ''], ['', 'j'], ['', 'ch'], ['', 'k'], ['', 't'], ['', 'p'], ['', ''],
]

const INITIAL_N = 2
const INITIAL_R = 5
const INITIAL_M = 6
const INITIAL_SILENT = 11

const HANGUL_START = 0xac00
const HANGUL_END = 0xd7a3

function decompose(ch) {
  const code = ch.charCodeAt(0)
  if (code < HANGUL_START || code > HANGUL_END) return null
  const idx = code - HANGUL_START
  return { initial: Math.floor(idx / 588), vowel: Math.floor((idx % 588) / 28), final: idx % 28 }
}

/**
 * 받침(final)과 다음 초성(nextInitial) 사이 소리 변화.
 * @returns {{ coda: string, onset: string }} 이 음절 끝 표기, 다음 음절 첫 표기
 */
function joinSounds(final, nextInitial) {
  const onsetDefault = INITIALS[nextInitial]
  if (final === 0) return { coda: '', onset: onsetDefault }
  if (nextInitial === INITIAL_SILENT) {
    const [coda, onset] = LIAISON[final]
    return { coda, onset }
  }
  const sound = FINALS[final]
  // 유음화: ㄴ+ㄹ, ㄹ+ㄴ, ㄹ+ㄹ → ll
  if ((sound === 'n' && nextInitial === INITIAL_R) || (sound === 'l' && (nextInitial === INITIAL_N || nextInitial === INITIAL_R))) {
    return { coda: 'l', onset: 'l' }
  }
  if (nextInitial === INITIAL_N || nextInitial === INITIAL_M) {
    if (sound === 'k') return { coda: 'ng', onset: onsetDefault }
    if (sound === 't') return { coda: 'n', onset: onsetDefault }
    if (sound === 'p') return { coda: 'm', onset: onsetDefault }
  }
  if (nextInitial === INITIAL_R) {
    if (sound === 'k') return { coda: 'ng', onset: 'n' }
    if (sound === 'p') return { coda: 'm', onset: 'n' }
    if (sound === 'm' || sound === 'ng') return { coda: sound, onset: 'n' }
  }
  return { coda: sound, onset: onsetDefault }
}

const KEEP_RE = /[A-Za-z0-9 ,.\-&()/'#]/

/**
 * 한글 문자열 → 대문자 로마자.
 * @param {string} text
 * @returns {string}
 */
export function romanizeKo(text) {
  const chars = Array.from(String(text || ''))
  let out = ''
  let pendingOnset = null // 앞 음절의 받침 처리로 정해진 이번 음절 첫소리
  for (let i = 0; i < chars.length; i++) {
    const syl = decompose(chars[i])
    if (!syl) {
      pendingOnset = null
      if (KEEP_RE.test(chars[i])) out += chars[i]
      continue
    }
    const onset = pendingOnset !== null ? pendingOnset : INITIALS[syl.initial]
    const next = i + 1 < chars.length ? decompose(chars[i + 1]) : null
    let coda
    if (next) {
      const j = joinSounds(syl.final, next.initial)
      coda = j.coda
      pendingOnset = j.onset
    } else {
      coda = FINALS[syl.final]
      pendingOnset = null
    }
    out += onset + VOWELS[syl.vowel] + coda
  }
  return out.replace(/\s+/g, ' ').trim().toUpperCase()
}
