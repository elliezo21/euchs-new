<template>
  <div class="bg-slate-50 min-h-screen">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <!-- 머리 -->
      <header class="mb-8">
        <p class="text-xs font-bold text-blue-600 tracking-wide">이유씨컴퍼니 (EUCHS)</p>
        <h1 class="mt-1 text-2xl sm:text-3xl font-black text-slate-900">개인정보처리방침</h1>
        <p class="mt-2 text-sm text-slate-500">시행일: 2026년 9월 28일</p>
      </header>

      <section class="pp-card">
        <p class="pp-p">
          이유씨컴퍼니(이하 "회사")는 「개인정보 보호법」에 따라 고객의 개인정보를 보호하고, 개인정보와 관련한 고객의 고충을 빠르고 원활하게 처리하기 위해 이 개인정보처리방침을 정해 공개합니다.
          이 방침은 회사가 운영하는 웹사이트(www.euchs.co.kr)와 그 안의 상세페이지 제작 도구 "AI 스튜디오"에 적용됩니다.
        </p>
      </section>

      <!-- 한눈에 보기 -->
      <section class="pp-card" aria-labelledby="pp-summary">
        <h2 id="pp-summary" class="pp-h2 !mt-0">한눈에 보기</h2>
        <ul class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <li class="pp-sum"><b>무엇을 모으나요</b>이메일, 이름, 휴대전화번호, 상호, 사업자등록번호, 사업장·배송지 주소, 개인통관고유부호(선택), 주문·결제 정보</li>
          <li class="pp-sum"><b>왜 모으나요</b>회원 관리, 구매대행·수입통관·배송, 결제·환불, 상담, 진행 알림, AI 스튜디오 제공</li>
          <li class="pp-sum"><b>누구에게 주나요</b>통관·국내 배송에 필요한 곳(관세사, 택배사)과 사업자 확인을 위한 국세청</li>
          <li class="pp-sum"><b>해외로 가나요</b>서버 운영(미국), 스튜디오 이미지 처리(미국), 방문 통계·광고 측정(미국 등), 중국 수출·송금 처리(중국)</li>
        </ul>
      </section>

      <!-- 목차 -->
      <nav class="pp-card" aria-label="목차" data-pp-toc>
        <h2 class="pp-h2 !mt-0">목차</h2>
        <ol class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
          <li v-for="(t, i) in TOC" :key="t.id">
            <a :href="`#${t.id}`" class="text-slate-700 hover:text-blue-600 hover:underline" @click.prevent="goTo(t.id)">{{ i + 1 }}. {{ t.title }}</a>
          </li>
        </ol>
      </nav>

      <!-- 1 -->
      <section :id="TOC[0].id" class="pp-card pp-sec">
        <h2 class="pp-h2">1. 개인정보의 처리 목적</h2>
        <p class="pp-p">회사는 아래 목적으로만 개인정보를 처리합니다. 목적이 바뀌면 법에 따라 따로 동의를 받는 등 필요한 조치를 합니다.</p>
        <div class="pp-table-wrap">
          <table class="pp-table">
            <thead><tr><th class="w-40">목적</th><th>내용</th></tr></thead>
            <tbody>
              <tr><td>회원 가입·관리</td><td>회원 확인, 로그인, 부정 이용 방지, 공지 전달, 탈퇴 처리</td></tr>
              <tr><td>사업자 회원 확인</td><td>도매가 열람 등 사업자 회원 서비스를 위한 사업자등록 상태 확인</td></tr>
              <tr><td>구매대행·수입대행</td><td>견적, 중국 판매자 상품 구매, 중국 창고 입고·검수·포장, 한국행 운송</td></tr>
              <tr><td>수입통관·국내 배송</td><td>수입신고, 관세·부가세 처리, 국내 택배 배송, 배송 조회</td></tr>
              <tr><td>결제·정산·환불</td><td>입금 확인, 예치금 충전·출금, 환불, 해외송금(T/T)용 인보이스 발행, 세금계산서 발행</td></tr>
              <tr><td>상담·민원 처리</td><td>전화·카카오톡·이메일 문의 응대, 분쟁 처리, 처리 결과 안내</td></tr>
              <tr><td>진행 알림</td><td>가입 환영, 주문 접수·견적 승인·결제 확인·창고 입고·통관·배송 단계를 카카오 알림톡으로 안내</td></tr>
              <tr><td>AI 스튜디오</td><td>상품 사진 가져오기·올리기, 사진 편집(글자 지우기·배경 바꾸기), 상세페이지 제작·보관·내려받기</td></tr>
              <tr><td>서비스 개선·광고 성과 측정</td><td>방문 통계 분석, 광고를 보고 들어온 방문자의 상담 버튼 클릭 측정(아래 10번)</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 2 -->
      <section :id="TOC[1].id" class="pp-card pp-sec">
        <h2 class="pp-h2">2. 처리하는 개인정보 항목</h2>
        <p class="pp-p">서비스 이용 단계마다 아래 정보를 받습니다. 표에 없는 정보는 받지 않습니다.</p>
        <div class="pp-table-wrap">
          <table class="pp-table">
            <thead><tr><th class="w-36">언제</th><th>필수 항목</th><th class="w-44">선택 항목</th></tr></thead>
            <tbody>
              <tr>
                <td>이메일로 회원가입</td>
                <td>이메일, 비밀번호, 상호(회사명), 대표자 또는 담당자 이름, 사업자등록번호, 사업장 주소(배송지), 휴대전화번호</td>
                <td>개인통관고유부호</td>
              </tr>
              <tr>
                <td>간편 로그인<br />(구글·카카오·네이버)</td>
                <td>각 서비스가 넘겨주는 이메일, 이름(또는 별명), 프로필 사진. 네이버는 휴대전화번호 포함</td>
                <td>-</td>
              </tr>
              <tr>
                <td>사업자 정보 등록·확인</td>
                <td>상호, 대표자 이름, 사업자등록번호, 개업일, 사업장 주소</td>
                <td>영문 상호·영문 주소(해외송금 인보이스용)</td>
              </tr>
              <tr>
                <td>주문·통관</td>
                <td>주문자 상호·이름, 휴대전화번호, 이메일, 배송지 주소, 통관용 번호(개인통관고유부호 또는 사업자등록번호), 주문 상품·수량·금액</td>
                <td>요청 메모</td>
              </tr>
              <tr>
                <td>결제·환불</td>
                <td>입금자 이름, 입금 금액. 환불·예치금 출금 시 은행 이름, 계좌번호, 예금주</td>
                <td>-</td>
              </tr>
              <tr>
                <td>서비스 신청·상담</td>
                <td>이름, 휴대전화번호, 이메일, 신청·상담 내용</td>
                <td>-</td>
              </tr>
              <tr>
                <td>AI 스튜디오</td>
                <td>작업 이름, 가져온 상품 주소, 고객이 올린 사진, 편집 내용, 완성 이미지</td>
                <td>-</td>
              </tr>
              <tr>
                <td>이용 중 자동 생성</td>
                <td>접속 IP 주소, 접속 일시, 서비스 이용 기록, 쿠키, 브라우저·기기 정보, 방문·클릭 기록</td>
                <td>-</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul class="pp-list">
          <li>카카오톡 채널로 상담하면 카카오톡 프로필 이름과 대화 내용이 회사에 보입니다. 카카오톡에서의 처리는 카카오의 개인정보처리방침을 따릅니다.</li>
          <li>회사는 주민등록번호를 받지 않습니다. 개인통관고유부호는 통관에만 씁니다.</li>
          <li>회사 서비스는 사업자 대상이라 만 14세 미만 아동의 회원가입을 받지 않습니다.</li>
        </ul>
      </section>

      <!-- 3 -->
      <section :id="TOC[2].id" class="pp-card pp-sec">
        <h2 class="pp-h2">3. 개인정보의 처리 및 보유 기간</h2>
        <p class="pp-p">회원 탈퇴를 신청하거나 처리 목적을 이루면 개인정보를 지체 없이 파기합니다. 다만 아래는 법에 따라 정해진 기간 동안 따로 보관한 뒤 파기합니다.</p>
        <div class="pp-table-wrap">
          <table class="pp-table">
            <thead><tr><th>보관하는 정보</th><th class="w-28">기간</th><th class="w-60">근거 법령</th></tr></thead>
            <tbody>
              <tr><td>계약 또는 청약철회에 관한 기록</td><td>5년</td><td>전자상거래 등에서의 소비자보호에 관한 법률</td></tr>
              <tr><td>대금결제 및 재화 등의 공급에 관한 기록</td><td>5년</td><td>전자상거래 등에서의 소비자보호에 관한 법률</td></tr>
              <tr><td>소비자 불만 또는 분쟁 처리에 관한 기록</td><td>3년</td><td>전자상거래 등에서의 소비자보호에 관한 법률</td></tr>
              <tr><td>표시·광고에 관한 기록</td><td>6개월</td><td>전자상거래 등에서의 소비자보호에 관한 법률</td></tr>
              <tr><td>웹사이트 방문(접속) 기록</td><td>3개월</td><td>통신비밀보호법</td></tr>
              <tr><td>세금계산서 등 거래 증빙</td><td>5년</td><td>국세기본법</td></tr>
            </tbody>
          </table>
        </div>
        <ul class="pp-list">
          <li>AI 스튜디오 작업과 사진은 작업을 만든 날부터 30일 동안 보관하고(한 번 연장 가능), 기간이 끝나면 삭제합니다. <span class="pp-check">[해성 확인: 자동 삭제 동작 여부]</span></li>
        </ul>
      </section>

      <!-- 4 -->
      <section :id="TOC[3].id" class="pp-card pp-sec">
        <h2 class="pp-h2">4. 개인정보의 제3자 제공</h2>
        <p class="pp-p">회사는 고객의 개인정보를 1번의 목적 안에서만 처리하며, 고객의 동의나 법률의 특별한 규정이 있을 때만 제3자에게 제공합니다. 수입통관·배송·사업자 확인을 위해 아래와 같이 제공합니다.</p>
        <div class="pp-table-wrap">
          <table class="pp-table">
            <thead><tr><th class="w-40">받는 곳</th><th>목적</th><th>제공 항목</th><th class="w-44">받는 곳의 보유 기간</th></tr></thead>
            <tbody>
              <tr>
                <td>관세사(통관 대행) <span class="pp-check">[해성 확인: 업체명]</span></td>
                <td>수입신고, 관세·부가세 처리</td>
                <td>수입자 상호·이름, 개인통관고유부호 또는 사업자등록번호, 주소, 휴대전화번호, 수입 물품 내역</td>
                <td>통관 완료 후 관세법에 따른 보관 기간</td>
              </tr>
              <tr>
                <td>국내 택배사</td>
                <td>국내 배송</td>
                <td>받는 분 상호·이름, 휴대전화번호, 배송지 주소</td>
                <td>배송 완료 후 각 택배사 방침에 따른 기간</td>
              </tr>
              <tr>
                <td>국세청</td>
                <td>사업자등록 상태(진위) 확인</td>
                <td>사업자등록번호, 대표자 이름, 개업일</td>
                <td>국세청 방침에 따름</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul class="pp-list">
          <li>국내 택배사는 배송 건마다 CJ대한통운, 한진택배, 롯데글로벌로지스, 대신택배, 경동택배 중 한 곳을 이용합니다. <span class="pp-check">[해성 확인: 실제 이용 택배사]</span> 내 주문에 어느 택배사가 쓰였는지는 주문 상세 화면의 배송 정보에서 확인할 수 있습니다.</li>
          <li>중국 판매자(1688 등)에게는 회사의 중국 창고 주소만 보내며, 고객의 이름·연락처·주소는 보내지 않습니다.</li>
          <li>해외로 제공되는 경우는 6번에 적었습니다.</li>
        </ul>
      </section>

      <!-- 5 -->
      <section :id="TOC[4].id" class="pp-card pp-sec">
        <h2 class="pp-h2">5. 개인정보 처리 위탁</h2>
        <p class="pp-p">회사는 서비스를 운영하기 위해 아래 업체에 개인정보 처리 업무를 맡깁니다. 계약할 때 개인정보를 목적 외로 쓰지 않고, 안전하게 관리하며, 다시 맡기는 것을 제한하고, 계약이 끝나면 돌려주거나 파기하도록 정하고 관리·감독합니다.</p>
        <div class="pp-table-wrap">
          <table class="pp-table">
            <thead><tr><th class="w-52">맡은 업체</th><th>맡긴 업무</th><th class="w-40">보관 위치</th></tr></thead>
            <tbody>
              <tr><td>Supabase, Inc.</td><td>회원 계정·로그인, 데이터베이스와 파일(사진) 보관</td><td>대한민국(서울)</td></tr>
              <tr><td>Vercel Inc.</td><td>웹사이트 호스팅, 서버 기능 실행</td><td>미국 (6번 참고)</td></tr>
              <tr><td>솔라피 <span class="pp-check">[해성 확인: 정식 회사명]</span></td><td>카카오 알림톡 발송 (주식회사 카카오의 알림톡으로 전달)</td><td>대한민국</td></tr>
              <tr><td>Features &amp; Labels, Inc. (fal) <span class="pp-check">[해성 확인: 정식 회사명]</span></td><td>AI 스튜디오의 배경 지우기·AI 배경 만들기 이미지 처리</td><td>미국 (6번 참고)</td></tr>
            </tbody>
          </table>
        </div>
        <p class="pp-p">맡은 업체나 업무가 바뀌면 이 방침으로 바로 알려 드립니다.</p>
      </section>

      <!-- 6 -->
      <section :id="TOC[5].id" class="pp-card pp-sec">
        <h2 class="pp-h2">6. 개인정보의 국외 이전</h2>
        <p class="pp-p">
          회사는 서비스 제공과 계약 이행을 위해 아래와 같이 개인정보를 해외로 보냅니다(「개인정보 보호법」 제28조의8). 모든 이전은 서비스를 이용하는 때에 암호화된 인터넷 통신으로 이루어집니다.
        </p>
        <div class="pp-table-wrap">
          <table class="pp-table pp-table-wide">
            <thead>
              <tr><th>받는 자 (연락처)</th><th>국가</th><th>이전 항목</th><th>목적</th><th>보유 기간</th><th>이전 시기·방법</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Vercel Inc. (privacy@vercel.com) <span class="pp-check">[해성 확인: 연락처]</span></td>
                <td>미국</td>
                <td>웹사이트 이용 중 서버를 거치는 정보(회원·주문·사업자 정보, 접속 기록)</td>
                <td>웹사이트·서버 기능 운영</td>
                <td>처리 즉시 삭제, 서버 기록은 업체 방침 기간 <span class="pp-check">[해성 확인]</span></td>
                <td>사이트를 쓸 때마다 네트워크로 전송</td>
              </tr>
              <tr>
                <td>Features &amp; Labels, Inc. (fal) <span class="pp-check">[해성 확인: 연락처]</span></td>
                <td>미국</td>
                <td>AI 스튜디오에서 고른 사진</td>
                <td>배경 지우기, AI 배경 만들기</td>
                <td>처리 결과만 받고, 업체가 사진을 저장하지 않도록 요청해 보냄</td>
                <td>해당 기능을 누를 때 네트워크로 전송</td>
              </tr>
              <tr>
                <td>Google LLC</td>
                <td>미국</td>
                <td>방문·클릭 기록, 쿠키, 브라우저·기기 정보</td>
                <td>방문 통계 분석</td>
                <td>10번 참고</td>
                <td>웹사이트 방문 시 자동 전송</td>
              </tr>
              <tr>
                <td>TikTok Pte. Ltd. <span class="pp-check">[해성 확인: 계약 법인·국가]</span></td>
                <td>싱가포르 등</td>
                <td>방문·클릭 기록, 쿠키, 브라우저·기기 정보</td>
                <td>광고 성과 측정, 맞춤형 광고</td>
                <td>10번 참고</td>
                <td>웹사이트 방문 시 자동 전송</td>
              </tr>
              <tr>
                <td>Meta Platforms, Inc. <span class="pp-check">[해성 확인: 계약 법인·국가]</span></td>
                <td>미국</td>
                <td>방문·클릭 기록, 쿠키, 브라우저·기기 정보</td>
                <td>광고 성과 측정, 맞춤형 광고</td>
                <td>10번 참고</td>
                <td>웹사이트 방문 시 자동 전송</td>
              </tr>
              <tr>
                <td>YIWUSHI QIANGONG TRADING FIRM (중국 수출·송금 수취 협력사) <span class="pp-check">[해성 확인: 제공 여부·연락처]</span></td>
                <td>중국</td>
                <td>영문 상호·영문 주소, 휴대전화번호, 주문 품목·금액</td>
                <td>수출 인보이스 발행, 해외송금(T/T) 대금 수취</td>
                <td>거래 완료 후 중국 법령에 따른 기간</td>
                <td>인보이스 발행 시 전자 문서로 전달</td>
              </tr>
              <tr>
                <td>중국 이우 물류센터 <span class="pp-check">[해성 확인: 회사 직영 여부·고객 정보 열람 범위]</span></td>
                <td>중국</td>
                <td>주문번호, 주문자 상호, 주문 상품</td>
                <td>입고·검수·포장·한국행 출고</td>
                <td>출고 완료 후 파기</td>
                <td>주문 처리 시 회사 시스템으로 조회</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul class="pp-list">
          <li><b>거부 방법과 불이익:</b> 해외 이전을 원하지 않으면 고객센터(12번)로 알려 주세요. 다만 서버 운영(Vercel)은 웹사이트 이용에 꼭 필요해서 거부하면 서비스를 이용할 수 없습니다. AI 스튜디오의 배경 기능을 쓰지 않으면 사진이 해외로 가지 않습니다. 방문 통계·광고 측정은 10번의 방법으로 언제든 거부할 수 있고, 거부해도 서비스 이용에 제한이 없습니다.</li>
        </ul>
      </section>

      <!-- 7 -->
      <section :id="TOC[6].id" class="pp-card pp-sec">
        <h2 class="pp-h2">7. 개인정보의 파기 절차 및 방법</h2>
        <ul class="pp-list">
          <li><b>파기 절차:</b> 보유 기간이 끝나거나 처리 목적을 이룬 정보는 지체 없이 파기합니다. 법령에 따라 보관해야 하는 정보는 다른 정보와 분리해 보관하고, 그 기간이 끝나면 파기합니다.</li>
          <li><b>파기 방법:</b> 전자 파일은 되살릴 수 없는 방법으로 지우고, 종이 문서는 분쇄하거나 태웁니다.</li>
        </ul>
      </section>

      <!-- 8 -->
      <section :id="TOC[7].id" class="pp-card pp-sec">
        <h2 class="pp-h2">8. 정보주체와 법정대리인의 권리·의무 및 행사 방법</h2>
        <ul class="pp-list">
          <li>고객은 언제든지 자신의 개인정보를 <b>열람</b>하고, 틀린 부분의 <b>정정·삭제</b>, <b>처리 정지</b>, <b>동의 철회</b>를 요구할 수 있습니다.</li>
          <li><b>직접 하기:</b> 로그인 후 [대시보드 → 계정 설정]에서 내 정보를 보고 고칠 수 있고, 같은 화면에서 회원 탈퇴를 신청할 수 있습니다.</li>
          <li><b>요청하기:</b> 전화(010-9373-1214), 이메일(contact@euchs.co.kr), 카카오톡 채널로 요청하면 본인 확인 후 10일 안에 처리하고 결과를 알려 드립니다.</li>
          <li>대리인(법정대리인이나 위임받은 사람)을 통해서도 요청할 수 있습니다. 이때는 위임장을 내야 합니다.</li>
          <li>다른 법령에서 보관하도록 정한 정보는 삭제를 요구할 수 없고, 법이 정한 경우 처리 정지 요구가 거절될 수 있습니다. 거절하면 그 이유를 알려 드립니다.</li>
          <li>고객은 자신의 개인정보를 정확하게 입력해야 하며, 다른 사람의 정보를 도용하거나 침해하면 관련 법에 따라 처벌받을 수 있습니다.</li>
        </ul>
      </section>

      <!-- 9 -->
      <section :id="TOC[8].id" class="pp-card pp-sec">
        <h2 class="pp-h2">9. 개인정보의 안전성 확보 조치</h2>
        <ul class="pp-list">
          <li><b>관리적 조치:</b> 개인정보를 다루는 사람을 최소한으로 정하고, 관리자 권한을 역할별로 나눠 줍니다. <span class="pp-check">[해성 확인: 내부관리계획·정기 교육 여부]</span></li>
          <li><b>기술적 조치:</b> 모든 통신을 암호화(HTTPS)하고, 비밀번호는 되돌릴 수 없는 방식으로 암호화해 저장합니다. 고객은 자기 정보만 볼 수 있도록 접근을 막고, 관리자 화면은 관리자 인증을 거쳐야 열립니다.</li>
          <li><b>물리적 조치:</b> 정보는 보안 인증을 받은 클라우드 데이터센터에 보관합니다. 종이 서류는 잠금장치가 있는 곳에 보관합니다. <span class="pp-check">[해성 확인]</span></li>
        </ul>
      </section>

      <!-- 10 -->
      <section :id="TOC[9].id" class="pp-card pp-sec">
        <h2 class="pp-h2">10. 행태정보의 수집·이용·제공 및 거부</h2>
        <p class="pp-p">회사는 방문 통계와 광고 성과 측정, 관심사 기반 맞춤형 광고를 위해 아래와 같이 행태정보를 수집·이용합니다.</p>
        <div class="pp-table-wrap">
          <table class="pp-table">
            <tbody>
              <tr><th class="w-36 text-left">수집 항목</th><td>웹사이트 방문 기록, 방문한 페이지 주소, 카카오톡 상담·전화 버튼 클릭 기록, 쿠키·광고 식별자, 브라우저·기기 정보</td></tr>
              <tr><th class="text-left">수집 방법</th><td>웹사이트를 방문하거나 버튼을 누를 때 자동으로 수집</td></tr>
              <tr><th class="text-left">이용 목적</th><td>방문 통계 분석, 광고 성과 측정, 관심사 기반 맞춤형 광고</td></tr>
              <tr><th class="text-left">보유 기간</th><td>수집일부터 최대 <span class="pp-check">[해성 확인: ○개월]</span> (각 사업자의 보관 정책에 따름)</td></tr>
              <tr><th class="text-left">수집·처리하는 사업자</th><td>Google LLC(구글 애널리틱스), TikTok(틱톡 픽셀), Meta Platforms(메타 픽셀) — 국외 이전 내용은 6번</td></tr>
            </tbody>
          </table>
        </div>
        <ul class="pp-list">
          <li>회원 전용 화면(대시보드)과 관리자 화면에서 누른 상담·전화 버튼은 광고 사업자에게 보내지 않습니다.</li>
          <li>광고 사업자에게 이름·전화번호·이메일 등 고객을 알아볼 수 있는 정보를 보내지 않습니다.</li>
          <li>만 14세 미만 아동을 대상으로 한 맞춤형 광고는 하지 않습니다.</li>
          <li><b>거부 방법:</b>
            <ul class="pp-list !mt-1">
              <li>PC 브라우저: 크롬 [설정 → 개인정보 보호 및 보안 → 서드 파티 쿠키]에서 쿠키를 차단하거나 삭제</li>
              <li>휴대폰: 안드로이드 [설정 → Google → 광고 → 광고 ID 삭제], 아이폰 [설정 → 개인정보 보호 및 보안 → 추적 → 앱의 추적 요청 허용 끄기]</li>
              <li>구글 애널리틱스: 구글이 제공하는 차단 부가기능(tools.google.com/dlpage/gaoptout) 설치</li>
              <li>틱톡·메타: 각 서비스 앱·웹사이트의 [설정 → 광고] 메뉴에서 맞춤형 광고 끄기</li>
            </ul>
          </li>
          <li>거부해도 서비스 이용에는 제한이 없습니다. 행태정보 관련 문의는 12번 담당자에게 해 주세요.</li>
        </ul>
      </section>

      <!-- 11 -->
      <section :id="TOC[10].id" class="pp-card pp-sec">
        <h2 class="pp-h2">11. 개인정보 자동 수집 장치(쿠키)의 설치·운영 및 거부</h2>
        <ul class="pp-list">
          <li><b>쿠키란:</b> 웹사이트가 고객의 브라우저에 저장하는 작은 정보 파일입니다. 회사는 로그인 상태 유지, 장바구니·화면 설정 기억, 방문 통계·광고 측정(10번)에 쿠키와 브라우저 저장소를 씁니다.</li>
          <li><b>거부 방법:</b> 브라우저 설정에서 쿠키 저장을 거부하거나 삭제할 수 있습니다. 크롬 [설정 → 개인정보 보호 및 보안 → 서드 파티 쿠키], 엣지 [설정 → 쿠키 및 사이트 권한], 사파리 [설정 → 개인정보 보호].</li>
          <li>쿠키를 모두 막으면 로그인 유지 등 일부 기능을 쓰기 어려울 수 있습니다.</li>
        </ul>
      </section>

      <!-- 12 -->
      <section :id="TOC[11].id" class="pp-card pp-sec">
        <h2 class="pp-h2">12. 개인정보 보호책임자</h2>
        <p class="pp-p">개인정보 처리에 관한 업무를 총괄하고, 고객의 불만 처리와 피해 구제를 담당합니다.</p>
        <div class="pp-table-wrap">
          <table class="pp-table">
            <tbody>
              <tr><th class="w-36 text-left">성명·직책</th><td>조해성 (Cho Hae Sung), 대표</td></tr>
              <tr><th class="text-left">연락처</th><td>010-9373-1214 · contact@euchs.co.kr</td></tr>
              <tr><th class="text-left">담당 업무</th><td>개인정보 보호 업무 총괄, 열람·정정·삭제 요청 처리, 개인정보 관련 불만·피해 구제</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 13 -->
      <section :id="TOC[12].id" class="pp-card pp-sec">
        <h2 class="pp-h2">13. 개인정보 열람청구 접수·처리 부서</h2>
        <div class="pp-table-wrap">
          <table class="pp-table">
            <tbody>
              <tr><th class="w-36 text-left">부서</th><td>고객센터 <span class="pp-check">[해성 확인: 부서 이름]</span></td></tr>
              <tr><th class="text-left">연락처</th><td>전화 010-9373-1214 · 이메일 contact@euchs.co.kr · 카카오톡 채널 "이유씨컴퍼니"</td></tr>
              <tr><th class="text-left">주소</th><td>광주광역시 북구 서방로135번길 54, 1층</td></tr>
            </tbody>
          </table>
        </div>
        <p class="pp-p">개인정보보호위원회의 개인정보 포털(www.privacy.go.kr)에서도 열람을 청구할 수 있습니다.</p>
      </section>

      <!-- 14 -->
      <section :id="TOC[13].id" class="pp-card pp-sec">
        <h2 class="pp-h2">14. 권익침해 구제 방법</h2>
        <p class="pp-p">개인정보 침해로 도움이 필요하면 아래 기관에 분쟁 조정이나 상담을 신청할 수 있습니다.</p>
        <div class="pp-table-wrap">
          <table class="pp-table">
            <thead><tr><th>기관</th><th class="w-32">전화</th><th>누리집</th></tr></thead>
            <tbody>
              <tr><td>개인정보분쟁조정위원회</td><td>1833-6972</td><td>www.kopico.go.kr</td></tr>
              <tr><td>개인정보침해신고센터</td><td>118</td><td>privacy.kisa.or.kr</td></tr>
              <tr><td>대검찰청</td><td>1301</td><td>www.spo.go.kr</td></tr>
              <tr><td>경찰청</td><td>182</td><td>ecrm.police.go.kr</td></tr>
            </tbody>
          </table>
        </div>
        <p class="pp-p">열람·정정·삭제·처리정지 요구에 대한 회사의 처분이나 부작위로 권리가 침해되었다면 「행정심판법」에 따라 행정심판을 청구할 수 있습니다(중앙행정심판위원회 110, www.simpan.go.kr).</p>
      </section>

      <!-- 15 -->
      <section :id="TOC[14].id" class="pp-card pp-sec">
        <h2 class="pp-h2">15. 개인정보처리방침의 변경</h2>
        <ul class="pp-list">
          <li>이 방침은 2026년 9월 28일부터 적용됩니다.</li>
          <li>내용이 바뀌면 시행 7일 전(고객 권리에 중요한 변경은 30일 전)부터 웹사이트 공지사항으로 알립니다.</li>
        </ul>
        <div class="pp-table-wrap">
          <table class="pp-table">
            <thead><tr><th class="w-40">시행일</th><th>변경 내용</th></tr></thead>
            <tbody>
              <tr><td>2026년 9월 28일</td><td>개인정보처리방침 제정</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <p class="mt-8 text-xs text-slate-500 text-center">이유씨컴퍼니 · 대표 조해성 · 사업자등록번호 783-17-01247 · 광주광역시 북구 서방로135번길 54, 1층</p>
    </div>
  </div>
