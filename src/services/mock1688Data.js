/**
 * EUCHS 1688 B2B Mock Dataset & Intelligent Fallback Engine
 * RapidAPI / 1688 DataHub 쿼터 소진(429) 및 네트워크 에러 시 무결점 UI 렌더링을 보장하는 고품질 데이터셋
 * 각 상품에 skuProps (1차/2차 속성 배열)를 포함하여 ProductDetailModal 동적 옵션 렌더링 지원
 */

export const MOCK_1688_PRODUCTS = [
  // --- 1. 여성의류 / 패션 ---
  {
    id: '804895839701',
    titleZh: '法式复古亚麻衬衫女装宽松休闲百搭短袖防晒上衣',
    titleKo: '프렌치 린넨 반팔 루즈핏 블라우스 여름 셔츠',
    titleEn: 'French Vintage Linen Short Sleeve Blouse',
    category: 'women',
    keywords: ['린넨', '블라우스', '셔츠', '여성', '원피스', '의류', '여름', '여성의류', '프렌치', '루즈핏', '亚麻', '衬衫', '女装'],
    price: 24.50,
    priceFormatted: '24.50',
    minOrder: 2,
    sales: '2.8만+',
    repurchaseRate: '95%',
    imageUrl: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&auto=format&fit=crop&q=80'
    ],
    descriptionImages: [
      'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=1000&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839701.html',
    company: '광저우 이란 패션 의류 유한공사 (广州依兰服饰有限公司)',
    starLevel: 5.0,
    skuProps: [
      {
        prop: '색상',
        values: [
          { name: '아이보리 화이트', imageUrl: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=100&auto=format&fit=crop&q=80' },
          { name: '내추럴 베이지', imageUrl: 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=100&auto=format&fit=crop&q=80' },
          { name: '스카이 블루', imageUrl: '' },
          { name: '세이지 그린', imageUrl: '' }
        ]
      }
    ],
    skus: [
      { color: '아이보리 화이트', size: '', price: 24.50, stock: 1200 },
      { color: '내추럴 베이지', size: '', price: 24.50, stock: 850 },
      { color: '스카이 블루', size: '', price: 24.50, stock: 620 },
      { color: '세이지 그린', size: '', price: 24.50, stock: 430 }
    ]
  },
  {
    id: '804895839702',
    titleZh: '法式碎花雪纺连衣裙女夏收腰显瘦气质长裙',
    titleKo: '플라워 쉬폰 롱 원피스 브이넥 A라인 플리츠',
    titleEn: 'Floral Chiffon Long Dress Summer Elegant',
    category: 'women',
    keywords: ['원피스', '플라워', '쉬폰', '롱원피스', '여성', '여름', '드레스', '여성의류', '连衣裙', '碎花'],
    price: 38.00,
    priceFormatted: '38.00',
    minOrder: 2,
    sales: '1.9만+',
    repurchaseRate: '92%',
    imageUrl: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&auto=format&fit=crop&q=80'
    ],
    descriptionImages: [
      'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=1000&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839702.html',
    company: '항저우 치메이 원단 의류 직영공장 (杭州绮美服饰制衣厂)',
    starLevel: 4.9,
    skuProps: [
      {
        prop: '색상',
        values: [
          { name: '블루 플라워', imageUrl: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=100&auto=format&fit=crop&q=80' },
          { name: '핑크 플라워', imageUrl: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=100&auto=format&fit=crop&q=80' }
        ]
      },
      {
        prop: '사이즈',
        values: [
          { name: 'S' },
          { name: 'M' },
          { name: 'L' },
          { name: 'XL' }
        ]
      }
    ],
    skus: [
      { color: '블루 플라워', size: 'S', price: 38.00, stock: 500 },
      { color: '블루 플라워', size: 'M', price: 38.00, stock: 800 },
      { color: '핑크 플라워', size: 'S', price: 38.00, stock: 350 },
      { color: '핑크 플라워', size: 'M', price: 38.00, stock: 600 }
    ]
  },
  {
    id: '804895839703',
    titleZh: '夏季薄款冰丝阔腿裤高腰垂感西装直筒休闲裤女',
    titleKo: '와이드핏 핀턱 슬랙스 하이웨스트 쿨링 썸머 팬츠',
    titleEn: 'High Waist Wide Leg Trousers Ice Silk',
    category: 'women',
    keywords: ['슬랙스', '바지', '팬츠', '와이드팬츠', '쿨링', '여성', '여성의류', '하의', '阔腿裤', '西装裤'],
    price: 28.50,
    priceFormatted: '28.50',
    minOrder: 3,
    sales: '3.4만+',
    repurchaseRate: '96%',
    imageUrl: 'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?w=800&auto=format&fit=crop&q=80'
    ],
    descriptionImages: [
      'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?w=1000&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839703.html',
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
        values: [
          { name: 'S' },
          { name: 'M' },
          { name: 'L' },
          { name: 'XL' }
        ]
      }
    ],
    skus: [
      { color: '차콜 블랙', size: 'S', price: 28.50, stock: 1500 },
      { color: '차콜 블랙', size: 'M', price: 28.50, stock: 2000 },
      { color: '라이트 베이지', size: 'S', price: 28.50, stock: 800 },
      { color: '라이트 베이지', size: 'M', price: 28.50, stock: 1100 }
    ]
  },
  {
    id: '804895839704',
    titleZh: '重磅260g纯棉短袖t恤男女同款落肩宽松半袖打底衫',
    titleKo: '오버핏 헤비코튼 20수 드롭숄더 무지 반팔 티셔츠',
    titleEn: 'Heavyweight Cotton Oversized Unisex T-shirt',
    category: 'women',
    keywords: ['티셔츠', '반팔', '헤비코튼', '오버핏', '무지티', '남녀공용', '의류', '여성의류', '남성의류', 't恤', '纯棉'],
    price: 14.20,
    priceFormatted: '14.20',
    minOrder: 5,
    sales: '5.2만+',
    repurchaseRate: '98%',
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80'
    ],
    descriptionImages: [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1000&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839704.html',
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
        values: [
          { name: 'M' },
          { name: 'L' },
          { name: 'XL' },
          { name: 'XXL' }
        ]
      }
    ],
    skus: [
      { color: '퓨어 화이트', size: 'L', price: 14.20, stock: 3500 },
      { color: '퓨어 화이트', size: 'XL', price: 14.20, stock: 4000 },
      { color: '매트 블랙', size: 'L', price: 14.20, stock: 3000 },
      { color: '멜란지 그레이', size: 'L', price: 14.20, stock: 2500 }
    ]
  },
  {
    id: '804895839705',
    titleZh: '夏季法式复古麻花针织开衫短袖薄款v领外搭上衣',
    titleKo: '여름 썸머 꽈배기 니트 슬림핏 반팔 가디건',
    titleEn: 'Summer Cable Knit Short Sleeve Cardigan',
    category: 'women',
    keywords: ['니트', '가디건', '꽈배기', '여름니트', '여성', '여성의류', '상의', '针织', '开衫'],
    price: 21.00,
    priceFormatted: '21.00',
    minOrder: 2,
    sales: '1.4만+',
    repurchaseRate: '91%',
    imageUrl: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&auto=format&fit=crop&q=80'
    ],
    descriptionImages: [
      'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=1000&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839705.html',
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
      { color: '크림 옐로우', size: '', price: 21.00, stock: 900 },
      { color: '소프트 민트', size: '', price: 21.00, stock: 750 },
      { color: '퓨어 화이트', size: '', price: 21.00, stock: 1100 }
    ]
  },

  // --- 2. 패션잡화 / 가방 / 신발 ---
  {
    id: '804895839706',
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
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=80'
    ],
    descriptionImages: [
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1000&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839706.html',
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
      },
      {
        prop: '규격',
        values: [
          { name: '표준 규격 (28x14cm)' }
        ]
      }
    ],
    skus: [
      { color: '클래식 블랙', size: '표준 규격 (28x14cm)', price: 29.80, stock: 1500 },
      { color: '빈티지 브라운', size: '표준 규격 (28x14cm)', price: 29.80, stock: 1200 },
      { color: '버터 크림', size: '표준 규격 (28x14cm)', price: 29.80, stock: 950 }
    ]
  },
  {
    id: '804895839707',
    titleZh: '大容量干湿分离健身包男女短途旅行包防水牛津布手提包',
    titleKo: '방수 옥스포드 캔버스 보스턴백 대용량 여행가방',
    titleEn: 'Waterproof Oxford Canvas Duffle Travel Bag',
    category: 'acc',
    keywords: ['가방', '여행가방', '보스턴백', '헬스가방', '대용량', '더플백', '방수가방', '패션잡화', '旅行包', '健身包'],
    price: 32.50,
    priceFormatted: '32.50',
    minOrder: 2,
    sales: '2.4만+',
    repurchaseRate: '93%',
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80'
    ],
    descriptionImages: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=1000&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839707.html',
    company: '이우시 헝펑 여행용품 유한공사 (义乌市恒丰箱包有限公司)',
    starLevel: 4.9,
    skuProps: [
      {
        prop: '색상',
        values: [
          { name: '다크 네이비', imageUrl: '' },
          { name: '매트 블랙', imageUrl: '' },
          { name: '카키 그레이', imageUrl: '' }
        ]
      },
      {
        prop: '규격',
        values: [
          { name: '대형 (48x26x28cm)' }
        ]
      }
    ],
    skus: [
      { color: '다크 네이비', size: '대형 (48x26x28cm)', price: 32.50, stock: 800 },
      { color: '매트 블랙', size: '대형 (48x26x28cm)', price: 32.50, stock: 1200 },
      { color: '카키 그레이', size: '대형 (48x26x28cm)', price: 32.50, stock: 650 }
    ]
  },
  {
    id: '804895839708',
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
    descriptionImages: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1000&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839708.html',
    company: '푸젠성 취안저우 신발 산업 단지 직영공장 (泉州鞋业制造有限公司)',
    starLevel: 4.8,
    skuProps: [
      {
        prop: '색상',
        values: [
          { name: '블랙', imageUrl: '' },
          { name: '화이트', imageUrl: '' },
          { name: '그레이', imageUrl: '' }
        ]
      },
      {
        prop: '사이즈',
        values: [
          { name: '240mm' },
          { name: '245mm' },
          { name: '250mm' },
          { name: '255mm' },
          { name: '260mm' },
          { name: '265mm' },
          { name: '270mm' },
          { name: '275mm' },
          { name: '280mm' }
        ]
      }
    ],
    skus: [
      { color: '블랙', size: '250mm', price: 42.00, stock: 500 },
      { color: '블랙', size: '260mm', price: 42.00, stock: 500 },
      { color: '화이트', size: '250mm', price: 42.00, stock: 450 },
      { color: '화이트', size: '260mm', price: 42.00, stock: 450 },
      { color: '그레이', size: '260mm', price: 42.00, stock: 350 }
    ]
  },
  {
    id: '804895839709',
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
    descriptionImages: [
      'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=1000&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839709.html',
    company: '원저우시 진펑 가죽제품 유한공사 (温州市金丰皮具有限公司)',
    starLevel: 5.0,
    skuProps: [
      {
        prop: '버클/색상',
        values: [
          { name: '모던 실버 버클 + 블랙', imageUrl: '' },
          { name: '건메탈 블랙 버클 + 블랙', imageUrl: '' }
        ]
      },
      {
        prop: '길이',
        values: [
          { name: '110cm' },
          { name: '120cm' },
          { name: '130cm' }
        ]
      }
    ],
    skus: [
      { color: '모던 실버 버클 + 블랙', size: '120cm', price: 16.50, stock: 2000 },
      { color: '건메탈 블랙 버클 + 블랙', size: '120cm', price: 16.50, stock: 2500 }
    ]
  },
  {
    id: '804895839710',
    titleZh: '复古金属框墨镜女防紫外线uv400高级感太阳镜驾驶镜',
    titleKo: 'UV400 편광 메탈 프레임 클래식 보잉 선글라스',
    titleEn: 'UV400 Polarized Metal Frame Sunglasses',
    category: 'acc',
    keywords: ['선글라스', '안경', '보잉선글라스', '자외선차단', '패션잡화', '잡화', '여름', '太阳镜', '墨镜'],
    price: 12.80,
    priceFormatted: '12.80',
    minOrder: 5,
    sales: '3.8만+',
    repurchaseRate: '92%',
    imageUrl: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop&q=80'
    ],
    descriptionImages: [
      'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=1000&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839710.html',
    company: '타이저우 린하이 안경 제조 공업사 (台州临海眼镜制造厂)',
    starLevel: 4.9,
    skuProps: [
      {
        prop: '프레임/렌즈',
        values: [
          { name: '골드 프레임 + 블랙 렌즈', imageUrl: '' },
          { name: '실버 프레임 + 그레이 렌즈', imageUrl: '' },
          { name: '건메탈 프레임 + 브라운 렌즈', imageUrl: '' }
        ]
      }
    ],
    skus: [
      { color: '골드 프레임 + 블랙 렌즈', size: '', price: 12.80, stock: 1500 },
      { color: '실버 프레임 + 그레이 렌즈', size: '', price: 12.80, stock: 1200 }
    ]
  },

  // --- 3. 생활 / 주방용품 ---
  {
    id: '804895839711',
    titleZh: '跨境304不锈钢保温杯双层真空手提水杯大容量车载咖啡杯',
    titleKo: '304 스테인리스 이중 진공 보온 보랭 텀블러 500ml',
    titleEn: '304 Stainless Steel Vacuum Insulated Tumbler 500ml',
    category: 'living',
    keywords: ['텀블러', '보온병', '물병', '스테인리스', '커피잔', '생활용품', '주방용품', '주방', '保温杯', '水杯'],
    price: 18.50,
    priceFormatted: '18.50',
    minOrder: 2,
    sales: '6.5만+',
    repurchaseRate: '97%',
    imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80'
    ],
    descriptionImages: [
      'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=1000&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839711.html',
    company: '저장성 융캉시 하오메이 스테인리스 보온컵 공장 (永康市浩美五金制品厂)',
    starLevel: 5.0,
    skuProps: [
      {
        prop: '색상',
        values: [
          { name: '매트 블랙', imageUrl: '' },
          { name: '아이보리 화이트', imageUrl: '' },
          { name: '세이지 그린', imageUrl: '' }
        ]
      },
      {
        prop: '용량',
        values: [
          { name: '350ml' },
          { name: '500ml' },
          { name: '750ml' }
        ]
      }
    ],
    skus: [
      { color: '매트 블랙', size: '500ml', price: 18.50, stock: 3500 },
      { color: '아이보리 화이트', size: '500ml', price: 18.50, stock: 4000 },
      { color: '세이지 그린', size: '500ml', price: 18.50, stock: 2200 }
    ]
  },
  {
    id: '804895839712',
    titleZh: '食品级硅胶不粘锅专用锅铲汤勺漏勺6件套耐高温厨房厨具',
    titleKo: '친환경 내열 무독성 실리콘 조리도구 6종 세트',
    titleEn: 'Heat Resistant Food Grade Silicone Cooking Utensils Set',
    category: 'living',
    keywords: ['조리도구', '실리콘', '주방용품', '뒤집개', '국자', '주방', '생활용품', '요리', '厨具', '硅胶'],
    price: 26.00,
    priceFormatted: '26.00',
    minOrder: 2,
    sales: '2.1만+',
    repurchaseRate: '95%',
    imageUrl: 'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=800&auto=format&fit=crop&q=80'
    ],
    descriptionImages: [
      'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=1000&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839712.html',
    company: '양장시 싱다 하드웨어 주방용품 공장 (阳江市兴达五金刀剪制品厂)',
    starLevel: 4.9,
    skuProps: [
      {
        prop: '색상/소재',
        values: [
          { name: '우드 핸들 + 모던 그레이', imageUrl: '' },
          { name: '우드 핸들 + 크림 베이지', imageUrl: '' }
        ]
      },
      {
        prop: '구성',
        values: [
          { name: '6종 세트' },
          { name: '10종 풀세트' }
        ]
      }
    ],
    skus: [
      { color: '우드 핸들 + 모던 그레이', size: '6종 세트', price: 26.00, stock: 1200 },
      { color: '우드 핸들 + 크림 베이지', size: '6종 세트', price: 26.00, stock: 1500 }
    ]
  },
  {
    id: '804895839713',
    titleZh: '高硼硅耐热玻璃保鲜盒微波炉烤箱专用带盖密封便当盒8件套',
    titleKo: '내열 강화유리 4면 결착 밀폐 반찬용기 8종 세트',
    titleEn: 'Borosilicate Glass Airtight Food Storage Containers 8pcs',
    category: 'living',
    keywords: ['밀폐용기', '유리용기', '반찬통', '도시락', '글라스', '주방용품', '생활용품', '주방', '保鲜盒', '玻璃'],
    price: 35.00,
    priceFormatted: '35.00',
    minOrder: 1,
    sales: '1.7만+',
    repurchaseRate: '93%',
    imageUrl: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=800&auto=format&fit=crop&q=80'
    ],
    descriptionImages: [
      'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=1000&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839713.html',
    company: '산둥성 즈보 유리제품 제조 주식회사 (山东淄博博山玻璃制品厂)',
    starLevel: 5.0,
    skuProps: [
      {
        prop: '구성',
        values: [
          { name: '4종 기본세트' },
          { name: '8종 풀세트' }
        ]
      }
    ],
    skus: [
      { color: '클리어 유리 + 화이트 캡', size: '8종 풀세트', price: 35.00, stock: 800 }
    ]
  },
  {
    id: '804895839714',
    titleZh: '五星级酒店纯棉加厚浴巾毛巾套装吸水不掉毛家用洗澡巾',
    titleKo: '고밀도 40수 호텔식 코마사 세면 바스타올 5종 세트',
    titleEn: 'Luxury Hotel Combed Cotton Bath Towel Set 5pcs',
    category: 'living',
    keywords: ['타올', '수건', '바스타올', '호텔수건', '욕실용품', '생활용품', '순면', '毛巾', '浴巾'],
    price: 15.00,
    priceFormatted: '15.00',
    minOrder: 5,
    sales: '4.8만+',
    repurchaseRate: '98%',
    imageUrl: 'https://images.unsplash.com/photo-1616627547584-bf28cee262db?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1616627547584-bf28cee262db?w=800&auto=format&fit=crop&q=80'
    ],
    descriptionImages: [
      'https://images.unsplash.com/photo-1616627547584-bf28cee262db?w=1000&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839714.html',
    company: '장쑤성 난퉁 홈텍스타일 타올 제조공장 (南通市家纺毛巾纺织厂)',
    starLevel: 5.0,
    skuProps: [
      {
        prop: '색상',
        values: [
          { name: '호텔 화이트', imageUrl: '' },
          { name: '모던 차콜', imageUrl: '' },
          { name: '소프트 그레이', imageUrl: '' }
        ]
      },
      {
        prop: '구성',
        values: [
          { name: '3종 세트' },
          { name: '5종 세트' }
        ]
      }
    ],
    skus: [
      { color: '호텔 화이트', size: '180g (40x80cm) 5장', price: 15.00, stock: 3000 },
      { color: '모던 차콜', size: '180g (40x80cm) 5장', price: 15.00, stock: 2500 }
    ]
  },
  {
    id: '804895839715',
    titleZh: '电动咖啡磨豆机便携式小型无线usb充电陶瓷磨芯研磨机',
    titleKo: '무선 전동 세라믹 버 원두 커피 그라인더 USB 충전식',
    titleEn: 'Portable Wireless Electric Coffee Grinder USB Type-C',
    category: 'living',
    keywords: ['커피', '그라인더', '원두', '전동그라인더', '핸드드립', '주방가전', '소형가전', '주방용품', '생활용품', '磨豆机', '咖啡'],
    price: 48.00,
    priceFormatted: '48.00',
    minOrder: 2,
    sales: '1.2만+',
    repurchaseRate: '92%',
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80'
    ],
    descriptionImages: [
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=1000&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839715.html',
    company: '선전시 스마트홈 커피기기 테크놀로지 (深圳市智享小家电制造厂)',
    starLevel: 4.9,
    skuProps: [
      {
        prop: '색상',
        values: [
          { name: '매트 블랙', imageUrl: '' },
          { name: '펄 화이트', imageUrl: '' }
        ]
      },
      {
        prop: '충전방식',
        values: [
          { name: 'Type-C 충전식' },
          { name: 'USB-A 충전식' }
        ]
      }
    ],
    skus: [
      { color: '매트 블랙', size: 'Type-C 충전식', price: 48.00, stock: 900 },
      { color: '펄 화이트', size: 'Type-C 충전식', price: 48.00, stock: 650 }
    ]
  },

  // --- 4. 디지털 / 가전 ---
  {
    id: '804895839716',
    titleZh: '磁吸三合一无线充支架适用苹果15手机手表耳机快充底座',
    titleKo: '마그네틱 15W 고속 3in1 무선충전 스탠드 거치대',
    titleEn: '15W Magnetic 3-in-1 Fast Wireless Charging Station',
    category: 'digital',
    keywords: ['무선충전기', '충전기', '거치대', '맥세이프', '디지털', '스마트폰', '소형가전', '디지털가전', '无线充', '充电器'],
    price: 36.50,
    priceFormatted: '36.50',
    minOrder: 2,
    sales: '3.9만+',
    repurchaseRate: '96%',
    imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80'
    ],
    descriptionImages: [
      'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=1000&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839716.html',
    company: '선전시 롱화구 하이테크 전자공장 (深圳市龙华电子实业有限公司)',
    starLevel: 5.0,
    skuProps: [
      {
        prop: '색상',
        values: [
          { name: '스페이스 그레이', imageUrl: '' },
          { name: '퓨어 화이트', imageUrl: '' }
        ]
      },
      {
        prop: '충전출력',
        values: [
          { name: '15W 고속충전' },
          { name: '20W 초고속충전' }
        ]
      }
    ],
    skus: [
      { color: '스페이스 그레이', size: '15W 고속충전', price: 36.50, stock: 1500 },
      { color: '퓨어 화이트', size: '15W 고속충전', price: 36.50, stock: 2000 }
    ]
  },
  {
    id: '804895839717',
    titleZh: '20000毫安自带线充电宝超级快充22.5w大容量移动电源便携',
    titleKo: '20000mAh 22.5W PD 초고속 충전 대용량 보조배터리',
    titleEn: '20000mAh 22.5W Fast Charging Power Bank Built-in Cables',
    category: 'digital',
    keywords: ['보조배터리', '배터리', '대용량', '고속충전', '파워뱅크', '디지털', '스마트폰', '가전', '充电宝', '移动电源'],
    price: 41.00,
    priceFormatted: '41.00',
    minOrder: 2,
    sales: '4.5만+',
    repurchaseRate: '95%',
    imageUrl: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800&auto=format&fit=crop&q=80'
    ],
    descriptionImages: [
      'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=1000&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839717.html',
    company: '둥관시 보신 에너지 테크놀로지 (东莞市博信能源科技有限公司)',
    starLevel: 5.0,
    skuProps: [
      {
        prop: '색상',
        values: [
          { name: '매트 블랙', imageUrl: '' },
          { name: '펄 화이트', imageUrl: '' }
        ]
      },
      {
        prop: '용량',
        values: [
          { name: '10000mAh' },
          { name: '20000mAh' },
          { name: '30000mAh' }
        ]
      }
    ],
    skus: [
      { color: '매트 블랙 (4라인 일체형)', size: '20000mAh', price: 41.00, stock: 2800 },
      { color: '펄 화이트 (4라인 일체형)', size: '20000mAh', price: 41.00, stock: 2100 }
    ]
  },
  {
    id: '804895839718',
    titleZh: '无线蓝牙耳机5.3主动降噪enc入耳式超长续航运动游戏耳机',
    titleKo: '블루투스 5.3 ANC 액티브 노이즈캔슬링 무선 이어폰',
    titleEn: 'Bluetooth 5.3 ANC Active Noise Cancelling Earbuds',
    category: 'digital',
    keywords: ['이어폰', '무선이어폰', '블루투스', '노이즈캔슬링', '음향기기', '디지털', '스마트폰', '가전', '蓝牙耳机', '耳机'],
    price: 55.00,
    priceFormatted: '55.00',
    minOrder: 2,
    sales: '2.7만+',
    repurchaseRate: '93%',
    imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80'
    ],
    descriptionImages: [
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=1000&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839718.html',
    company: '선전시 바오안구 오디오 음향 테크 (深圳市声悦声学科技有限公司)',
    starLevel: 4.9,
    skuProps: [
      {
        prop: '색상',
        values: [
          { name: '매트 블랙', imageUrl: '' },
          { name: '퓨어 화이트', imageUrl: '' }
        ]
      },
      {
        prop: '기능',
        values: [
          { name: 'ANC 듀얼 마이크' },
          { name: 'ANC + 공간음향' }
        ]
      }
    ],
    skus: [
      { color: '매트 블랙', size: 'ANC 듀얼 마이크', price: 55.00, stock: 1200 },
      { color: '퓨어 화이트', size: 'ANC 듀얼 마이크', price: 55.00, stock: 1600 }
    ]
  },
  {
    id: '804895839719',
    titleZh: '桌面小型静音风扇usb可充电办公室学生宿舍台式摇头电风扇',
    titleKo: '탁상용 무소음 3D 입체회전 미니 에어 서큘레이터 2000mAh',
    titleEn: 'Desk Quiet USB Rechargeable Mini Air Circulator Fan',
    category: 'digital',
    keywords: ['선풍기', '미니선풍기', '탁상용선풍기', '서큘레이터', '소형가전', '여름', '가전', '디지털', '风扇', '电风扇'],
    price: 31.00,
    priceFormatted: '31.00',
    minOrder: 2,
    sales: '5.8만+',
    repurchaseRate: '97%',
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'
    ],
    descriptionImages: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1000&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839719.html',
    company: '닝보 츠시 소형가전 제조공장 (宁波慈溪市小家电制造厂)',
    starLevel: 5.0,
    skuProps: [
      {
        prop: '색상',
        values: [
          { name: '아이보리 화이트', imageUrl: '' },
          { name: '다크 그린', imageUrl: '' },
          { name: '핑크 베이지', imageUrl: '' }
        ]
      },
      {
        prop: '기능',
        values: [
          { name: '3단 풍속 + 자동회전' },
          { name: '5단 풍속 + 자동회전 + 타이머' }
        ]
      }
    ],
    skus: [
      { color: '아이보리 화이트', size: '3단 풍속 + 자동회전', price: 31.00, stock: 3500 },
      { color: '다크 그린', size: '3단 풍속 + 자동회전', price: 31.00, stock: 2200 }
    ]
  },
  {
    id: '804895839720',
    titleZh: '适用苹果手表表带iwatch钛金属米兰尼斯磁吸表带s9/8/ultra',
    titleKo: '스마트워치 티타늄 메탈 링크 마그네틱 루프 스트랩',
    titleEn: 'Smartwatch Titanium Magnetic Metal Loop Strap',
    category: 'digital',
    keywords: ['스트랩', '워치스트랩', '스마트워치', '애플워치', '메탈스트랩', '디지털', '잡화', '액세서리', '表带', '手表'],
    price: 9.80,
    priceFormatted: '9.80',
    minOrder: 10,
    sales: '8.4만+',
    repurchaseRate: '98%',
    imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&auto=format&fit=crop&q=80'
    ],
    descriptionImages: [
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1000&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839720.html',
    company: '선전시 징위안 정밀 금형 테크 (深圳市晶源精密五金厂)',
    starLevel: 5.0,
    skuProps: [
      {
        prop: '색상',
        values: [
          { name: '티타늄 실버', imageUrl: '' },
          { name: '스페이스 블랙', imageUrl: '' },
          { name: '로즈 골드', imageUrl: '' }
        ]
      },
      {
        prop: '케이스 사이즈',
        values: [
          { name: '38/40/41mm' },
          { name: '42/44/45/49mm' }
        ]
      }
    ],
    skus: [
      { color: '티타늄 실버', size: '42/44/45/49mm', price: 9.80, stock: 5000 },
      { color: '스페이스 블랙', size: '42/44/45/49mm', price: 9.80, stock: 4500 }
    ]
  },

  // --- 5. 캠핑 / 레저 ---
  {
    id: '804895839721',
    titleZh: '户外折叠椅子露营超轻便携克米特椅便携钓鱼椅月亮椅',
    titleKo: '초경량 접이식 알루미늄 캠핑 릴렉스 체어 1+1',
    titleEn: 'Ultralight Foldable Aluminum Camping Relax Chair',
    category: 'camping',
    keywords: ['캠핑', '캠핑의자', '의자', '접이식의자', '릴렉스체어', '캠핑용품', '레저', '야외', '折叠椅', '露营'],
    price: 35.00,
    priceFormatted: '35.00',
    minOrder: 2,
    sales: '3.3만+',
    repurchaseRate: '96%',
    imageUrl: 'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?w=800&auto=format&fit=crop&q=80'
    ],
    descriptionImages: [
      'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?w=1000&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839721.html',
    company: '저장성 융캉시 아웃도어 캠핑용품 공장 (浙江永康市户外露营用品厂)',
    starLevel: 5.0,
    skuProps: [
      {
        prop: '색상/스타일',
        values: [
          { name: '밀리터리 카키', imageUrl: 'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?w=100&auto=format&fit=crop&q=80' },
          { name: '매트 블랙', imageUrl: '' },
          { name: '네이비 블루', imageUrl: '' }
        ]
      },
      {
        prop: '규격',
        values: [
          { name: '기본형 (단품)' },
          { name: '고급형 (수납가방+컵홀더 포함)' }
        ]
      }
    ],
    skus: [
      { color: '밀리터리 카키', size: '기본형 (단품)', price: 35.00, stock: 1800 },
      { color: '밀리터리 카키', size: '고급형 (수납가방+컵홀더 포함)', price: 42.00, stock: 900 },
      { color: '매트 블랙', size: '기본형 (단품)', price: 35.00, stock: 1500 },
      { color: '매트 블랙', size: '고급형 (수납가방+컵홀더 포함)', price: 42.00, stock: 750 },
      { color: '네이비 블루', size: '기본형 (단품)', price: 35.00, stock: 800 }
    ]
  },
  {
    id: '804895839722',
    titleZh: '复古露营灯led户外帐篷应急马灯充电式氛围野营营地灯',
    titleKo: '감성 캠핑 방수 LED 충전식 무드 랜턴 조명',
    titleEn: 'Vintage LED Rechargeable Camping Tent Lantern',
    category: 'camping',
    keywords: ['랜턴', '캠핑랜턴', '조명', '감성캠핑', '무드등', '캠핑용품', '레저', '露营灯', '马灯'],
    price: 23.50,
    priceFormatted: '23.50',
    minOrder: 2,
    sales: '2.9만+',
    repurchaseRate: '94%',
    imageUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&auto=format&fit=crop&q=80'
    ],
    descriptionImages: [
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=1000&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839722.html',
    company: '닝보시 닝하이 조명 전자기기 공업사 (宁波宁海照明电子厂)',
    starLevel: 4.9,
    skuProps: [
      {
        prop: '색상',
        values: [
          { name: '브론즈 골드', imageUrl: '' },
          { name: '올리브 그린', imageUrl: '' },
          { name: '앤틱 실버', imageUrl: '' }
        ]
      },
      {
        prop: '배터리',
        values: [
          { name: '2000mAh (USB-C 충전)' },
          { name: '5000mAh (USB-C 고속충전)' }
        ]
      }
    ],
    skus: [
      { color: '브론즈 골드', size: '2000mAh 배터리', price: 23.50, stock: 1200 },
      { color: '올리브 그린', size: '2000mAh 배터리', price: 23.50, stock: 950 }
    ]
  },
  {
    id: '804895839723',
    titleZh: '全自动帐篷户外3-4人速开液压露营双层防暴雨野营帐篷',
    titleKo: '초고속 자동 팝업 원터치 그늘막 캠핑 텐트 3-4인용',
    titleEn: 'Automatic Pop-up Waterproof 3-4 Person Camping Tent',
    category: 'camping',
    keywords: ['텐트', '캠핑텐트', '원터치텐트', '그늘막', '캠핑용품', '레저', '帐篷', '露营'],
    price: 68.00,
    priceFormatted: '68.00',
    minOrder: 1,
    sales: '1.5만+',
    repurchaseRate: '91%',
    imageUrl: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=800&auto=format&fit=crop&q=80'
    ],
    descriptionImages: [
      'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=1000&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839723.html',
    company: '사오싱시 상위 텐트 야외레저 용품사 (绍兴上虞户外旅游用品厂)',
    starLevel: 4.8,
    skuProps: [
      {
        prop: '색상',
        values: [
          { name: '포레스트 그린', imageUrl: '' },
          { name: '샌드 베이지', imageUrl: '' }
        ]
      },
      {
        prop: '인원/규격',
        values: [
          { name: '2인용 (185x120x105cm)' },
          { name: '3-4인용 (215x215x142cm)' }
        ]
      }
    ],
    skus: [
      { color: '포레스트 그린', size: '3-4인용 (215x215x142cm)', price: 68.00, stock: 650 },
      { color: '샌드 베이지', size: '3-4인용 (215x215x142cm)', price: 68.00, stock: 800 }
    ]
  },
  {
    id: '804895839724',
    titleZh: '加厚防滑tpe瑜伽垫男女初学者加宽健身垫地垫隔音',
    titleKo: '논슬립 TPE 친환경 홈트레이닝 요가매트 10mm',
    titleEn: 'Non-Slip Eco-Friendly TPE Yoga Mat 10mm',
    category: 'camping',
    keywords: ['요가매트', '홈트레이닝', '매트', '피트니스', '운동용품', '레저', '스포츠', '瑜伽垫', '健身'],
    price: 17.50,
    priceFormatted: '17.50',
    minOrder: 5,
    sales: '4.1만+',
    repurchaseRate: '95%',
    imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&auto=format&fit=crop&q=80'
    ],
    descriptionImages: [
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1000&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839724.html',
    company: '장쑤성 양저우 체육 스포츠 피트니스 공장 (扬州市体育用品制造厂)',
    starLevel: 5.0,
    skuProps: [
      {
        prop: '색상',
        values: [
          { name: '더블 핑크/바이올렛', imageUrl: '' },
          { name: '다크 블루/스카이', imageUrl: '' },
          { name: '블랙/그레이', imageUrl: '' }
        ]
      },
      {
        prop: '두께',
        values: [
          { name: '6mm (경량형)' },
          { name: '10mm (표준형)' },
          { name: '15mm (두꺼운형)' }
        ]
      }
    ],
    skus: [
      { color: '더블 핑크/바이올렛', size: '183x61x1cm', price: 17.50, stock: 2500 },
      { color: '다크 블루/스카이', size: '183x61x1cm', price: 17.50, stock: 2000 }
    ]
  },
  {
    id: '804895839725',
    titleZh: '纯钛户外套锅野营餐具便携轻量化钛碗钛锅野炊炊具套装',
    titleKo: '티타늄 초경량 캠핑 코펠 냄비 프라이팬 3종 세트',
    titleEn: 'Pure Titanium Ultralight Camping Cookware Set 3pcs',
    category: 'camping',
    keywords: ['코펠', '캠핑식기', '티타늄', '캠핑용품', '레저', '주방', '야외', '炊具', '钛锅'],
    price: 52.00,
    priceFormatted: '52.00',
    minOrder: 2,
    sales: '1.1만+',
    repurchaseRate: '93%',
    imageUrl: 'https://images.unsplash.com/photo-1525803377221-4f6ccdaa5133?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1525803377221-4f6ccdaa5133?w=800&auto=format&fit=crop&q=80'
    ],
    descriptionImages: [
      'https://images.unsplash.com/photo-1525803377221-4f6ccdaa5133?w=1000&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839725.html',
    company: '저장성 진화시 아웃도어 정밀 금속사 (金华市户外精工金属制品厂)',
    starLevel: 4.9,
    skuProps: [
      {
        prop: '구성',
        values: [
          { name: '3종 기본세트 (냄비+프라이팬+뚜껑)' },
          { name: '5종 풀세트 (매쉬백 포함)' }
        ]
      }
    ],
    skus: [
      { color: '티타늄 그레이', size: '3종 풀세트 (매쉬백 포함)', price: 52.00, stock: 750 }
    ]
  },

  // --- 6. 뷰티 / 반려동물 ---
  {
    id: '804895839726',
    titleZh: '低噪音宠物电推剪充电式猫咪狗狗剃毛器脚毛修毛推子',
    titleKo: '저소음 충전식 반려동물 전동 이발기 클리퍼 세트',
    titleEn: 'Low Noise Rechargeable Pet Grooming Clipper Kit',
    category: 'beauty',
    keywords: ['반려동물', '이발기', '클리퍼', '바리깡', '강아지', '고양이', '펫용품', '뷰티', '宠物', '剃毛器'],
    price: 28.00,
    priceFormatted: '28.00',
    minOrder: 2,
    sales: '3.5만+',
    repurchaseRate: '96%',
    imageUrl: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=800&auto=format&fit=crop&q=80'
    ],
    descriptionImages: [
      'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=1000&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839726.html',
    company: '원저우시 펫 테크놀로지 전기공학 공장 (温州市爱宠电器有限公司)',
    starLevel: 5.0,
    skuProps: [
      {
        prop: '색상/날',
        values: [
          { name: '로즈 골드 + 세라믹 날', imageUrl: '' },
          { name: '매트 실버 + 세라믹 날', imageUrl: '' }
        ]
      },
      {
        prop: '구성',
        values: [
          { name: '기본 4종 빗캡 세트' },
          { name: '풀 8종 프리미엄 세트' }
        ]
      }
    ],
    skus: [
      { color: '로즈 골드 + 세라믹 날', size: '기본 4종 빗캡 세트', price: 28.00, stock: 1600 },
      { color: '매트 실버 + 세라믹 날', size: '기본 4종 빗캡 세트', price: 28.00, stock: 1200 }
    ]
  },
  {
    id: '804895839727',
    titleZh: '实木猫爬架猫抓板一体式耐磨剑麻猫窝猫树猫玩具',
    titleKo: '고양이 원목 볼 스크래쳐 하우스 캣타워',
    titleEn: 'Solid Wood Cat Scratching Post Tree House',
    category: 'beauty',
    keywords: ['캣타워', '스크래쳐', '고양이', '반려동물', '펫용품', '가구', '인테리어', '猫爬架', '猫抓板'],
    price: 45.00,
    priceFormatted: '45.00',
    minOrder: 1,
    sales: '1.8만+',
    repurchaseRate: '94%',
    imageUrl: 'https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=800&auto=format&fit=crop&q=80'
    ],
    descriptionImages: [
      'https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=1000&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839727.html',
    company: '이우시 펫러브 목공 공예품 공장 (义乌市爱宠木业工艺品厂)',
    starLevel: 4.9,
    skuProps: [
      {
        prop: '소재/색상',
        values: [
          { name: '내추럴 원목 + 사이잘삼', imageUrl: '' },
          { name: '그레이 원목 + 사이잘삼', imageUrl: '' }
        ]
      },
      {
        prop: '규격',
        values: [
          { name: '소형 (높이 50cm)' },
          { name: '중형 (높이 75cm)' },
          { name: '대형 (높이 100cm)' }
        ]
      }
    ],
    skus: [
      { color: '내추럴 원목 + 사이잘삼', size: '중형 (높이 75cm)', price: 45.00, stock: 850 }
    ]
  },
  {
    id: '804895839728',
    titleZh: '无线感应宠物饮水机猫咪自动循环过滤饮水器不锈钢静音',
    titleKo: '무선 스테인리스 자동 순환 고양이 강아지 정수기 2.5L',
    titleEn: 'Wireless Automatic Stainless Steel Pet Water Fountain 2.5L',
    category: 'beauty',
    keywords: ['정수기', '급수기', '고양이', '강아지', '반려동물', '펫용품', '음수대', '饮水机', '宠物'],
    price: 34.50,
    priceFormatted: '34.50',
    minOrder: 2,
    sales: '2.3만+',
    repurchaseRate: '95%',
    imageUrl: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&auto=format&fit=crop&q=80'
    ],
    descriptionImages: [
      'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=1000&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839728.html',
    company: '포산시 펫 스마트 전자 디바이스 제조사 (佛山市宠智电器实业有限公司)',
    starLevel: 5.0,
    skuProps: [
      {
        prop: '소재/색상',
        values: [
          { name: '304 스테인리스 + 화이트', imageUrl: '' },
          { name: '304 스테인리스 + 그레이', imageUrl: '' }
        ]
      },
      {
        prop: '용량',
        values: [
          { name: '1.5L (소형)' },
          { name: '2.5L (대용량)' }
        ]
      }
    ],
    skus: [
      { color: '304 스테인리스 + 화이트', size: '2.5L 대용량', price: 34.50, stock: 1400 }
    ]
  },

  // --- 7. 인테리어 / 문구 ---
  {
    id: '804895839729',
    titleZh: '现代简约实木静音挂钟客厅创意led数字时钟温度显示',
    titleKo: '모던 원목 무소음 LED 디지털 벽시계 온도표시',
    titleEn: 'Modern Wooden Silent LED Digital Wall Clock',
    category: 'interior',
    keywords: ['시계', '벽시계', 'LED시계', '디지털시계', '인테리어', '홈데코', '문구', '挂钟', '时钟'],
    price: 27.00,
    priceFormatted: '27.00',
    minOrder: 2,
    sales: '3.1만+',
    repurchaseRate: '96%',
    imageUrl: 'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=800&auto=format&fit=crop&q=80'
    ],
    descriptionImages: [
      'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=1000&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839729.html',
    company: '장저우시 시계 정밀공예품 제조공장 (漳州市钟表精密工艺制品厂)',
    starLevel: 5.0,
    skuProps: [
      {
        prop: '색상/소재',
        values: [
          { name: '내추럴 우드', imageUrl: '' },
          { name: '월넛 다크브라운', imageUrl: '' },
          { name: '블랙 알루미늄', imageUrl: '' }
        ]
      },
      {
        prop: '사이즈',
        values: [
          { name: '직경 25cm' },
          { name: '직경 30cm' },
          { name: '직경 40cm' }
        ]
      }
    ],
    skus: [
      { color: '내추럴 우드', size: '직경 30cm', price: 27.00, stock: 1100 },
      { color: '월넛 다크브라운', size: '직경 30cm', price: 27.00, stock: 950 }
    ]
  },
  {
    id: '804895839730',
    titleZh: '360度旋转亚克力化妆品收纳盒桌面大容量护肤品口红整理架',
    titleKo: '360도 회전식 아크릴 화장품 데스크 오거나이저',
    titleEn: '360 Rotating Acrylic Makeup & Desk Organizer',
    category: 'interior',
    keywords: ['오거나이저', '정리함', '수납함', '화장품정리', '데스크테리어', '인테리어', '문구', '收纳盒', '整理架'],
    price: 19.50,
    priceFormatted: '19.50',
    minOrder: 2,
    sales: '4.6만+',
    repurchaseRate: '97%',
    imageUrl: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=80'
    ],
    descriptionImages: [
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=1000&auto=format&fit=crop&q=80'
    ],
    detailUrl: 'https://detail.1688.com/offer/804895839730.html',
    company: '이우시 투명 아크릴 가정용품 제조창 (义乌市晶美亚克力制品厂)',
    starLevel: 5.0,
    skuProps: [
      {
        prop: '색상',
        values: [
          { name: '다이아몬드 크리스탈 클리어', imageUrl: '' },
          { name: '스모크 블랙', imageUrl: '' },
          { name: '밀키 핑크', imageUrl: '' }
        ]
      },
      {
        prop: '규격',
        values: [
          { name: '소형 (23x18cm)' },
          { name: '대형 (33x23cm)' }
        ]
      }
    ],
    skus: [
      { color: '다이아몬드 크리스탈 클리어', size: '대형 (33x23cm)', price: 19.50, stock: 2400 },
      { color: '스모크 블랙', size: '대형 (33x23cm)', price: 19.50, stock: 1500 }
    ]
  }
];

