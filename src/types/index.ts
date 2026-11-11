export type Language = 'ar' | 'fr' | 'en';

export type OrderStatus = 
  | 'new' 
  | 'under_confirmation' 
  | 'preparing' 
  | 'out_for_delivery' 
  | 'delivered' 
  | 'cancelled';

export interface MultilingualText {
  ar: string;
  fr: string;
  en: string;
}

export interface Review {
  id: string;
  authorName: string;
  rating: number; // 1-5
  comment: string;
  date: string;
  verifiedPurchase: boolean;
}

export interface Product {
  id: string;
  name: MultilingualText;
  description: MultilingualText;
  category: string;
  price: number; // in TND (Tunisian Dinar)
  originalPrice?: number;
  stock: number;
  companyId: string;
  companyName: string;
  governorate: string; // Tunisian governorate of origin or dispatch
  images: string[];
  featured?: boolean;
  active: boolean;
  videoUrl?: string;
  deliveryTimeDays: number;
  freeDeliveryThreshold?: number;
  reviews: Review[];
  rating: number;
  reviewCount: number;
  specs?: { key: MultilingualText; value: MultilingualText }[];
}

export interface Company {
  id: string;
  name: string;
  logo: string;
  phone: string;
  email: string;
  address: string;
  governorate: string;
  description: MultilingualText;
  website?: string;
}

export interface CustomerAddress {
  id: string;
  isDefault: boolean;
  fullName: string;
  phone: string;
  governorate: string; // One of the 24 Tunisian governorates
  city: string; // Delegation / City
  postalCode: string; // 4 digits
  street: string;
  notes?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  productName: MultilingualText;
  productImage: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  trackingNumber: string; // e.g. ECH-TN-783921
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  shippingAddress: CustomerAddress;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: 'cod' | 'konnect' | 'flouci';
  paymentStatus: 'pending' | 'paid' | 'failed';
  carrierName: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  statusHistory: {
    status: OrderStatus;
    timestamp: string;
    note?: string;
  }[];
}

export interface CustomerUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  addresses: CustomerAddress[];
  wishlist: string[]; // Product IDs
}

export interface ContactInquiry {
  id: string;
  senderName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  createdAt: string;
  read: boolean;
  reply?: string;
  repliedAt?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'customer' | 'owner';
  text: string;
  timestamp: string;
}

export interface OwnerSettings {
  ownerName: string;
  primaryPhone: string; // Locked for display: +21621511162
  secondaryPhone: string; // Editable for contact
  contactEmail: string;
  loginEmail: string; // Locked: abdelkaderbahri570@gmail.com
  photoUrl: string;
  bio: MultilingualText;
}

export interface SiteSettings {
  storeName: string;
  slogan: MultilingualText;
  description: MultilingualText;
  officialEmail: string;
  address: string;
  addressMultilingual?: MultilingualText;
  governorate: string;
  supportPhone: string;
  whatsappPhone: string; // e.g. 21621511162
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  workingHours: MultilingualText;
  standardShippingFee: number; // e.g. 7.000 TND
  freeShippingThreshold: number; // e.g. 150.000 TND
  enableCOD: boolean;
  enableKonnect: boolean;
  enableFlouci: boolean;
  announcementText: MultilingualText;
  showAnnouncement: boolean;
}

export interface CategoryItem {
  id: string;
  label: string;
  icon?: string;
  desc?: string;
}

export interface PromoBanner {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  active: boolean;
  link?: string;
  bgGradient?: string;
}