</template>

<script setup>
// 개인정보처리방침 (/privacy) — 개인정보보호위원회 「2026 개인정보 처리방침 작성지침」(2026-04-24) 항목 순서.
// ★ 수집 항목·제공처·위탁처·국외 이전은 코드·DB에서 확인한 것만 적는다. 바뀌면 여기와 15번 변경 이력을 함께 고친다.
// ★ 고객용 문서 — 내부 이름(표·칸·경로·설정)은 쓰지 않는다. "[해성 확인]" 표시는 공개 전에 모두 채운다.
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'

const TOC = [
  { id: 'p1', title: '개인정보의 처리 목적' },
  { id: 'p2', title: '처리하는 개인정보 항목' },
  { id: 'p3', title: '처리 및 보유 기간' },
  { id: 'p4', title: '개인정보의 제3자 제공' },
  { id: 'p5', title: '개인정보 처리 위탁' },
  { id: 'p6', title: '개인정보의 국외 이전' },
  { id: 'p7', title: '파기 절차 및 방법' },
  { id: 'p8', title: '정보주체의 권리와 행사 방법' },
  { id: 'p9', title: '안전성 확보 조치' },
  { id: 'p10', title: '행태정보의 수집·이용·제공 및 거부' },
  { id: 'p11', title: '쿠키의 설치·운영 및 거부' },
  { id: 'p12', title: '개인정보 보호책임자' },
  { id: 'p13', title: '열람청구 접수·처리 부서' },
  { id: 'p14', title: '권익침해 구제 방법' },
  { id: 'p15', title: '처리방침의 변경' },
]

