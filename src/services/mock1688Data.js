/**
 * EUCHS 1688 B2B Mock Dataset & Intelligent Fallback Engine
 * 1688 DataHub 장애/지연 시 무결점 UI 렌더링을 보장하는 1688 실제 도매 규격 데이터셋
 * 구형 더미(볶음밥, 커피잔, 노란의자, 냄비, 파워뱅크 등) 영구 제거 완료
 */

export const MOCK_1688_PRODUCTS = [
  // ==========================================
  // 1. 여성의류 & 패션의류 (원피스, 치마, 셔츠, 슬랙스 등)
  // ==========================================
  {
    id: '804895839701',
    titleZh: '法式复古亚麻衬衫女装宽松休闲百搭短袖防晒上衣',
    titleKo: '프렌치 린넨 반팔 루즈핏 블라우스 여름 셔츠',
    titleEn: 'French Vintage Linen Short Sleeve Blouse',
    category: 'women',
    keywords: ['린넨', '블라우스', '셔츠', '여성', '원피스', '의류', '여름', '여성의류', '프렌치', '루즈핏', '패션', '치마', '亚麻', '衬衫', '女装'],
    price: 24.50,
    priceFormatted: '24.50',
    minOrder: 2,
    sales: '2.8만+',
    repurchaseRate: '95%',
    imageUrl: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=800&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839701.html',
    company: '광저우 이란 패션 의류 유한공사 (广州依兰服饰有限公司)',
    starLevel: 5.0,
    skuProps: [
      {
        prop: '색상',
        values: [
          { name: '아이보리 화이트', imageUrl: '' },
          { name: '내추럴 베이지', imageUrl: '' },
          { name: '스카이 블루', imageUrl: '' }
        ]
      },
      {
        prop: '사이즈',
        values: [{ name: 'FREE (44~66)' }, { name: 'L (77)' }]
      }
    ],
    skus: [
      { color: '아이보리 화이트', size: 'FREE (44~66)', price: 24.50, stock: 1200 },
      { color: '내추럴 베이지', size: 'FREE (44~66)', price: 24.50, stock: 850 }
    ]
  },
  {
    id: '804895839702',
    titleZh: '法式碎花雪纺连衣裙女夏收腰显瘦气质长裙',
    titleKo: '플라워 쉬폰 롱 원피스 브이넥 A라인 플리츠 스커트',
    titleEn: 'Floral Chiffon Long Dress Summer Elegant Pleated',
    category: 'women',
    keywords: ['원피스', '치마', '플리츠', '스커트', '플라워', '쉬폰', '롱원피스', '여성', '여름', '드레스', '여성의류', '의류', '패션', '连衣裙', '碎花', '裙子'],
    price: 38.00,
    priceFormatted: '38.00',
    minOrder: 2,
    sales: '1.9만+',
    repurchaseRate: '92%',
    imageUrl: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839702.html',
    company: '항저우 치메이 원단 의류 직영공장 (杭州绮美服饰制衣厂)',
    starLevel: 4.9,
    skuProps: [
      {
        prop: '색상',
        values: [
          { name: '블루 플라워', imageUrl: '' },
          { name: '핑크 플라워', imageUrl: '' }
        ]
      },
      {
        prop: '사이즈',
        values: [{ name: 'S' }, { name: 'M' }, { name: 'L' }]
      }
    ],
    skus: [
      { color: '블루 플라워', size: 'S', price: 38.00, stock: 500 },
      { color: '블루 플라워', size: 'M', price: 38.00, stock: 800 }
    ]
  },
  {
    id: '804895839703',
    titleZh: '高腰百褶半身裙女夏A字显瘦防走光短裙百搭中长款伞裙',
    titleKo: '하이웨이스트 핀턱 A라인 플리츠 미디 스커트 치마',
    titleEn: 'High Waist Pleated A-line Midi Skirt',
    category: 'women',
    keywords: ['치마', '스커트', '플리츠', '플리츠스커트', '미디스커트', 'A라인', '여성의류', '의류', '여성', '패션', '半身裙', '百褶裙', '裙子'],
    price: 22.80,
    priceFormatted: '22.80',
    minOrder: 2,
    sales: '3.6만+',
    repurchaseRate: '96%',
    imageUrl: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839703.html',
    company: '저장성 사오싱 커차오 의류제조사 (绍兴柯桥尚品服饰厂)',
    starLevel: 5.0,
    skuProps: [
      {
        prop: '색상',
        values: [
          { name: '클래식 블랙', imageUrl: '' },
          { name: '소프트 베이지', imageUrl: '' },
          { name: '차콜 그레이', imageUrl: '' }
        ]
      },
      {
        prop: '사이즈',
        values: [{ name: 'S (25~26)' }, { name: 'M (27~28)' }, { name: 'L (29~30)' }]
      }
    ],
    skus: [
      { color: '클래식 블랙', size: 'S (25~26)', price: 22.80, stock: 1200 },
      { color: '클래식 블랙', size: 'M (27~28)', price: 22.80, stock: 1500 }
    ]
  },
  {
    id: '804895839704',
    titleZh: '夏季薄款冰丝阔腿裤高腰垂感西装直筒休闲裤女',
    titleKo: '와이드핏 핀턱 슬랙스 하이웨스트 쿨링 썸머 팬츠',
    titleEn: 'High Waist Wide Leg Trousers Ice Silk',
    category: 'women',
    keywords: ['슬랙스', '바지', '팬츠', '와이드팬츠', '쿨링', '여성', '여성의류', '의류', '하의', '패션', '阔腿裤', '西装裤'],
    price: 28.50,
    priceFormatted: '28.50',
    minOrder: 3,
    sales: '3.4만+',
    repurchaseRate: '96%',
    imageUrl: 'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?w=800&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839704.html',
    company: '동관시 밍야 텍스타일 의류공장 (东莞市明雅制衣有限公司)',
    starLevel: 5.0,
    skuProps: [
      {
        prop: '색상',
        values: [
          { name: '차콜 블랙', imageUrl: '' },
          { name: '라이트 베이지', imageUrl: '' }
        ]
      },
      {
        prop: '사이즈',
        values: [{ name: 'S' }, { name: 'M' }, { name: 'L' }, { name: 'XL' }]
      }
    ],
    skus: [
      { color: '차콜 블랙', size: 'S', price: 28.50, stock: 1500 },
      { color: '차콜 블랙', size: 'M', price: 28.50, stock: 2000 }
    ]
  },
  {
    id: '804895839705',
    titleZh: '重磅260g纯棉短袖t恤男女同款落肩宽松半袖打底衫',
    titleKo: '오버핏 헤비코튼 20수 드롭숄더 무지 반팔 티셔츠',
    titleEn: 'Heavyweight Cotton Oversized Unisex T-shirt',
    category: 'women',
    keywords: ['티셔츠', '반팔', '헤비코튼', '오버핏', '무지티', '남녀공용', '의류', '여성의류', '남성의류', '패션', 't恤', '纯棉'],
    price: 14.20,
    priceFormatted: '14.20',
    minOrder: 5,
    sales: '5.2만+',
    repurchaseRate: '98%',
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839705.html',
    company: '저장성 이우시 진상 니팅 섬유공장 (浙江金尚针织有限公司)',
    starLevel: 5.0,
    skuProps: [
      {
        prop: '색상',
        values: [
          { name: '퓨어 화이트', imageUrl: '' },
          { name: '매트 블랙', imageUrl: '' },
          { name: '멜란지 그레이', imageUrl: '' }
        ]
      },
      {
        prop: '사이즈',
        values: [{ name: 'M' }, { name: 'L' }, { name: 'XL' }, { name: 'XXL' }]
      }
    ],
    skus: [
      { color: '퓨어 화이트', size: 'L', price: 14.20, stock: 3500 },
      { color: '매트 블랙', size: 'L', price: 14.20, stock: 3000 }
    ]
  },
  {
    id: '804895839706',
    titleZh: '夏季法式复古麻花针织开衫短袖薄款v领外搭上衣',
    titleKo: '여름 썸머 꽈배기 니트 슬림핏 반팔 가디건',
    titleEn: 'Summer Cable Knit Short Sleeve Cardigan',
    category: 'women',
    keywords: ['니트', '가디건', '꽈배기', '여름니트', '여성', '여성의류', '상의', '의류', '패션', '针织', '开衫'],
    price: 21.00,
    priceFormatted: '21.00',
    minOrder: 2,
    sales: '1.4만+',
    repurchaseRate: '91%',
    imageUrl: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839706.html',
    company: '상하이 첸위 패션 디자인 유한공사 (上海仟羽服饰有限公司)',
    starLevel: 4.8,
    skuProps: [
      {
        prop: '색상',
        values: [
          { name: '크림 옐로우', imageUrl: '' },
          { name: '소프트 민트', imageUrl: '' },
          { name: '퓨어 화이트', imageUrl: '' }
        ]
      }
    ],
    skus: [
      { color: '크림 옐로우', size: 'FREE', price: 21.00, stock: 900 },
      { color: '소프트 민트', size: 'FREE', price: 21.00, stock: 750 }
    ]
  },

  // ==========================================
  // 2. 패션잡화 / 가방 / 신발
  // ==========================================
  {
    id: '804895839707',
    titleZh: '法式高级感复古单肩腋下包女小众百搭斜挎法棍包',
    titleKo: '미니멀 비건 레더 바게트 숄더백 크로스백',
    titleEn: 'Minimalist Vegan Leather Baguette Shoulder Bag',
    category: 'acc',
    keywords: ['가방', '숄더백', '바게트백', '크로스백', '핸드백', '패션잡화', '잡화', '여성가방', '单肩包', '女包'],
    price: 29.80,
    priceFormatted: '29.80',
    minOrder: 2,
    sales: '3.1만+',
    repurchaseRate: '94%',
    imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839707.html',
    company: '광저우 바이윈 피혁 가방 제조공장 (广州白云区皮具制造厂)',
    starLevel: 5.0,
    skuProps: [
      {
        prop: '색상',
        values: [
          { name: '클래식 블랙', imageUrl: '' },
          { name: '빈티지 브라운', imageUrl: '' },
          { name: '버터 크림', imageUrl: '' }
        ]
      }
    ],
    skus: [
      { color: '클래식 블랙', size: '표준 규격 (28x14cm)', price: 29.80, stock: 1500 },
      { color: '빈티지 브라운', size: '표준 규격 (28x14cm)', price: 29.80, stock: 1200 }
    ]
  },
  {
    id: '804895839708',
    titleZh: '大容量干湿分离健身包男女短途旅行包防水牛津布手提包',
    titleKo: '방수 옥스포드 캔버스 보스턴백 대용량 여행가방',
    titleEn: 'Waterproof Oxford Canvas Duffle Travel Bag',
    category: 'acc',
    keywords: ['가방', '여행가방', '보스턴백', '헬스가방', '대용량', '더플백', '방수가방', '패션잡화', '잡화', '旅行包', '健身包'],
    price: 32.50,
    priceFormatted: '32.50',
    minOrder: 2,
    sales: '2.4만+',
    repurchaseRate: '93%',
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839708.html',
    company: '이우시 헝펑 여행용품 유한공사 (义乌市恒丰箱包有限公司)',
    starLevel: 4.9,
    skuProps: [
      {
        prop: '색상',
        values: [
          { name: '다크 네이비', imageUrl: '' },
          { name: '매트 블랙', imageUrl: '' }
        ]
      }
    ],
    skus: [
      { color: '다크 네이비', size: '대형 (48x26x28cm)', price: 32.50, stock: 800 },
      { color: '매트 블랙', size: '대형 (48x26x28cm)', price: 32.50, stock: 1200 }
    ]
  },
  {
    id: '804895839709',
    titleZh: '夏季透气网面运动鞋男轻便软底减震跑步鞋休闲飞织鞋',
    titleKo: '초경량 에어 쿠셔닝 메쉬 통기성 런닝화 스니커즈',
    titleEn: 'Ultralight Breathable Mesh Running Shoes',
    category: 'acc',
    keywords: ['신발', '런닝화', '운동화', '스니커즈', '메쉬', '신발류', '잡화', '패션잡화', '运动鞋', '跑步鞋'],
    price: 42.00,
    priceFormatted: '42.00',
    minOrder: 2,
    sales: '1.6만+',
    repurchaseRate: '90%',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839709.html',
    company: '푸젠성 취안저우 신발 산업 단지 직영공장 (泉州鞋业制造有限公司)',
    starLevel: 4.8,
    skuProps: [
      {
        prop: '색상',
        values: [
          { name: '블랙', imageUrl: '' },
          { name: '화이트', imageUrl: '' }
        ]
      },
      {
        prop: '사이즈',
        values: [{ name: '250mm' }, { name: '260mm' }, { name: '270mm' }]
      }
    ],
    skus: [
      { color: '블랙', size: '260mm', price: 42.00, stock: 500 },
      { color: '화이트', size: '260mm', price: 42.00, stock: 450 }
    ]
  },
  {
    id: '804895839710',
    titleZh: '男士真皮自动扣皮带头层牛皮商务正装休闲腰带',
    titleKo: '천연 소가죽 클래식 스퀘어 자동 버클 벨트',
    titleEn: 'Genuine Leather Automatic Buckle Belt',
    category: 'acc',
    keywords: ['벨트', '가죽벨트', '소가죽', '남성벨트', '패션잡화', '잡화', '허리띠', '皮带', '腰带'],
    price: 16.50,
    priceFormatted: '16.50',
    minOrder: 5,
    sales: '4.2만+',
    repurchaseRate: '95%',
    imageUrl: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=800&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839710.html',
    company: '원저우시 진펑 가죽제품 유한공사 (温州市金丰皮具有限公司)',
    starLevel: 5.0,
    skuProps: [
      {
        prop: '색상',
        values: [
          { name: '모던 실버 버클 + 블랙', imageUrl: '' },
          { name: '건메탈 블랙 버클 + 블랙', imageUrl: '' }
        ]
      }
    ],
    skus: [
      { color: '모던 실버 버클 + 블랙', size: '120cm', price: 16.50, stock: 2000 }
    ]
  },

  // ==========================================
  // 3. 생활 / 텀블러 / 보온병 / 주방밀폐용기
  // ==========================================
  {
    id: '804895839711',
    titleZh: '316不锈钢保温杯大容量吸管杯户外车载水杯便携咖啡杯',
    titleKo: '316 의료용 스테인리스 대용량 스트로우 보온보랭 텀블러 900ml',
    titleEn: '316 Stainless Steel Large Capacity Straw Tumbler 900ml',
    category: 'living',
    keywords: ['텀블러', '보온병', '물병', '스테인리스', '보온컵', '스트로우텀블러', '생활용품', '주방용품', '주방', '밀폐', '保温杯', '水杯'],
    price: 26.50,
    priceFormatted: '26.50',
    minOrder: 2,
    sales: '7.8만+',
    repurchaseRate: '98%',
    imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839711.html',
    company: '저장성 융캉시 하오메이 스테인리스 보온컵 공장 (永康市浩美五金制品厂)',
    starLevel: 5.0,
    skuProps: [
      {
        prop: '색상',
        values: [
          { name: '매트 블랙', imageUrl: '' },
          { name: '아이보리 크림', imageUrl: '' },
          { name: '올리브 그린', imageUrl: '' }
        ]
      },
      {
        prop: '용량',
        values: [{ name: '600ml' }, { name: '900ml' }, { name: '1200ml' }]
      }
    ],
    skus: [
      { color: '매트 블랙', size: '900ml', price: 26.50, stock: 3500 },
      { color: '아이보리 크림', size: '900ml', price: 26.50, stock: 4000 }
    ]
  },
  {
    id: '804895839712',
    titleZh: '不锈钢双层抽真空保温水壶运动水杯户外便携保温杯',
    titleKo: '심플 슬림 이중 진공 포터블 보온병 500ml',
    titleEn: 'Simple Slim Double Vacuum Insulated Thermal Bottle 500ml',
    category: 'living',
    keywords: ['텀블러', '보온병', '보온수통', '물병', '스테인리스', '주방용품', '생활용품', '주방', '保温杯', '水壶'],
    price: 19.80,
    priceFormatted: '19.80',
    minOrder: 3,
    sales: '4.5만+',
    repurchaseRate: '96%',
    imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839712.html',
    company: '저장성 우이현 이노베이션 텀블러 제조창 (武义县尚品不锈钢器皿厂)',
    starLevel: 4.9,
    skuProps: [
      {
        prop: '색상',
        values: [
          { name: '매트 화이트', imageUrl: '' },
          { name: '스페이스 실버', imageUrl: '' }
        ]
      }
    ],
    skus: [
      { color: '매트 화이트', size: '500ml', price: 19.80, stock: 2500 }
    ]
  }
];

