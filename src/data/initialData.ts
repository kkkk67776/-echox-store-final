import { Product, Company, Order, OwnerSettings, SiteSettings } from '../types';

export const INITIAL_COMPANIES: Company[] = [
  {
    id: 'comp_echox',
    name: 'ECHOX Distribution Tunisie',
    logo: '/assets/images/echox-logo.webp',
    phone: '+216 21 511 162',
    email: 'abdelkaderbahri570@gmail.com',
    address: 'المركب التكنولوجي الغزالة، تونس',
    governorate: 'ariana',
    description: {
      ar: 'الموزع الرسمي لقطع وأجهزة ECHOX المعتمدة في تونس والمغرب العربي.',
      fr: 'Distributeur officiel des équipements et composants certifiés ECHOX en Tunisie.',
      en: 'Official distributor of certified ECHOX hardware & equipment in Tunisia.'
    },
    website: 'https://echoxstore.tn'
  },
  {
    id: 'comp_atlas',
    name: 'Atlas Mécanique & Pièces Sfax',
    logo: '/assets/images/echox-logo.webp',
    phone: '+216 74 200 450',
    email: 'contact@atlas-mecanique.tn',
    address: 'طريق قابس كلم 3، صفاقس',
    governorate: 'sfax',
    description: {
      ar: 'شركة رائدة في توريد وتوزيع قطع غيار السيارات والشاحنات الأصلية.',
      fr: 'Spécialiste de la distribution de pièces détachées automobiles d’origine.',
      en: 'Leading automotive genuine spare parts distributor in Central & South Tunisia.'
    }
  },
  {
    id: 'comp_med_elec',
    name: 'Méditerranée Électronique & Mesure',
    logo: '/assets/images/echox-logo.webp',
    phone: '+216 73 344 112',
    email: 'info@med-elec.tn',
    address: 'شارع الحبيب بورقيبة، سوسة',
    governorate: 'sousse',
    description: {
      ar: 'وكيل معتمد لأجهزة القياس والمعدات الكهربائية الصناعية ذات الدقة العالية.',
      fr: 'Agent agréé en instruments de mesure et outillage électronique de précision.',
      en: 'Authorized distributor of precision test instruments and industrial electronics.'
    }
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod_titan_drill',
    name: {
      ar: 'مثقاب احترافي لاسلكي TITAN HD 20V بدون فحمات مع بطاريتين',
      fr: 'Perceuse Visseuse Sans Fil TITAN HD 20V Brushless + 2 Batteries',
      en: 'TITAN HD 20V Max Brushless Heavy-Duty Cordless Drill Kit'
    },
    description: {
      ar: 'مثقاب ميكانيكي عالي العزم بقوة 20 فولت محرك Brushless لا يحتاج صيانة، يأتي مع بطاريتين ليثيوم 4.0Ah وشاحن فائق السرعة وحقيبة نقل متينة. مناسب للورشات والأشغال الشاقة.',
      fr: 'Perceuse industrielle 20V avec moteur Brushless à haut rendement. Fournie avec deux batteries Li-Ion 4.0Ah, chargeur rapide et mallette renforcée antichoc.',
      en: 'Industrial-grade 20V brushless motor drill with two 4.0Ah high-capacity lithium batteries, fast charger, and heavy-duty case.'
    },
    category: 'power_tools',
    price: 345.000,
    originalPrice: 420.000,
    stock: 14,
    companyId: 'comp_echox',
    companyName: 'ECHOX Distribution Tunisie',
    governorate: 'tunis',
    images: [
      '/assets/images/product_drill_cordless_pro.webp',
      '/assets/images/hero_echox_tunisia_store.webp'
    ],
    featured: true,
    active: true,
    deliveryTimeDays: 1,
    rating: 4.9,
    reviewCount: 38,
    reviews: [
      {
        id: 'rev_1',
        authorName: 'طارق الماجري (سوسة)',
        rating: 5,
        comment: 'ماكينة ممتازة وعزم جبار، وصلتني في أقل من 24 ساعة لورشتي بسوسة والدفع عند الاستلام.',
        date: '2026-10-24',
        verifiedPurchase: true
      },
      {
        id: 'rev_2',
        authorName: 'سامي بن خليل (صفاقس)',
        rating: 5,
        comment: 'بطارية تدوم يوماً كاملاً في العمل المستمر، أفضل بكثير من المقلد بالسوق.',
        date: '2026-10-18',
        verifiedPurchase: true
      }
    ],
    specs: [
      { key: { ar: 'الجهد الكهربائي', fr: 'Tension', en: 'Voltage' }, value: { ar: '20 فولت MAX', fr: '20V Max Li-ion', en: '20V Max Li-ion' } },
      { key: { ar: 'نوع المحرك', fr: 'Type Moteur', en: 'Motor Type' }, value: { ar: 'بدون فحمات (Brushless)', fr: 'Moteur Brushless sans balais', en: 'Brushless High Torque' } },
      { key: { ar: 'الضمان في تونس', fr: 'Garantie', en: 'Warranty' }, value: { ar: 'سنتان ضمان رسمي كامل', fr: '2 ans de garantie constructeur', en: '2 Years Manufacturer Warranty' } }
    ]
  },
  {
    id: 'prod_aether_headlight',
    name: {
      ar: 'وحدة مصباح أمامي Matrix LED كريستال لسيارات مرسيدس وبي إم دبليو',
      fr: 'Bloc Optique Phare Matrix LED Cristal Haute Performance',
      en: 'AETHER Crystal Matrix Adaptive LED Projector Headlight Assembly'
    },
    description: {
      ar: 'كتلة مصباح أمامي متكيفة بتقنية Crystal Matrix LED مع عدسات دقيقة لإضاءة فائقة الوضوح ومقاومة لتغيرات الطقس. قطعة أصلية جاهزة للتركيب المباشر مع ترقيم تسلسلي أصلي.',
      fr: 'Optique de phare avant adaptative Full LED avec lentilles en cristal haute transparence. Remplacement direct homologué OEM avec étanchéité IP68.',
      en: 'Original specification adaptive Crystal Matrix Full LED headlight assembly with precision optical lenses and IP68 waterproof housing.'
    },
    category: 'auto_parts',
    price: 680.000,
    originalPrice: 790.000,
    stock: 6,
    companyId: 'comp_atlas',
    companyName: 'Atlas Mécanique & Pièces Sfax',
    governorate: 'sfax',
    images: [
      '/assets/images/product_automotive_headlight.webp'
    ],
    featured: true,
    active: true,
    deliveryTimeDays: 2,
    rating: 4.8,
    reviewCount: 19,
    reviews: [
      {
        id: 'rev_3',
        authorName: 'أمين الدغسني (أريانة)',
        rating: 5,
        comment: 'قطعة مطابقة للأصلية 100% مع الباركود والختم الرسمي، إضاءة قوية ونقية جداً.',
        date: '2026-10-30',
        verifiedPurchase: true
      }
    ],
    specs: [
      { key: { ar: 'تقنية الإضاءة', fr: 'Technologie', en: 'Lighting Tech' }, value: { ar: 'Matrix LED متكيفة', fr: 'Matrix LED adaptative', en: 'Adaptive Matrix LED' } },
      { key: { ar: 'مقاومة الماء', fr: 'Étanchéité', en: 'Waterproof' }, value: { ar: 'IP68 مع حماية مضادة للضباب', fr: 'Norme IP68 antibuée', en: 'IP68 Anti-fog' } }
    ]
  },
  {
    id: 'prod_fluke_multimeter',
    name: {
      ar: 'جهاز ملتيميتر صناعي دقيق FLUKE 87V مقياس RMS الحقيقي للأجهزة والكهرباء',
      fr: 'Multimètre Industriel Numérique True-RMS FLUKE 87V Max',
      en: 'FLUKE 87V Max Industrial Digital True-RMS Multimeter'
    },
    description: {
      ar: 'الجهاز المرجعي عالمياً لقياس الفولت والأمبير والتردد والمقاومة بدقة متناهية حتى في البيئات الصناعية القاسية ذات الترددات المتغيرة (VFDs). معتمد ومقاوم للصدمات والماء.',
      fr: 'Le standard mondial des techniciens et ingénieurs. Mesures True-RMS précises avec filtre passe-bas pour entraînements à fréquence variable.',
      en: 'The industry benchmark for electrical troubleshooting with True-RMS AC voltage and current for accurate measurements on non-linear signals.'
    },
    category: 'electronics',
    price: 520.000,
    originalPrice: 590.000,
    stock: 8,
    companyId: 'comp_med_elec',
    companyName: 'Méditerranée Électronique & Mesure',
    governorate: 'sousse',
    images: [
      '/assets/images/product_digital_multimeter.webp'
    ],
    featured: true,
    active: true,
    deliveryTimeDays: 1,
    rating: 5.0,
    reviewCount: 42,
    reviews: [
      {
        id: 'rev_4',
        authorName: 'المهندس كريم التونسي (بن عروس)',
        rating: 5,
        comment: 'جهاز قياس حقيقي واحترافي من الموزع المعتمد، شهادة المعايرة مرفقة.',
        date: '2026-11-01',
        verifiedPurchase: true
      }
    ],
    specs: [
      { key: { ar: 'الدقة', fr: 'Précision', en: 'Accuracy' }, value: { ar: '0.05% دقة قياس الجهد المستمر', fr: '0.05% de précision DC', en: '0.05% DC Accuracy' } },
      { key: { ar: 'المطابقة الصناعية', fr: 'Sécurité', en: 'Safety Rating' }, value: { ar: 'CAT IV 600V / CAT III 1000V', fr: 'CAT IV 600V / CAT III 1000V', en: 'CAT IV 600V / CAT III 1000V' } }
    ]
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord_101',
    trackingNumber: 'ECH-TN-981240',
    customerName: 'محمد الهادي الطرابلسي',
    customerEmail: 'mohamed.trabelsi@gmail.com',
    customerPhone: '+216 98 443 210',
    shippingAddress: {
      id: 'addr_1',
      isDefault: true,
      fullName: 'محمد الهادي الطرابلسي',
      phone: '+216 98 443 210',
      governorate: 'tunis',
      city: 'المرسى',
      postalCode: '2070',
      street: 'نهج الهادي نويرة، إقامة الياسمين عمارة ب شقة 4',
      notes: 'يرجى الاتصال قبل الوصول بـ 30 دقيقة'
    },
    items: [
      {
        productId: 'prod_titan_drill',
        productName: {
          ar: 'مثقاب احترافي لاسلكي TITAN HD 20V بدون فحمات',
          fr: 'Perceuse Visseuse Sans Fil TITAN HD 20V Brushless',
          en: 'TITAN HD 20V Max Brushless Heavy-Duty Drill'
        },
        productImage: '/assets/images/product_drill_cordless_pro.webp',
        unitPrice: 345.000,
        quantity: 1,
        totalPrice: 345.000
      }
    ],
    subtotal: 345.000,
    discount: 0,
    shippingFee: 0, // Free over 150 DT
    totalAmount: 345.000,
    status: 'out_for_delivery',
    paymentMethod: 'cod',
    paymentStatus: 'pending',
    carrierName: 'Aramex Tunisie Express',
    createdAt: '2026-11-05T14:30:00Z',
    updatedAt: '2026-11-06T08:15:00Z',
    notes: 'تم التأكيد الهاتفي مع الحريف وخرج مع الساعي سفيان',
    statusHistory: [
      { status: 'new', timestamp: '2026-11-05T14:30:00Z', note: 'تسجيل الطلب بالمتجر' },
      { status: 'under_confirmation', timestamp: '2026-11-05T15:10:00Z', note: 'تأكيد الطلب هاتفياً من إدارة المتجر' },
      { status: 'preparing', timestamp: '2026-11-05T17:00:00Z', note: 'تغليف الطرد وإرفاق شهادة الضمان والفاتورة' },
      { status: 'out_for_delivery', timestamp: '2026-11-06T08:15:00Z', note: 'تسليم الطرد لساعي Aramex للتوصيل لباب المنزل بالمرسى' }
    ]
  },
  {
    id: 'ord_102',
    trackingNumber: 'ECH-TN-872341',
    customerName: 'فوزي السعيدي',
    customerEmail: 'faouzi.saidi@gmail.com',
    customerPhone: '+216 22 901 887',
    shippingAddress: {
      id: 'addr_2',
      isDefault: true,
      fullName: 'فوزي السعيدي',
      phone: '+216 22 901 887',
      governorate: 'sfax',
      city: 'صفاقس الغربية',
      postalCode: '3000',
      street: 'طريق المهدية كلم 2.5 بالقرب من صيدلية النور',
      notes: 'التسليم في الورشة من 8 صباحاً إلى 6 مساءً'
    },
    items: [
      {
        productId: 'prod_fluke_multimeter',
        productName: {
          ar: 'جهاز ملتيميتر صناعي دقيق FLUKE 87V مقياس RMS الحقيقي',
          fr: 'Multimètre Industriel Numérique True-RMS FLUKE 87V Max',
          en: 'FLUKE 87V Max Industrial Digital True-RMS Multimeter'
        },
        productImage: '/assets/images/product_digital_multimeter.webp',
        unitPrice: 520.000,
        quantity: 1,
        totalPrice: 520.000
      }
    ],
    subtotal: 520.000,
    discount: 52.000, // 10% coupon
    shippingFee: 0,
    totalAmount: 468.000,
    status: 'delivered',
    paymentMethod: 'cod',
    paymentStatus: 'paid',
    carrierName: 'LivriTN Logistics',
    createdAt: '2026-11-03T11:00:00Z',
    updatedAt: '2026-11-04T16:20:00Z',
    notes: 'تم استلام المبلغ نقداً وإيداعه بالحساب',
    statusHistory: [
      { status: 'new', timestamp: '2026-11-03T11:00:00Z' },
      { status: 'under_confirmation', timestamp: '2026-11-03T11:30:00Z' },
      { status: 'preparing', timestamp: '2026-11-03T14:00:00Z' },
      { status: 'out_for_delivery', timestamp: '2026-11-04T09:00:00Z' },
      { status: 'delivered', timestamp: '2026-11-04T16:20:00Z', note: 'تم استلام الطرد نقداً ورضا تام من الحريف' }
    ]
  }
];

