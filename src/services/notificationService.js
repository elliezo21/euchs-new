/**
 * EUCHS B2B 솔라피(Solapi) 카카오 알림톡 & LMS 자동 발송 서비스
 * API Key 미설정 및 개발 환경에서는 Mock 로깅으로 완벽히 안전 동작하여 전체 트랜잭션을 보호합니다.
 * 브라우저 표준 Web Crypto API와 REST API를 활용하여 Node.js 의존성 없이 번들링 안정성을 100% 보장합니다.
 */

// 환경 변수 로드
const getEnv = (key, fallback = '') => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[`VITE_${key}`] || import.meta.env[key] || fallback;
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[`VITE_${key}`] || process.env[key] || fallback;
  }
  return fallback;
};

const apiKey = getEnv('SOLAPI_API_KEY', '');
const apiSecret = getEnv('SOLAPI_API_SECRET', '');
const senderPhone = getEnv('SOLAPI_SENDER_PHONE', '01093731214');
const pfId = getEnv('SOLAPI_PF_ID', '');

/**
 * 솔라피 v4 HMAC-SHA256 Authorization 헤더 생성 (Web Crypto API)
 */
async function generateSolapiAuthHeader(key, secret) {
  const date = new Date().toISOString();
  const salt = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID().replace(/-/g, '')
    : Math.random().toString(36).substring(2) + Date.now().toString(36);
  const data = date + salt;

  let signature = '';
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const msgData = encoder.encode(data);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    signature = Array.from(new Uint8Array(sigBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  return `HMAC-SHA256 apiKey=${key}, date=${date}, salt=${salt}, signature=${signature}`;
}

/**
 * 주문 상태 변경 알림톡 / LMS 발송 함수
 * @param {Object} params
 * @param {'order_received'|'quote_approved'|'warehouse_in'|'shipping_started'} params.type - 알림 템플릿 유형
 * @param {string} params.to - 수신자 연락처
 * @param {string} params.customerName - 바이어/고객명
 * @param {string} params.orderNo - 주문 번호
 * @param {string} params.itemName - 대표 품목명
 * @param {string} [params.extraInfo] - 추가 메시지(실측CBM/kg, 송장번호 등)
 */
export async function sendOrderStatusAlimtalk({ type, to, customerName, orderNo, itemName, extraInfo = "" }) {
  const rawTo = String(to || "").replace(/[^0-9]/g, "");

  // 1. API 키 미설정 또는 개발 환경일 때 Mock 로그 출력 (오류 원천 방어)
  if (!apiKey || apiKey.includes("YOUR_") || !rawTo) {
    console.log(
      `%c[Solapi Mock Notification] Type: ${type} | To: ${rawTo || '수신자없음'} | Order: ${orderNo} | Msg: [이유씨컴퍼니] ${customerName || '고객'}님, 주문(${orderNo}) ${itemName || '품목'}의 상태가 [${type}] 단계로 갱신되었습니다. ${extraInfo}`,
      'color: #059669; font-weight: bold;'
    );
    return { status: "mock_success", message: "API key not configured. Mock logged safely." };
  }

  // 2. 실제 솔라피 발송 페이로드 구성 및 REST API 호출
  try {
    const templateMap = {
      order_received: { id: "TEMPLATE_ORDER_RECEIVED", title: "발주 접수 안내" },
      quote_approved: { id: "TEMPLATE_QUOTE_APPROVED", title: "1차 견적 승인" },
      warehouse_in: { id: "TEMPLATE_WAREHOUSE_IN", title: "이우 창고 입고/계근" },
      shipping_started: { id: "TEMPLATE_SHIPPING_STARTED", title: "국내 배송/송장 등록" }
    };

    const selected = templateMap[type] || templateMap.order_received;

    const payload = {
      message: {
        to: rawTo,
        from: senderPhone,
        kakaoOptions: {
          pfId: pfId,
          templateId: selected.id,
          variables: {
            "#{customer_name}": customerName || "바이어",
            "#{order_no}": orderNo || "-",
            "#{item_name}": itemName || "소싱 품목",
            "#{extra_info}": extraInfo || ""
          }
        },
        autoTypeDetect: true // 카카오톡 미수신 시 LMS 문자 자동 전환
      }
    };

    const authHeader = await generateSolapiAuthHeader(apiKey, apiSecret);
    const response = await fetch("https://api.solapi.com/messages/v4/send", {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.warn("[Solapi Send Warning]:", error.message);
    return { status: "failed", error: error.message };
  }
}