/**
 * 키워드 및 정렬/페이지네이션 기반 지능형 Mock 검색 함수
 * 키워드와 매칭되는 아이템만 정확히 필터링
 */
export function getMockSearchResults(query = '', page = 1, options = {}) {
  const { sort = 'default' } = options;
  const rawQuery = String(query || '').trim().toLowerCase();

  let matched = [...MOCK_1688_PRODUCTS];

  if (rawQuery) {
    // 키워드 토큰 분리
    const tokens = rawQuery.split(/[\s,+/_-]+/).filter(t => t.length > 0);

    const scored = MOCK_1688_PRODUCTS.map((prod) => {
      let score = 0;
      const titleKo = (prod.titleKo || '').toLowerCase();
      const titleZh = (prod.titleZh || '').toLowerCase();
      const titleEn = (prod.titleEn || '').toLowerCase();
      const category = (prod.category || '').toLowerCase();
      const keywords = (prod.keywords || []).map(k => k.toLowerCase());

      for (const token of tokens) {
        if (titleKo.includes(token)) score += 15;
        if (keywords.some(k => k.includes(token) || token.includes(k))) score += 12;
        if (titleZh.includes(token)) score += 10;
        if (titleEn.includes(token)) score += 8;
        if (category === token) score += 15;
      }

      return { prod, score };
    });

    const filtered = scored.filter(s => s.score > 0);

    if (filtered.length > 0) {
      filtered.sort((a, b) => b.score - a.score);
      matched = filtered.map(s => s.prod);
    } else {
      // 키워드가 특정이 안될 경우 여성의류/인기 잡화 위주로 단정하게 반환
      matched = MOCK_1688_PRODUCTS.filter(p => p.category === 'women' || p.category === 'acc');
    }
  }

  // 정렬 옵션 적용
  if (sort === 'price_asc' || sort === 'price_low') {
    matched.sort((a, b) => a.price - b.price);
  } else if (sort === 'price_desc' || sort === 'price_high') {
    matched.sort((a, b) => b.price - a.price);
  } else if (sort === 'sales_desc' || sort === 'sales') {
    matched.sort((a, b) => parseFloat(b.sales) - parseFloat(a.sales));
  }

  const pageSize = 20;
  const pageNum = Math.max(1, Number(page) || 1);
  const startIndex = (pageNum - 1) * pageSize;
  const paginatedItems = matched.slice(startIndex, startIndex + pageSize);

  // 항목 객체 정규화 - 표준 B2B 포맷
  const items = paginatedItems.map(item => ({
    id: String(item.id),
    itemId: String(item.id),
    titleZh: item.titleZh,
    titleEn: item.titleEn,
    titleKo: item.titleKo,
    title: item.titleKo || item.titleZh,
    price: item.price,
    priceNum: item.price,
    priceCny: item.price,
    priceFormatted: item.priceFormatted,
    minOrder: item.minOrder,
    moq: item.minOrder,
    sales: item.sales,
    repurchaseRate: item.repurchaseRate,
    imageUrl: item.imageUrl,
    detailUrl: item.detailUrl,
    itemUrl: item.detailUrl,
    productUrl: item.detailUrl,
    company: item.company,
    starLevel: item.starLevel,
    skuProps: item.skuProps || [],
    skus: item.skus || [],
    raw: item
  }));

  return {
    rawResponse: { result: { resultList: items } },
    items,
    page: pageNum,
    pageSize,
    totalResults: String(matched.length),
    hasMore: startIndex + pageSize < matched.length,
    queryZh: rawQuery,
    queryKo: rawQuery
  };
}

/**
 * 단건 Mock 상품 상세 조회 함수
 */
export function getMockProductDetail(itemId) {
  const idStr = String(itemId || '').trim();
  const found = MOCK_1688_PRODUCTS.find(p => String(p.id) === idStr);

  if (found) {
    return {
      ...found,
      id: String(found.id),
      itemId: String(found.id),
      raw: found
    };
  }

  const first = MOCK_1688_PRODUCTS[0];
  return {
    ...first,
    id: idStr || '804895839701',
    itemId: idStr || '804895839701',
    titleKo: `1688 도매 상품 (ID: ${idStr || '804895839701'})`,
    titleZh: `1688商品 (${idStr})`,
    detailUrl: `https://detail.1688.com/offer/${idStr || '804895839701'}.html`,
    skuProps: first.skuProps || [],
    skus: first.skus || [],
    raw: {}
  };
}

