/**
 * 홈 스튜디오 소개 — 판매처 배지 10곳 (2026-09-30)
 * 로고 파일 = public/brand/ — 각 판매처 공식 사이트에서 받은 파일 그대로(둘레 여백만 자른 것 1개: 메이크샵).
 * 공식 출처에서 흰 배지에 쓸 로고를 못 받은 곳은 흉내 내 그리지 않고 이름 글자만(logo: null).
 *   src = 받은 곳 (보고서에도 같은 목록)
 * 홈 칸의 판매처 칩(studioMarketplaceRules.PUBLIC_MARKETS — G마켓·옥션 한 줄)과 따로: 배지는 G마켓·옥션을 나눠 셈
 * 보이는 범위는 판매처 목록 한 곳(studioMarketplaceRules.marketVisible — 카페24 off 2026-10-02) → 목록에는 남기고 내보낼 때 뺀다
 */
import { marketVisible } from '../lib/studioMarketplaceRules.js'
const ALL_BRANDS = [
  { key: 'coupang', name: '쿠팡', logo: 'coupang.svg', w: 117, h: 27, src: 'https://www.aboutcoupang.com/wp-content/themes/aboutcp/assets/images/logo.svg' },
  { key: 'smartstore', name: '스마트스토어', logo: null, src: null }, // 공식 사이트 머리글이 N 표시 + 글자 — 따로 된 로고 파일 없음
  { key: '11st', name: '11번가', logo: '11st.png', w: 112, h: 48, src: 'http://c.m.011st.com/MW/img/common/gnb/gnb-logo.png' },
  { key: 'gmarket', name: 'G마켓', logo: null, src: null }, // 공식 회사 사이트 로고가 흰 글씨 버전뿐 (흰 배지에서 안 보임)
  { key: 'auction', name: '옥션', logo: 'auction.png', w: 428, h: 160, src: 'https://image.auction.co.kr/hanbando/202110/d337d318-1aeb-4902-abf7-e407d7f0d1a1.png' },
  { key: 'ably', name: '에이블리', logo: null, src: null }, // 공식 사이트에서 쇼핑 앱 로고 파일을 찾지 못함 (회사 채용 사이트 로고만)
  { key: 'zigzag', name: '지그재그', logo: 'zigzag.png', w: 273, h: 66, src: 'https://cf.fe.s.zigzag.kr/common/logo/zigzag_text_logo.png' },
  { key: 'cafe24', name: '카페24', logo: 'cafe24.svg', w: 112, h: 20, src: 'https://img.echosting.cafe24.com/imgcafe24com/images/common/cafe24.svg' },
  { key: 'makeshop', name: '메이크샵', logo: 'makeshop.png', w: 471, h: 103, src: 'https://www.makeshop.co.kr/images/Makeshop_ci.png' },
  { key: 'godomall', name: '고도몰', logo: null, src: null }, // 공식 사이트 로고가 흰 글씨 버전뿐
]
export const HOME_BRANDS = ALL_BRANDS.filter(b => marketVisible(b.key))
export const brandLogo = b => (b.logo ? `/brand/${b.logo}` : null)
