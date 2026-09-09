import type { Locale } from '@/types/store';

export const locales: Locale[] = ['tr','en','ar'];
export const defaultLocale: Locale = 'tr';
export const isLocale = (v: string): v is Locale => locales.includes(v as Locale);

export const dict = {
  tr: {
    home:'Ana Sayfa', products:'Ürünler', size:'Beden Tablosu', about:'Hakkımızda', contact:'İletişim', cart:'Sepet',
    shopNow:'Alışverişe başla', collection:'DUTHUR Ürünleri', ourCollection:'Koleksiyonumuz', viewAll:'Tümünü gör',
    heroEyebrow:'DUTHUR — دُثُر', heroTitle:'Sessiz kimlik.\nDuru bir duruş.', heroDesc:'Anlam, hafıza ve ölçülülük etrafında kurulan Arap sokak giyimi.',
    addToCart:'Sepete ekle', soldOut:'Tükendi', sale:'İndirim',
    selectSize:'Beden seç', quantity:'Adet', subtotal:'Ara toplam', checkout:'Ödemeye geç', continueShopping:'Alışverişe devam et',
    yourCart:'Sepetiniz', emptyCart:'Sepetiniz boş', checkoutTitle:'Ödeme', contactTitle:'İletişim', delivery:'Teslimat',
    firstName:'Ad', lastName:'Soyad', email:'E-posta', phone:'Telefon', province:'İl', district:'İlçe', address:'Adres',
    addressDetails:'Bina / Kat / Daire (opsiyonel)', postalCode:'Posta kodu (opsiyonel)', discountCode:'İndirim kodu',
    shippingMethod:'Teslimat yöntemi', standardShipping:'Kargo', pickup:'Elden teslim', placeOrder:'Siparişi onayla',
    total:'Toplam', discount:'İndirim', shipping:'Kargo', bankTransfer:'Banka havalesi', orderConfirmed:'Siparişiniz alındı',
    orderNumber:'Sipariş No', findSize:'Bedenimi bul', height:'Boy (cm)', weight:'Kilo (kg)', recommended:'Önerilen beden',
    sizeNote:'Bu tahmini bir öneridir. Vücut oranları ve tercih edilen kalıp sonucu etkileyebilir.', send:'Gönder', message:'Mesaj',
    sizeChart:'Beden Tablosu', materialFit:'Materyal & Kalıp', shippingInfo:'Kargo', care:'Bakım', featured:'Öne çıkanlar',
    addedToCart:'Eklendi ✓', tableSize:'Beden', tableLength:'Boy', tableChest:'Göğüs', tableSleeve:'Kol', unitCm:'cm',
    prevImage:'Önceki görsel', nextImage:'Sonraki görsel', shippingDelivery:'Kargo ve Teslimat', careInstructions:'Bakım Talimatları',
    defaultShipping:'2–4 iş günü içinde standart kargo teslimatı. İstanbul içi elden teslimat seçeneği mevcuttur.',
    defaultCare:'30°C’de benzer renklerle tersten yıkayınız. Ağartıcı kullanmayınız. Düşük ısıda ütüleyiniz, baskının üzerine doğrudan ütü basmayınız.',
    productsEyebrow:'DUTHUR KOLEKSİYONU',
    sizeEyebrow:'DUTHUR BEDEN REHBERİ', sizePageTitle:'Bedeninizi Bulun',
    sizeEnterValues:'Lütfen boy ve kilo değerlerinizi giriniz.',
    sizeInvalidNumber:'Lütfen geçerli değerler giriniz (boy: 120–230 cm, kilo: 30–180 kg).',
    sizeOutOfRange:'Lütfen beden tablosunu inceleyiniz; ölçüleriniz standart model aralığının dışındadır.',
    footerTagline:'Sessiz Arap kimliği sokak giyimi.', shippingPolicy:'Kargo Politikası', refundPolicy:'İade Politikası', privacyPolicy:'Gizlilik Politikası'
  },
  en: {
    home:'Home', products:'Products', size:'Your Size', about:'About', contact:'Contact', cart:'Cart',
    shopNow:'Shop now', collection:'DUTHUR Products', ourCollection:'Our Collection', viewAll:'View all',
    heroEyebrow:'DUTHUR — دُثُر', heroTitle:'Quiet identity.\nWorn clearly.', heroDesc:'Arab streetwear built around meaning, memory and restraint.',
    addToCart:'Add to cart', soldOut:'Sold out', sale:'Sale',
    selectSize:'Select size', quantity:'Quantity', subtotal:'Subtotal', checkout:'Checkout', continueShopping:'Continue shopping',
    yourCart:'Your cart', emptyCart:'Your cart is empty', checkoutTitle:'Checkout', contactTitle:'Contact', delivery:'Delivery',
    firstName:'First name', lastName:'Last name', email:'Email', phone:'Phone', province:'Province', district:'District', address:'Full address',
    addressDetails:'Building / Floor / Door (optional)', postalCode:'Postal code (optional)', discountCode:'Discount code',
    shippingMethod:'Shipping method', standardShipping:'Shipping', pickup:'Hand-to-hand pickup', placeOrder:'Confirm order',
    total:'Total', discount:'Discount', shipping:'Shipping', bankTransfer:'Bank transfer', orderConfirmed:'Order confirmed',
    orderNumber:'Order number', findSize:'Find my size', height:'Height (cm)', weight:'Weight (kg)', recommended:'Recommended size',
    sizeNote:'This is an estimate. Body proportions and fit preference can affect the result.', send:'Send', message:'Message',
    sizeChart:'Size Chart', materialFit:'Material & Fit', shippingInfo:'Shipping', care:'Care', featured:'Featured',
    addedToCart:'Added ✓', tableSize:'Size', tableLength:'Length', tableChest:'Chest', tableSleeve:'Sleeve', unitCm:'cm',
    prevImage:'Previous image', nextImage:'Next image', shippingDelivery:'Shipping & Delivery', careInstructions:'Care Instructions',
    defaultShipping:'Standard domestic delivery within 2–4 business days. Local hand-to-hand pickup available in Istanbul.',
    defaultCare:'Machine wash cold (30°C) inside out with similar colors. Do not bleach. Iron on low heat avoiding direct contact with print.',
    productsEyebrow:'DUTHUR COLLECTION',
    sizeEyebrow:'DUTHUR SIZING', sizePageTitle:'Find Your Size',
    sizeEnterValues:'Please enter your height and weight.',
    sizeInvalidNumber:'Please enter valid values (height: 120–230 cm, weight: 30–180 kg).',
    sizeOutOfRange:'Please refer to the size chart; your measurements are outside the reliable estimate range.',
    footerTagline:'Quiet Arab identity streetwear.', shippingPolicy:'Shipping Policy', refundPolicy:'Refund Policy', privacyPolicy:'Privacy Policy'
  },
  ar: {
    home:'الرئيسية', products:'المنتجات', size:'مقاسك', about:'من نحن', contact:'تواصل معنا', cart:'السلة',
    shopNow:'تسوق الآن', collection:'منتجات دُثُر', ourCollection:'مجموعتنا', viewAll:'عرض الكل',
    heroEyebrow:'دُثُر — DUTHUR', heroTitle:'هوية هادئة.\nتُرتدى بوضوح.', heroDesc:'أزياء شارع عربية مبنية على المعنى والذاكرة والاتزان.',
    addToCart:'أضف إلى السلة', soldOut:'نفد', sale:'خصم',
    selectSize:'اختر المقاس', quantity:'الكمية', subtotal:'المجموع الفرعي', checkout:'إتمام الطلب', continueShopping:'متابعة التسوق',
    yourCart:'سلة التسوق', emptyCart:'السلة فارغة', checkoutTitle:'إتمام الطلب', contactTitle:'تواصل معنا', delivery:'التوصيل',
    firstName:'الاسم الأول', lastName:'اسم العائلة', email:'البريد الإلكتروني', phone:'رقم الهاتف', province:'المحافظة', district:'المنطقة / الحي', address:'العنوان الكامل',
    addressDetails:'المبنى / الطابق / رقم الباب (اختياري)', postalCode:'الرمز البريدي (اختياري)', discountCode:'كود الخصم',
    shippingMethod:'طريقة الاستلام', standardShipping:'الشحن', pickup:'استلام يد بيد', placeOrder:'تأكيد الطلب',
    total:'الإجمالي', discount:'الخصم', shipping:'الشحن', bankTransfer:'تحويل بنكي', orderConfirmed:'تم استلام طلبك',
    orderNumber:'رقم الطلب', findSize:'اعرف مقاسك', height:'الطول (سم)', weight:'الوزن (كجم)', recommended:'المقاس المقترح',
    sizeNote:'هذا ترشيح تقريبي، وقد يختلف حسب شكل الجسم وطريقة اللبس المفضلة.', send:'إرسال', message:'الرسالة',
    sizeChart:'جدول المقاسات', materialFit:'الخامة والقصة', shippingInfo:'الشحن', care:'العناية', featured:'مختارات',
    addedToCart:'تمت الإضافة ✓', tableSize:'المقاس', tableLength:'الطول', tableChest:'الصدر', tableSleeve:'الكم', unitCm:'سم',
    prevImage:'الصورة السابقة', nextImage:'الصورة التالية', shippingDelivery:'الشحن والتوصيل', careInstructions:'إرشادات العناية',
    defaultShipping:'شحن محلي قياسي خلال ٢–٤ أيام عمل. إمكانية الاستلام يدًا بيد داخل إسطنبول.',
    defaultCare:'غسيل على درجة حرارة 30° مئوية مقلوبًا مع ألوان مماثلة. تجنب استخدام المبيضات. الكي على درجة حرارة منخفضة مع تجنب الكي المباشر للطبعة.',
    productsEyebrow:'مجموعة دُثُر',
    sizeEyebrow:'دليل مقاسات دُثُر', sizePageTitle:'اعرف مقاسك',
    sizeEnterValues:'يرجى إدخال الطول والوزن.',
    sizeInvalidNumber:'يرجى إدخال قيم صالحة (الطول: ١٢٠–٢٣٠ سم، الوزن: ٣٠–١٨٠ كجم).',
    sizeOutOfRange:'يرجى مراجعة جدول المقاسات؛ البيانات خارج نطاق الترشيح الدقيق.',
    footerTagline:'أزياء شارع عربية بهوية هادئة.', shippingPolicy:'سياسة الشحن', refundPolicy:'سياسة الاسترجاع', privacyPolicy:'سياسة الخصوصية'
  }
} as const;

export function getText(product: any, field: 'title'|'description'|'material_fit'|'shipping'|'care', locale: Locale) {
  return product[`${field}_${locale}`] || product[`${field}_en`] || '';
}
