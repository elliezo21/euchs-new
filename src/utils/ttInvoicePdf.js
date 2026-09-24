/**
 * T/T 해외송금 PROFORMA INVOICE PDF (A4 세로) — 해성 엑셀 인보이스 배치 기준
 *
 * - jspdf는 이 함수 안에서 동적 import한다 (T/T 결제 모달에서만 로드, 초기 번들 증가 없음).
 * - jspdf 기본 폰트(Helvetica)는 한글을 못 그린다 → 넣기 전에 findNonAsciiFields로 검사하고,
 *   한 글자라도 섞이면 PDF를 만들지 않는다(화면이 다운로드를 막고 수정 안내).
 *
 * 입력: invoice(서버 스냅샷) / fixed(api/_ttRemittance.js) / seal(PNG base64) / buyer({ name, address, tel })
 */

export function formatUsd(n) {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatUnitPrice(n) {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
}

/** PDF에 들어갈 글자(라벨: 값) 목록 */
function collectTexts({ invoice, fixed, buyer }) {
  const t = {
    'BUYER 영문 상호': buyer?.name,
    'BUYER 영문 주소': buyer?.address,
    'BUYER TEL': buyer?.tel,
    'NO': invoice?.invoiceNo,
    'DATE': invoice?.issueDateKst,
    'SHIPPER': [fixed?.shipper?.name, fixed?.shipper?.address, fixed?.shipper?.tel].join(' '),
    '은행 정보': [fixed?.intermediaryBank?.name, fixed?.beneficiaryBank?.name, fixed?.beneficiaryBank?.address, fixed?.beneficiary?.address].join(' '),
  }
  ;(invoice?.lines || []).forEach((l, i) => { t[`품목 ${i + 1}`] = l.description })
  return t
}

/**
 * PDF(영문 폰트)에 못 들어가는 글자가 있는 칸 이름 목록. 빈 배열이면 통과.
 * 인쇄 가능한 ASCII(0x20~0x7E) 밖의 글자(한글 등)를 모두 걸러낸다.
 */
export function findNonAsciiFields(input) {
  return Object.entries(collectTexts(input))
    .filter(([, v]) => /[^\x20-\x7E]/.test(String(v ?? '')))
    .map(([k]) => k)
}

export async function downloadTtInvoicePdf({ invoice, fixed, seal, buyer }) {
  const bad = findNonAsciiFields({ invoice, fixed, buyer })
  if (bad.length > 0) throw new Error(`영문이 아닌 글자가 있어 PDF를 만들 수 없어요: ${bad.join(', ')}`)

  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const L = 15
  const R = 195
  const MID = 105
  const W = R - L

  doc.setLineWidth(0.3)

  // ── 제목 / NO / DATE ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('PROFORMA INVOICE', MID, 20, { align: 'center' })
  doc.setFontSize(9.5)
  doc.text(`NO : ${invoice.invoiceNo}`, R, 29, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.text(`DATE : ${invoice.issueDateKst}`, R, 34, { align: 'right' })

  // ── SHIPPER / BUYER 블록 ──
  const blockTop = 38
  const colW = MID - L - 4
  const writeBlock = (x, title, lines) => {
    let y = blockTop + 6
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(title, x + 2, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    for (const line of lines) {
      const wrapped = doc.splitTextToSize(line, colW)
      doc.text(wrapped, x + 2, y)
      y += wrapped.length * 4
    }
    return y
  }
  const leftEnd = writeBlock(L, 'SHIPPER / EXPORTER', [fixed.shipper.name, fixed.shipper.address, `TEL : ${fixed.shipper.tel}`])
  const rightEnd = writeBlock(MID, 'BUYER / IMPORTER', [buyer.name, buyer.address, `TEL : ${buyer.tel}`])
  const blockBottom = Math.max(leftEnd, rightEnd) + 1
  doc.rect(L, blockTop, W, blockBottom - blockTop)
  doc.line(MID, blockTop, MID, blockBottom)

  // ── 선적/도착 국가 + 문구 ──
  let y = blockBottom + 6
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(`SHIPPING COUNTRY : ${fixed.shippingCountry}`, L + 2, y)
  doc.text(`DESTINATION COUNTRY : ${fixed.destinationCountry}`, MID + 2, y)
  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text(fixed.intro, L + 2, y)
  y += 4

  // ── 품목 표 ──
  const cols = [
    { title: 'Model', w: 22, align: 'center' },
    { title: 'Item description', w: 58, align: 'left' },
    { title: 'Quantity', w: 22, align: 'right' },
    { title: 'U/Price (USD)', w: 28, align: 'right' },
    { title: 'Amount (USD)', w: 30, align: 'right' },
    { title: 'Rmks', w: 20, align: 'center' },
  ]
  const rowH = 7
  const drawRow = (cells, top, bold) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    let x = L
    cols.forEach((c, i) => {
      doc.rect(x, top, c.w, rowH)
      const text = String(cells[i] ?? '')
      if (text) {
        const tx = c.align === 'right' ? x + c.w - 2 : c.align === 'center' ? x + c.w / 2 : x + 2
        doc.text(text, tx, top + 4.7, { align: c.align })
      }
      x += c.w
    })
  }
  doc.setFontSize(8.5)
  drawRow(cols.map(c => c.title), y, true)
  y += rowH
  const totalQty = invoice.lines.reduce((s, l) => s + Number(l.quantity || 0), 0)
  for (const l of invoice.lines) {
    drawRow(['', l.description, Number(l.quantity).toLocaleString('en-US'), formatUnitPrice(l.unitPrice), formatUsd(l.amount), ''], y, false)
    y += rowH
  }
  drawRow(['', 'TOTAL', totalQty.toLocaleString('en-US'), '', `USD ${formatUsd(invoice.usdTotal)}`, ''], y, true)
  y += rowH + 8

  // ── 하단 왼쪽: 조건 / 하단 오른쪽: 은행 ──
  const termsTop = y
  const labelValue = (x, yy, label, value, width) => {
    doc.setFont('helvetica', 'bold')
    doc.text(label, x, yy)
    doc.setFont('helvetica', 'normal')
    const wrapped = doc.splitTextToSize(value, width)
    doc.text(wrapped, x, yy + 4)
    return yy + 4 + wrapped.length * 4 + 2
  }
  doc.setFontSize(8.5)
  let ly = termsTop
  ly = labelValue(L + 2, ly, 'Amount', `${fixed.amountTerm}  USD ${formatUsd(invoice.usdTotal)}`, colW)
  ly = labelValue(L + 2, ly, 'Port of lading', fixed.portOfLading, colW)
  ly = labelValue(L + 2, ly, 'Port of discharge', fixed.portOfDischarge, colW)
  ly = labelValue(L + 2, ly, 'The date of issue', invoice.issueDateKst, colW)
  ly = labelValue(L + 2, ly, 'TERMS OF PAYMENT', fixed.termsOfPayment, colW)

  let ry = termsTop
  ry = labelValue(MID + 2, ry, 'INTERMEDIARY BANK', `${fixed.intermediaryBank.name}\nSWIFT BIC : ${fixed.intermediaryBank.swift}`, colW)
  ry = labelValue(MID + 2, ry, 'BENEFICIARY BANK', `${fixed.beneficiaryBank.name}\nSWIFT CODE NO : ${fixed.beneficiaryBank.swift}\nADD : ${fixed.beneficiaryBank.address}`, colW)
  ry = labelValue(MID + 2, ry, 'BENEFICIARY', `NAME : ${fixed.beneficiary.name}\nA/C NO : ${fixed.beneficiary.accountNo}\nADD : ${fixed.beneficiary.address}`, colW)

  // ── Confirmed By + 도장 ──
  let sy = Math.max(ly, ry) + 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('Confirmed By', MID + 2, sy)
  const sealW = 35
  const props = doc.getImageProperties(`data:image/png;base64,${seal}`)
  const sealH = sealW * (props.height / props.width)
  doc.addImage(`data:image/png;base64,${seal}`, 'PNG', MID + 2, sy + 2, sealW, sealH)
  sy += sealH + 8

  // ── 유효기간 문구 ──
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.text(doc.splitTextToSize(fixed.validity, W), L + 2, Math.max(sy, 280))

  doc.save(`PROFORMA_INVOICE_${invoice.invoiceNo}.pdf`)
}