/**
 * 키워드 및 정렬/페이지네이션 기반 지능형 Mock 검색 함수
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
        if (titleKo.includes(token)) score += 10;
        if (keywords.some(k => k.includes(token))) score += 8;
        if (titleZh.includes(token)) score += 6;
        if (titleEn.includes(token)) score += 5;
        if (category === token) score += 12;
      }

      return { prod, score };
    });

    const filtered = scored.filter(s => s.score > 0);

    if (filtered.length > 0) {
      filtered.sort((a, b) => b.score - a.score);
      matched = filtered.map(s => s.prod);
    } else {
      // 매칭되는 토큰이 없을 경우 전체 데이터 반환 (UI 빈 화면 방지)
      matched = [...MOCK_1688_PRODUCTS];
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

  // 항목 객체 정규화 - skuProps 포함하여 전달
  const items = paginatedItems.map(item => ({
    id: String(item.id),
    titleZh: item.titleZh,
    titleEn: item.titleEn,
    titleKo: item.titleKo,
    price: item.price,
    priceFormatted: item.priceFormatted,
    minOrder: item.minOrder,
    sales: item.sales,
    imageUrl: item.imageUrl,
    detailUrl: item.detailUrl,
    repurchaseRate: item.repurchaseRate,
    company: item.company,
    starLevel: item.starLevel,
    skuProps: item.skuProps || [],   // ← 핵심: skuProps 반드시 포함
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
      raw: found
    };
  }

  // 데이터셋에 없는 ID일 경우: 임의 옵션을 복제하지 않고 순수 단품 상태로 반환
  const first = MOCK_1688_PRODUCTS[0];
  return {
    ...first,
    id: idStr || '804895839799',
    titleKo: `1688 수입 상품 (ID: ${idStr || '804895839799'})`,
    titleZh: `1688商品 (${idStr})`,
    detailUrl: `https://detail.1688.com/offer/${idStr || '804895839799'}.html`,
    skuProps: [],
    skus: [],
    raw: {}
  };
}
