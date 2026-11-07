export interface TunisianGovernorate {
  id: string;
  nameAr: string;
  nameFr: string;
  nameEn: string;
  postalCodePrefix: string;
  majorDelegations: string[];
  deliveryEstimateDays: string;
}

export const TUNISIAN_GOVERNORATES: TunisianGovernorate[] = [
  {
    id: 'tunis',
    nameAr: 'تونس',
    nameFr: 'Tunis',
    nameEn: 'Tunis',
    postalCodePrefix: '10',
    majorDelegations: ['تونس المدينة', 'المرسى', 'حلق الوادي', 'سيدي بوسعيد', 'باردو', 'الكرم', 'المنزه', 'حي الخضراء'],
    deliveryEstimateDays: '24-48 ساعة'
  },
  {
    id: 'ariana',
    nameAr: 'أريانة',
    nameFr: 'Ariana',
    nameEn: 'Ariana',
    postalCodePrefix: '20',
    majorDelegations: ['أريانة المدينة', 'سكرة', 'رواد', 'قلعة الأندلس', 'التضامن', 'المنيهلة'],
    deliveryEstimateDays: '24-48 ساعة'
  },
  {
    id: 'ben_arous',
    nameAr: 'بن عروس',
    nameFr: 'Ben Arous',
    nameEn: 'Ben Arous',
    postalCodePrefix: '20',
    majorDelegations: ['بن عروس المدينة', 'رادس', 'مقرين', 'حمام الأنف', 'الزهراء', 'المروج', 'مرناق'],
    deliveryEstimateDays: '24-48 ساعة'
  },
  {
    id: 'manouba',
    nameAr: 'منوبة',
    nameFr: 'Manouba',
    nameEn: 'Manouba',
    postalCodePrefix: '20',
    majorDelegations: ['منوبة المدينة', 'الدندان', 'وادي الليل', 'طبربة', 'برج العامري', 'المرناقية'],
    deliveryEstimateDays: '24-48 ساعة'
  },
  {
    id: 'nabeul',
    nameAr: 'نابل',
    nameFr: 'Nabeul',
    nameEn: 'Nabeul',
    postalCodePrefix: '80',
    majorDelegations: ['نابل المدينة', 'الحمامات', 'قليبية', 'منزل تميم', 'قرمبالية', 'سليمان', 'الهوارية'],
    deliveryEstimateDays: '24-48 ساعة'
  },
  {
    id: 'zaghouan',
    nameAr: 'زغوان',
    nameFr: 'Zaghouan',
    nameEn: 'Zaghouan',
    postalCodePrefix: '11',
    majorDelegations: ['زغوان المدينة', 'الفحص', 'الناظور', 'بئر مشارقة', 'الزريبة'],
    deliveryEstimateDays: '48 ساعة'
  },
  {
    id: 'bizerte',
    nameAr: 'بنزرت',
    nameFr: 'Bizerte',
    nameEn: 'Bizerte',
    postalCodePrefix: '70',
    majorDelegations: ['بنزرت الشمالية', 'منزل بورقيبة', 'ماطر', 'رأس الجبل', 'غار الملح', 'العالية'],
    deliveryEstimateDays: '24-48 ساعة'
  },
  {
    id: 'beja',
    nameAr: 'باجة',
    nameFr: 'Béja',
    nameEn: 'Beja',
    postalCodePrefix: '90',
    majorDelegations: ['باجة المدينة', 'مجاز الباب', 'تستور', 'نفزة', 'تبرسق', 'عمدون'],
    deliveryEstimateDays: '48-72 ساعة'
  },
  {
    id: 'jendouba',
    nameAr: 'جندوبة',
    nameFr: 'Jendouba',
    nameEn: 'Jendouba',
    postalCodePrefix: '81',
    majorDelegations: ['جندوبة المدينة', 'طبرقة', 'عين دراهم', 'بوسالم', 'غار الدماء'],
    deliveryEstimateDays: '48-72 ساعة'
  },
  {
    id: 'kef',
    nameAr: 'الكاف',
    nameFr: 'Le Kef',
    nameEn: 'Le Kef',
    postalCodePrefix: '71',
    majorDelegations: ['الكاف الغربية', 'تاجروين', 'الدهماني', 'القلعة الخصباء', 'السرس'],
    deliveryEstimateDays: '48-72 ساعة'
  },
  {
    id: 'siliana',
    nameAr: 'سليانة',
    nameFr: 'Siliana',
    nameEn: 'Siliana',
    postalCodePrefix: '61',
    majorDelegations: ['سليانة المدينة', 'مكثر', 'بوعرادة', 'قعفور', 'الروحية', 'برقو'],
    deliveryEstimateDays: '48-72 ساعة'
  },
  {
    id: 'sousse',
    nameAr: 'سوسة',
    nameFr: 'Sousse',
    nameEn: 'Sousse',
    postalCodePrefix: '40',
    majorDelegations: ['سوسة المدينة', 'حمام سوسة', 'القنطاوي', 'مساكن', 'القلعة الكبرى', 'النفيضة'],
    deliveryEstimateDays: '24-48 ساعة'
  },
  {
    id: 'monastir',
    nameAr: 'المنستير',
    nameFr: 'Monastir',
    nameEn: 'Monastir',
    postalCodePrefix: '50',
    majorDelegations: ['المنستير المدينة', 'الساحلين', 'الوردانين', 'طبلبة', 'قصر هلال', 'المكنين', 'جمال'],
    deliveryEstimateDays: '24-48 ساعة'
  },
  {
    id: 'mahdia',
    nameAr: 'المهدية',
    nameFr: 'Mahdia',
    nameEn: 'Mahdia',
    postalCodePrefix: '51',
    majorDelegations: ['المهدية المدينة', 'قصور الساف', 'الجم', 'الشابة', 'سيدي علوان', 'بومرداس'],
    deliveryEstimateDays: '24-48 ساعة'
  },
  {
    id: 'sfax',
    nameAr: 'صفاقس',
    nameFr: 'Sfax',
    nameEn: 'Sfax',
    postalCodePrefix: '30',
    majorDelegations: ['صفاقس المدينة', 'صفاقس الغربية', 'ساقية الزيت', 'طينة', 'قرقنة', 'المحرس', 'الصخيرة'],
    deliveryEstimateDays: '24-48 ساعة'
  },
  {
    id: 'kairouan',
    nameAr: 'القيروان',
    nameFr: 'Kairouan',
    nameEn: 'Kairouan',
    postalCodePrefix: '31',
    majorDelegations: ['القيروان الشمالية', 'بوحجلة', 'السبيخة', 'حفوز', 'الوسلاتية', 'نصر الله'],
    deliveryEstimateDays: '48 ساعة'
  },
  {
    id: 'kasserine',
    nameAr: 'القصرين',
    nameFr: 'Kasserine',
    nameEn: 'Kasserine',
    postalCodePrefix: '12',
    majorDelegations: ['القصرين الشمالية', 'سبيطلة', 'فوسانة', 'فريانة', 'تالة', 'سبيبة'],
    deliveryEstimateDays: '48-72 ساعة'
  },
  {
    id: 'sidi_bouzid',
    nameAr: 'سيدي بوزيد',
    nameFr: 'Sidi Bouzid',
    nameEn: 'Sidi Bouzid',
    postalCodePrefix: '91',
    majorDelegations: ['سيدي بوزيد الغربية', 'الرقاب', 'المكناسي', 'جلمة', 'سيدي علي بن عون'],
    deliveryEstimateDays: '48-72 ساعة'
  },
  {
    id: 'gabes',
    nameAr: 'قابس',
    nameFr: 'Gabès',
    nameEn: 'Gabes',
    postalCodePrefix: '60',
    majorDelegations: ['قابس المدينة', 'الحامة', 'مارث', 'مطماطة', 'غنوش', 'وذرف'],
    deliveryEstimateDays: '48 ساعة'
  },
  {
    id: 'medenine',
    nameAr: 'مدنين',
    nameFr: 'Médenine',
    nameEn: 'Medenine',
    postalCodePrefix: '41',
    majorDelegations: ['مدنين الشمالية', 'جربة حومة السوق', 'جربة ميدون', 'جرجيس', 'بنقردان'],
    deliveryEstimateDays: '48-72 ساعة'
  },
  {
    id: 'tataouine',
    nameAr: 'تطاوين',
    nameFr: 'Tataouine',
    nameEn: 'Tataouine',
    postalCodePrefix: '32',
    majorDelegations: ['تطاوين الشمالية', 'غمراسن', 'رمادة', 'ذهيبة', 'بئر لحمر'],
    deliveryEstimateDays: '48-72 ساعة'
  },
  {
    id: 'gafsa',
    nameAr: 'قفصة',
    nameFr: 'Gafsa',
    nameEn: 'Gafsa',
    postalCodePrefix: '21',
    majorDelegations: ['قفصة المدينة', 'المتلوي', 'الرديف', 'أم العرائس', 'السند', 'القصر'],
    deliveryEstimateDays: '48-72 ساعة'
  },
  {
    id: 'tozeur',
    nameAr: 'توزر',
    nameFr: 'Tozeur',
    nameEn: 'Tozeur',
    postalCodePrefix: '22',
    majorDelegations: ['توزر المدينة', 'نفطة', 'دقاش', 'تمغزة', 'حامة الجريد'],
    deliveryEstimateDays: '48-72 ساعة'
  },
  {
    id: 'kebili',
    nameAr: 'قبلي',
    nameFr: 'Kébili',
    nameEn: 'Kebili',
    postalCodePrefix: '42',
    majorDelegations: ['قبلي الشمالية', 'دوز الشمالية', 'سوق الأحد', 'الفوار'],
    deliveryEstimateDays: '48-72 ساعة'
  }
];

export function getGovernorateName(id: string, lang: 'ar' | 'fr' | 'en'): string {
  const gov = TUNISIAN_GOVERNORATES.find(g => g.id === id);
  if (!gov) return id;
  if (lang === 'fr') return gov.nameFr;
  if (lang === 'en') return gov.nameEn;
  return gov.nameAr;
}