export const INITIAL_OWNER_SETTINGS: OwnerSettings = {
  ownerName: 'عبد القادر بحري (Abdelkader Bahri)',
  primaryPhone: '+216 21 511 162', // Locked sovereign phone
  secondaryPhone: '+216 21 511 162', // Editable contact phone
  contactEmail: 'contact@echox-store.tn',
  loginEmail: 'abdelkaderbahri570@gmail.com', // Locked sovereign Google email
  photoUrl: '/assets/images/echox-logo.webp',
  bio: {
    ar: 'مالك ومؤسس منصة ECHOX Store تونس. متخصص في سلاسل الإمداد للقطع الأصلية والأجهزة التقنية الدقيقة.',
    fr: 'Fondateur et propriétaire d’ECHOX Store Tunisie, dédié aux pièces industrielles et d’origine.',
    en: 'Founder and owner of ECHOX Store Tunisia, committed to genuine hardware and industrial parts.'
  }
};

export const INITIAL_SITE_SETTINGS: SiteSettings = {
  storeName: 'ECHOX Store',
  slogan: {
    ar: 'المنصة التونسية الرائدة للأجهزة والقطع الأصلية',
    fr: 'La plateforme tunisienne de référence pour l’outillage et pièces certifiées',
    en: 'Tunisia’s Premier Platform for Genuine Equipment & Spare Parts'
  },
  description: {
    ar: 'متجر تونسي متخصص في المعدات الميكانيكية والكهربائية وقطع الغيار الأصلية مع الدفع عند الاستلام والتوصيل لكافة الـ 24 ولاية.',
    fr: 'Boutique en ligne tunisienne spécialisée dans l’outillage, matériel électrique et pièces détachées avec paiement à la livraison sur toute la Tunisie.',
    en: 'Tunisian online store specializing in professional tools, electrical equipment, and genuine spare parts with cash on delivery across Tunisia.'
  },
  officialEmail: 'contact@echox-store.tn',
  address: 'المركب التكنولوجي بالغزالة، أريانة / تونس العاصمة',
  addressMultilingual: {
    ar: 'المركب التكنولوجي بالغزالة، أريانة / تونس العاصمة',
    fr: 'Pôle Technologique El Ghazala, Ariana / Grand Tunis',
    en: 'El Ghazala Technopark, Ariana / Greater Tunis'
  },
  governorate: 'ariana',
  supportPhone: '+216 21 511 162',
  whatsappPhone: '21621511162',
  facebookUrl: 'https://facebook.com/echoxstore.tn',
  instagramUrl: 'https://instagram.com/echoxstore.tn',
  tiktokUrl: 'https://tiktok.com/@echoxstore.tn',
  workingHours: {
    ar: 'من الإثنين إلى السبت: 08:30 إلى 18:30 (الأحد: الدعم عبر واتساب)',
    fr: 'Du Lundi au Samedi : 08h30 à 18h30 (Dimanche : Assistance WhatsApp)',
    en: 'Monday to Saturday: 08:30 to 18:30 (Sunday: WhatsApp Support)'
  },
  standardShippingFee: 7.000,
  freeShippingThreshold: 150.000,
  enableCOD: true,
  enableKonnect: true,
  enableFlouci: true,
  announcementText: {
    ar: '🚚 توصيل مجاني لكافة ولايات تونس عند الطلب بأكثر من 150 د.ت | دفع عند الاستلام وضمان أصلي',
    fr: '🚚 Livraison Gratuite sur toute la Tunisie dès 150 DT d’achats | Paiement à la réception',
    en: '🚚 Free Shipping across all 24 Tunisian governorates on orders over 150 DT | Cash on Delivery'
  },
  showAnnouncement: true
};