// 목차 이동 — 고정 헤더에 제목이 가리지 않게 scroll-margin-top(.pp-sec)을 지키는 scrollIntoView로 옮긴다.
// (사이트 전체 라우터 scrollBehavior는 다른 화면도 쓰므로 바꾸지 않는다)
const route = useRoute()
function goTo(id) {
  const el = document.getElementById(id)
  if (!el) return
  history.replaceState(history.state, '', `#${id}`)
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
// 주소에 #p6 처럼 붙여 바로 들어온 경우 — 라우터가 먼저 옮긴 뒤(150ms) 헤더 높이만큼 다시 맞춘다
onMounted(() => {
  const id = route.hash.replace('#', '')
  if (TOC.some(t => t.id === id)) setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }), 400)
})
</script>

<style scoped>
.pp-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 16px; }
@media (min-width: 640px) { .pp-card { padding: 28px; } }
.pp-sec { scroll-margin-top: 112px; } /* PC 헤더(위 띠 + 메뉴 줄) 높이 + 여백 */
@media (max-width: 1023px) { .pp-sec { scroll-margin-top: 76px; } } /* 모바일은 위 띠 없음 */
.pp-h2 { font-size: 17px; font-weight: 900; color: #0f172a; margin-top: 0; }
.pp-p { font-size: 14px; line-height: 1.75; color: #334155; margin-top: 10px; word-break: keep-all; }
.pp-list { margin-top: 10px; padding-left: 18px; list-style: disc; font-size: 14px; line-height: 1.75; color: #334155; word-break: keep-all; }
.pp-list > li + li { margin-top: 4px; }
.pp-sum { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; font-size: 13px; line-height: 1.6; color: #334155; word-break: keep-all; }
.pp-sum b { display: block; font-size: 12px; color: #2563eb; margin-bottom: 2px; }
/* 표 — 좁은 화면에서는 표만 가로로 넘긴다 */
.pp-table-wrap { margin-top: 12px; overflow-x: auto; -webkit-overflow-scrolling: touch; border: 1px solid #e2e8f0; border-radius: 12px; }
.pp-table { width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.6; color: #334155; }
.pp-table:has(thead th:nth-child(3)) { min-width: 560px; } /* 칸이 셋 이상이면 좁은 화면에서 표만 가로로 */
.pp-table-wide { min-width: 760px !important; }
.pp-table th { background: #f1f5f9; color: #0f172a; font-weight: 800; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; word-break: keep-all; }
.pp-table thead th { text-align: left; }
.pp-table td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; word-break: keep-all; }
.pp-table tr:last-child td, .pp-table tr:last-child th { border-bottom: none; }
.pp-check { display: inline-block; padding: 0 5px; border-radius: 4px; background: #fef3c7; color: #92400e; font-size: 12px; font-weight: 700; }
</style>
