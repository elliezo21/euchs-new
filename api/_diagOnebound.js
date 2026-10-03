/**
 * 점검용 — 원바운드(api-gw.onebound.cn) 연결을 단계별로 잰다. 미리보기 배포 전용(운영은 404).
 *
 * 결과: region·at·egressIp·dns·probe(dns·tcp·tls·첫 응답 ms, 멈춘 단계) / ?real=1이면 real(error_code·ms)
 * 키·시크릿·전체 주소는 결과와 로그에 넣지 않는다.
 */
import https from 'node:https'
import dns from 'node:dns'

const HOST = 'api-gw.onebound.cn'
const PROBE_LIMIT_MS = 10000
const IP_LIMIT_MS = 5000
const REAL_LIMIT_MS = 20000
const REAL_NUM_IID = '813234515121'

async function egressIp() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), IP_LIMIT_MS)
  try {
    const r = await fetch('https://api.ipify.org?format=json', { signal: controller.signal })
    const j = await r.json()
    return { ip: j.ip || null, error: j.ip ? null : 'no_ip_in_response' }
  } catch (err) {
    return { ip: null, error: err.name === 'AbortError' ? `timeout_${IP_LIMIT_MS}ms` : (err.code || err.name || 'error') }
  } finally {
    clearTimeout(timer)
  }
}

async function dnsLookup() {
  const t0 = Date.now()
  try {
    const list = await dns.promises.lookup(HOST, { all: true })
    return { addresses: list.map(a => a.address), ms: Date.now() - t0, error: null }
  } catch (err) {
    return { addresses: [], ms: Date.now() - t0, error: err.code || err.name || 'error' }
  }
}

// steps = 각 단계에 걸린 시간(ms). marks는 요청 시작 기준 누적 시각이고 finish에서 단계별 차이로 바꾼다
function probe() {
  return new Promise(resolve => {
    const t0 = Date.now()
    const marks = { dns: null, tcp: null, tls: null, response: null }
    const out = { status: null, steps: { dnsMs: null, tcpMs: null, tlsMs: null, responseMs: null }, stalledAt: null, error: null, totalMs: null }
    let done = false
    const finish = (stalledAt, errName) => {
      if (done) return
      done = true
      clearTimeout(timer)
      out.stalledAt = stalledAt
      out.error = errName
      out.totalMs = Date.now() - t0
      const s = out.steps
      s.dnsMs = marks.dns == null ? null : marks.dns
      s.tcpMs = marks.tcp == null ? null : marks.tcp - (marks.dns ?? 0)
      s.tlsMs = marks.tls == null ? null : marks.tls - (marks.tcp ?? 0)
      s.responseMs = marks.response == null ? null : marks.response - (marks.tls ?? 0)
      resolve(out)
    }
    const stage = () => (marks.dns == null ? 'dns' : marks.tcp == null ? 'tcp' : marks.tls == null ? 'tls' : 'response')
    const req = https.request({ host: HOST, path: '/', method: 'GET', headers: { 'User-Agent': 'euchs-diag' } }, res => {
      marks.response = Date.now() - t0
      out.status = res.statusCode
      res.resume()
      res.on('end', () => finish(null, null))
      res.on('error', err => finish('response', err.code || err.name))
    })
    const timer = setTimeout(() => {
      const at = stage()
      req.destroy()
      finish(at, `timeout_${PROBE_LIMIT_MS}ms`)
    }, PROBE_LIMIT_MS)
    req.on('socket', socket => {
      socket.on('lookup', () => { if (marks.dns == null) marks.dns = Date.now() - t0 })
      socket.on('connect', () => { marks.tcp = Date.now() - t0 })
      socket.on('secureConnect', () => { marks.tls = Date.now() - t0 })
    })
    req.on('error', err => finish(stage(), err.code || err.name || 'error'))
    req.end()
  })
}

// 기존 api/1688-item-detail.js와 같은 주소·파라미터·헤더
async function realCall() {
  const key = process.env.ONEBOUND_KEY || process.env.VITE_ONEBOUND_KEY || ''
  const secret = process.env.ONEBOUND_SECRET || process.env.VITE_ONEBOUND_SECRET || ''
  if (!key || !secret) return { errorCode: null, ms: null, error: 'env_missing' }
  const url = `https://${HOST}/1688global/item_get/?key=${key}&secret=${secret}&num_iid=${REAL_NUM_IID}&result_type=json`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REAL_LIMIT_MS)
  const t0 = Date.now()
  try {
    const r = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.1688.com/',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
    })
    const j = await r.json()
    return { errorCode: j?.error_code ?? null, ms: Date.now() - t0, error: null }
  } catch (err) {
    return { errorCode: null, ms: Date.now() - t0, error: err.name === 'AbortError' ? `timeout_${REAL_LIMIT_MS}ms` : (err.name || 'error') }
  } finally {
    clearTimeout(timer)
  }
}

export default async function diagOnebound(req, res) {
  if (process.env.VERCEL_ENV !== 'preview') {
    return res.status(404).json({ error: 'not_found' })
  }
  const wantReal = String(req.query?.real || '') === '1'
  const [ip, dnsRes, probeRes, real] = await Promise.all([
    egressIp(),
    dnsLookup(),
    probe(),
    wantReal ? realCall() : Promise.resolve(undefined),
  ])
  const result = {
    region: process.env.VERCEL_REGION || null,
    at: new Date().toISOString(),
    egressIp: ip.ip,
    egressIpError: ip.error,
    dns: dnsRes,
    probe: probeRes,
    ...(wantReal ? { real } : {}),
  }
  console.log('[diag-onebound]', JSON.stringify(result))
  return res.status(200).json(result)
}
