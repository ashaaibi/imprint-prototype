/* ═══════════════════════════════════════════════════
   IMPRINT — Shared JS
   Country/currency state, localStorage helpers,
   theme + language toggles, and the site header
   renderer used by all pages.
════════════════════════════════════════════════════ */

/* ─── GCC CONFIG ───────────────────────────────── */
var GCC = {
  AE: { name: 'UAE',     nameAr: 'الإمارات', flag: '🇦🇪', currency: 'AED', currencyAr: 'د.إ', decimals: 2, rate: 1.000,  vat: 0.05,  vatLabel: '5% VAT',  vatLabelAr: 'ضريبة ٥٪',  phone: '+971', cities: ['Dubai','Abu Dhabi','Sharjah','Ajman','Ras Al Khaimah','Fujairah'], citiesAr: ['دبي','أبوظبي','الشارقة','عجمان','رأس الخيمة','الفجيرة'] },
  SA: { name: 'KSA',     nameAr: 'السعودية', flag: '🇸🇦', currency: 'SAR', currencyAr: 'ر.س', decimals: 2, rate: 1.020,  vat: 0.15,  vatLabel: '15% VAT', vatLabelAr: 'ضريبة ١٥٪', phone: '+966', cities: ['Riyadh','Jeddah','Dammam','Mecca','Medina','Khobar'],         citiesAr: ['الرياض','جدة','الدمام','مكة','المدينة','الخبر'] },
  KW: { name: 'Kuwait',  nameAr: 'الكويت',   flag: '🇰🇼', currency: 'KWD', currencyAr: 'د.ك', decimals: 3, rate: 0.083,  vat: 0.00,  vatLabel: 'No VAT',  vatLabelAr: 'بدون ضريبة', phone: '+965', cities: ['Kuwait City','Hawalli','Salmiya','Farwaniya','Ahmadi','Jahra'],     citiesAr: ['مدينة الكويت','حولي','السالمية','الفروانية','الأحمدي','الجهراء'] },
  BH: { name: 'Bahrain', nameAr: 'البحرين',  flag: '🇧🇭', currency: 'BHD', currencyAr: 'د.ب', decimals: 3, rate: 0.102,  vat: 0.10,  vatLabel: '10% VAT', vatLabelAr: 'ضريبة ١٠٪', phone: '+973', cities: ['Manama','Muharraq','Riffa','Hamad Town','Isa Town','Sitra'],         citiesAr: ['المنامة','المحرق','الرفاع','مدينة حمد','مدينة عيسى','سترة'] },
  QA: { name: 'Qatar',   nameAr: 'قطر',      flag: '🇶🇦', currency: 'QAR', currencyAr: 'ر.ق', decimals: 2, rate: 0.997,  vat: 0.00,  vatLabel: 'No VAT',  vatLabelAr: 'بدون ضريبة', phone: '+974', cities: ['Doha','Al Rayyan','Al Wakrah','Al Khor','Lusail','Umm Salal'],         citiesAr: ['الدوحة','الريان','الوكرة','الخور','لوسيل','أم صلال'] },
  OM: { name: 'Oman',    nameAr: 'عُمان',    flag: '🇴🇲', currency: 'OMR', currencyAr: 'ر.ع', decimals: 3, rate: 0.100,  vat: 0.05,  vatLabel: '5% VAT',  vatLabelAr: 'ضريبة ٥٪',  phone: '+968', cities: ['Muscat','Salalah','Sohar','Nizwa','Sur','Ibri'],                     citiesAr: ['مسقط','صلالة','صحار','نزوى','صور','عبري'] },
};

/* ─── COUNTRY STATE ────────────────────────────── */
function getCountryCode() { return localStorage.getItem('imprint_country') || 'AE'; }
function setCountryCode(code) { localStorage.setItem('imprint_country', code); }
function getCountry() { return GCC[getCountryCode()] || GCC.AE; }

/* ─── PRICE FORMATTING ─────────────────────────── */
function formatPrice(aedAmount) {
  var c = getCountry();
  var converted = aedAmount * c.rate;
  var isAr = getLang() === 'ar';
  var cur = isAr ? c.currencyAr : c.currency;
  return cur + ' ' + converted.toFixed(c.decimals);
}
function formatPriceFor(aedAmount, code) {
  var c = GCC[code] || GCC.AE;
  var converted = aedAmount * c.rate;
  return c.currency + ' ' + converted.toFixed(c.decimals);
}
function formatPlain(aedAmount) {
  var c = getCountry();
  return (aedAmount * c.rate).toFixed(c.decimals);
}

/* ─── CART STATE ───────────────────────────────── */
function getCart() {
  try { return JSON.parse(localStorage.getItem('imprint_cart') || 'null'); }
  catch(e) { return null; }
}
function setCart(data) { localStorage.setItem('imprint_cart', JSON.stringify(data)); }
function clearCart() { localStorage.removeItem('imprint_cart'); }
function getCartCount() { var cart = getCart(); return cart ? 1 : 0; }

/* ─── ORDER STATE ──────────────────────────────── */
function getOrder() {
  try { return JSON.parse(localStorage.getItem('imprint_order') || 'null'); }
  catch(e) { return null; }
}
function setOrder(data) { localStorage.setItem('imprint_order', JSON.stringify(data)); }

/* ─── LANG STATE ───────────────────────────────── */
function getLang() { return localStorage.getItem('imprint_lang') || 'en'; }
function setLang(lang) { localStorage.setItem('imprint_lang', lang); }

/* ─── THEME STATE ──────────────────────────────── */
function getTheme() { return localStorage.getItem('imprint_theme') || 'light'; }
function setTheme(theme) {
  localStorage.setItem('imprint_theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
}
function applyThemeOnLoad() {
  var t = getTheme();
  document.documentElement.setAttribute('data-theme', t);
}
/* Run immediately to prevent flash */
applyThemeOnLoad();

function applyLangOnLoad() {
  var l = getLang();
  var isAr = l === 'ar';
  document.documentElement.setAttribute('dir', isAr ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', isAr ? 'ar' : 'en');
}
applyLangOnLoad();

/* ─── TRANSLATIONS DICTIONARY ──────────────────── */
/* Centralized translation strings. Pages can extend this. */
var IMPRINT_T = {
  /* Header / common */
  'nav.cart':              { en: 'Cart',                ar: 'السلة' },
  'nav.signin':            { en: 'Sign in',             ar: 'تسجيل الدخول' },

  /* Homepage */
  'home.eyebrow':          { en: 'Custom packaging · made simple', ar: 'تغليف مخصص · بكل سهولة' },
  'home.hero.title':       { en: 'Premium packaging.\nMade simple.', ar: 'تغليف فاخر.\nبكل بساطة.' },
  'home.hero.sub':         { en: 'Configure, price, and order custom packaging — in minutes. Real factories. Live pricing. No middlemen.', ar: 'صمّم وسعّر واطلب التغليف المخصص — خلال دقائق. مصانع حقيقية. أسعار فورية. بدون وسطاء.' },
  'home.hero.cta':         { en: 'Start designing',     ar: 'ابدأ التصميم' },
  'home.hero.ghost':       { en: 'View products',       ar: 'عرض المنتجات' },
  'home.hero.note':        { en: 'No account needed · Instant pricing · Ships across the GCC', ar: 'بدون حساب · تسعير فوري · شحن لجميع دول الخليج' },
  'home.stat.products':    { en: 'Product types',       ar: 'نوع منتج' },
  'home.stat.countries':   { en: 'GCC countries',       ar: 'دول خليجية' },
  'home.stat.factories':   { en: 'Factories',           ar: 'مصنع' },
  'home.stat.lead':        { en: 'Fastest lead time',   ar: 'أسرع موعد تسليم' },
  'home.how.eyebrow':      { en: 'How it works',        ar: 'كيف تعمل المنصة' },
  'home.how.title':        { en: 'From idea to production in three steps.', ar: 'من الفكرة إلى الإنتاج في ثلاث خطوات.' },
  'home.how.1.title':      { en: 'Configure',           ar: 'صمّم' },
  'home.how.1.desc':       { en: 'Choose your product, upload your logo or type your brand name, pick a finish and size. See exactly what you\'ll receive — in 3D, in real time.', ar: 'اختر منتجك، ارفع شعارك أو اكتب اسم علامتك التجارية، حدد التشطيب والمقاس. شاهد ما ستحصل عليه بدقة — بتقنية ثلاثية الأبعاد، لحظياً.' },
  'home.how.2.title':      { en: 'Choose your factory', ar: 'اختر مصنعك' },
  'home.how.2.desc':       { en: 'Compare factories by price, quality rating, lead time, and finish capabilities. Pick what fits your budget and timeline.', ar: 'قارن بين المصانع بناءً على السعر والجودة وموعد التسليم وإمكانيات التشطيب. اختر ما يناسب ميزانيتك وجدولك.' },
  'home.how.3.title':      { en: 'Receive your order',  ar: 'استلم طلبك' },
  'home.how.3.desc':       { en: 'Production files are generated automatically. Track your order through every stage — from production to delivery.', ar: 'يتم إنشاء ملفات الإنتاج تلقائياً. تابع طلبك في كل مرحلة — من الإنتاج إلى التسليم.' },
  'home.why.title':        { en: 'The operating system for packaging.', ar: 'نظام التشغيل الموحد للتغليف.' },
  'home.why.desc':         { en: 'Ordering branded packaging traditionally means emails, spreadsheets, and weeks of waiting. Imprint automates the entire process — from design to print-ready file to factory floor.', ar: 'كان طلب التغليف يعني مراسلات وجداول وأسابيع من الانتظار. تُؤتمت إمبرنت العملية بالكامل — من التصميم إلى ملف الطباعة إلى أرض المصنع.' },
  'home.why.1':            { en: 'Instant, accurate pricing. No quotes. No waiting.', ar: 'تسعير فوري ودقيق. بدون عروض أسعار. بدون انتظار.' },
  'home.why.2':            { en: 'Production files generated automatically — no designer required.', ar: 'ملفات إنتاج تلقائية — بدون الحاجة لمصمم.' },
  'home.why.3':            { en: 'Multiple vetted factories. You choose the trade-off.', ar: 'شبكة مصانع موثوقة. القرار لك.' },
  'home.why.4':            { en: 'Full order tracking from confirmation to delivery.', ar: 'متابعة كاملة للطلب من التأكيد إلى التسليم.' },
  'home.cta.title':        { en: 'Ready to see it in action?', ar: 'جاهز لتجربتها؟' },
  'home.cta.sub':          { en: 'Explore the paper bag configurator — no account needed.', ar: 'استكشف منصة تصميم الأكياس الورقية — بدون حاجة لحساب.' },

  /* Products page */
  'products.title':        { en: 'Customizable products', ar: 'منتجات قابلة للتخصيص' },
  'products.sub':          { en: 'Premium branded packaging, configured and priced in real time. Ships anywhere in the GCC.', ar: 'تغليف فاخر بعلامتك التجارية، يُصمّم ويُسعّر لحظياً. شحن لجميع دول الخليج.' },
  'products.section.all':  { en: 'All products',         ar: 'جميع المنتجات' },
  'products.section.note': { en: '1 product available · 7 coming soon', ar: 'منتج واحد متاح · ٧ قريباً' },
  'products.comingsoon':   { en: 'Coming soon',          ar: 'قريباً' },
  'products.configure':    { en: 'Configure now',        ar: 'صمّمه الآن' },
  'products.from':         { en: 'From',                 ar: 'يبدأ من' },
  'products.unit':         { en: '/ unit',               ar: '/ قطعة' },

  /* Product names */
  'product.paperbag':      { en: 'Paper bag',            ar: 'كيس ورقي' },
  'product.paperbag.desc': { en: 'Luxury branded paper bags with custom finishes, embossing, and full-colour printing. 5 sizes from XS to XL.', ar: 'أكياس ورقية فاخرة بتشطيبات مخصصة وبروز وطباعة كاملة الألوان. ٥ مقاسات من XS إلى XL.' },
  'product.giftbox':       { en: 'Gift box',             ar: 'علبة هدايا' },
  'product.giftbox.desc':  { en: 'Rigid lid-and-base gift boxes with custom printing, ribbon, and tissue paper insert.', ar: 'علب هدايا صلبة بطباعة مخصصة، شريط، وورق تغليف داخلي.' },
  'product.mailerbox':     { en: 'Mailer box',           ar: 'علبة شحن' },
  'product.mailerbox.desc':{ en: 'Self-locking e-commerce mailer boxes. Full external and internal printing.', ar: 'علب شحن ذاتية الإغلاق للتجارة الإلكترونية. طباعة خارجية وداخلية كاملة.' },
  'product.shipping':      { en: 'Shipping box',         ar: 'صندوق شحن' },
  'product.shipping.desc': { en: 'Corrugated shipping boxes with custom branding. Optimised for DHL and Aramex.', ar: 'صناديق شحن مموجة بعلامتك التجارية. مُحسّنة لـ DHL وأرامكس.' },
  'product.tissue':        { en: 'Tissue box',           ar: 'علبة مناديل' },
  'product.tissue.desc':   { en: 'Branded tissue paper boxes for retail, hospitality, and gifting.', ar: 'علب مناديل بعلامتك للتجزئة والضيافة والإهداء.' },
  'product.tube':          { en: 'Tube / cylinder',      ar: 'أنبوب / أسطوانة' },
  'product.tube.desc':     { en: 'Round tube packaging for posters, cosmetics, spirits, and luxury items.', ar: 'تغليف أسطواني للملصقات ومستحضرات التجميل والمنتجات الفاخرة.' },
  'product.pouch':         { en: 'Pouch / sachet',       ar: 'كيس / ساشيه' },
  'product.pouch.desc':    { en: 'Stand-up pouches and flat sachets for food, coffee, tea, cosmetics, and supplements.', ar: 'أكياس واقفة ومسطحة للطعام والقهوة والشاي ومستحضرات التجميل.' },
  'product.shoppingbag':   { en: 'Shopping bag',         ar: 'كيس تسوق' },
  'product.shoppingbag.desc':{ en: 'Non-woven, cotton, or jute shopping bags with full-colour custom printing.', ar: 'أكياس تسوق غير منسوجة، قطنية، أو من الجوت بطباعة كاملة الألوان.' },

  /* Configurator */
  'cfg.title':             { en: 'Paper bag',            ar: 'كيس ورقي' },
  'cfg.sub':               { en: 'Live pricing updates as you change spec.', ar: 'يتحدث السعر فورياً عند تغيير المواصفات.' },
  'cfg.preview':           { en: '3D Preview',           ar: 'معاينة ثلاثية الأبعاد' },
  'cfg.front':             { en: 'Front',                ar: 'أمامي' },
  'cfg.back':              { en: 'Back',                 ar: 'خلفي' },
  'cfg.side':              { en: 'Side',                 ar: 'جانبي' },
  'cfg.artwork':           { en: 'Artwork',              ar: 'التصميم' },
  'cfg.artwork.none':      { en: 'None',                 ar: 'بدون' },
  'cfg.artwork.upload':    { en: 'Upload',               ar: 'رفع' },
  'cfg.artwork.logo':      { en: 'Logo',                 ar: 'شعار' },
  'cfg.artwork.text':      { en: 'Text',                 ar: 'نص' },
  'cfg.artwork.ai':        { en: 'AI Art',               ar: 'ذكاء اصطناعي' },
  'cfg.exterior':          { en: 'Exterior',             ar: 'الخارج' },
  'cfg.interior':          { en: 'Interior',             ar: 'الداخل' },
  'cfg.handles':           { en: 'Handles',              ar: 'المقابض' },
  'cfg.color':             { en: 'Material color',       ar: 'لون المادة' },
  'cfg.finish':            { en: 'Material finish',      ar: 'تشطيب المادة' },
  'cfg.pattern':           { en: 'Pattern',              ar: 'النقش' },
  'cfg.pattern.none':      { en: 'None',                 ar: 'بدون' },
  'cfg.pattern.ai':        { en: 'AI Pattern',           ar: 'نقش AI' },
  'cfg.pattern.upload':    { en: 'Upload pattern',       ar: 'رفع نقش' },
  'cfg.pattern.color':     { en: 'Pattern color',        ar: 'لون النقش' },
  'cfg.opacity':           { en: 'Opacity',              ar: 'الشفافية' },
  'cfg.density':           { en: 'Density',              ar: 'الكثافة' },
  'cfg.custom':            { en: 'Custom',               ar: 'مخصص' },
  'cfg.gloss':             { en: 'Gloss',                ar: 'لامع' },
  'cfg.matte':             { en: 'Matte',                ar: 'مطفي' },
  'cfg.soft':              { en: 'Soft Touch',           ar: 'ملمس ناعم' },
  'cfg.softtouch':         { en: 'Soft Touch',           ar: 'ملمس ناعم' },
  'cfg.kraft':             { en: 'Kraft',                ar: 'كرافت' },
  'cfg.foil':              { en: 'Foil Stamp',           ar: 'ختم معدني' },
  'cfg.emboss':            { en: 'Emboss',               ar: 'بروز' },
  'cfg.deboss':            { en: 'Deboss',               ar: 'غائر' },
  'cfg.size':              { en: 'Size',                 ar: 'المقاس' },
  'cfg.quantity':          { en: 'Quantity',             ar: 'الكمية' },
  'cfg.units':             { en: 'units',                ar: 'قطعة' },
  'cfg.save':              { en: 'Save',                 ar: 'وفّر' },
  'cfg.summary':           { en: 'Order summary',        ar: 'ملخص الطلب' },
  'cfg.base':              { en: 'Base price',           ar: 'السعر الأساسي' },
  'cfg.lining':            { en: 'Interior lining',      ar: 'البطانة الداخلية' },
  'cfg.setup':             { en: 'Design setup fee',     ar: 'رسوم إعداد التصميم' },
  'cfg.subtotal':          { en: 'Subtotal',             ar: 'المجموع الفرعي' },
  'cfg.vat':               { en: 'VAT',                  ar: 'الضريبة' },
  'cfg.total':             { en: 'Total',                ar: 'الإجمالي' },
  'cfg.atc':               { en: 'Add to cart',          ar: 'أضف إلى السلة' },
  'cfg.perunit':           { en: '/ unit',               ar: '/ قطعة' },

  /* Checkout */
  'co.title':              { en: 'Checkout',             ar: 'إتمام الطلب' },
  'co.step.factory':       { en: 'Choose factory',       ar: 'اختر المصنع' },
  'co.step.address':       { en: 'Shipping',             ar: 'الشحن' },
  'co.step.payment':       { en: 'Payment',              ar: 'الدفع' },
  'co.step.review':        { en: 'Review',               ar: 'مراجعة' },
  'co.summary':            { en: 'Order summary',        ar: 'ملخص الطلب' },
  'co.factory.title':      { en: 'Choose your factory',  ar: 'اختر مصنعك' },
  'co.factory.sub':        { en: 'Compare price, quality, lead time, and finish support. You decide the trade-off.', ar: 'قارن السعر والجودة وموعد التسليم والتشطيبات. القرار لك.' },
  'co.factory.rec':        { en: 'Recommended',          ar: 'موصى به' },
  'co.factory.avail':      { en: 'Available',            ar: 'متاح' },
  'co.factory.limited':    { en: 'Limited',              ar: 'محدود' },
  'co.factory.incomp':     { en: 'Incompatible with your finish', ar: 'غير متوافق مع التشطيب المختار' },
  'co.factory.price':      { en: 'Price impact',         ar: 'أثر السعر' },
  'co.factory.lead':       { en: 'Lead time',            ar: 'موعد التسليم' },
  'co.factory.quality':    { en: 'Quality',              ar: 'الجودة' },
  'co.factory.finishes':   { en: 'Finishes',             ar: 'التشطيبات' },
  'co.factory.days':       { en: 'days',                 ar: 'يوم' },
  'co.address.title':      { en: 'Shipping address',     ar: 'عنوان الشحن' },
  'co.address.sub':        { en: 'Where should we deliver your order?', ar: 'إلى أين نوصل طلبك؟' },
  'co.address.name':       { en: 'Full name',            ar: 'الاسم الكامل' },
  'co.address.email':      { en: 'Email',                ar: 'البريد الإلكتروني' },
  'co.address.phone':      { en: 'Phone',                ar: 'الهاتف' },
  'co.address.company':    { en: 'Company (optional)',   ar: 'الشركة (اختياري)' },
  'co.address.country':    { en: 'Country',              ar: 'الدولة' },
  'co.address.city':       { en: 'City',                 ar: 'المدينة' },
  'co.address.line':       { en: 'Street address',       ar: 'العنوان' },
  'co.address.postal':     { en: 'Postal / area',        ar: 'الرمز البريدي' },
  'co.payment.title':      { en: 'Payment',              ar: 'الدفع' },
  'co.payment.sub':        { en: 'Secured by 256-bit SSL. Your card details are never stored.', ar: 'تشفير بنكي ٢٥٦-بت. لا نخزن بيانات بطاقتك.' },
  'co.payment.method':     { en: 'Payment method',       ar: 'طريقة الدفع' },
  'co.payment.card':       { en: 'Card',                 ar: 'بطاقة' },
  'co.payment.apple':      { en: 'Apple Pay',            ar: 'Apple Pay' },
  'co.payment.tabby':      { en: 'Tabby',                ar: 'تابي' },
  'co.payment.tamara':     { en: 'Tamara',               ar: 'تمارا' },
  'co.payment.cardnum':    { en: 'Card number',          ar: 'رقم البطاقة' },
  'co.payment.expiry':     { en: 'Expiry',               ar: 'انتهاء الصلاحية' },
  'co.payment.cvc':        { en: 'CVC',                  ar: 'CVC' },
  'co.continue':           { en: 'Continue',             ar: 'متابعة' },
  'co.back':               { en: 'Back',                 ar: 'رجوع' },
  'co.place':              { en: 'Place order',          ar: 'تأكيد الطلب' },

  /* Confirmation */
  'conf.title':            { en: 'Order confirmed',      ar: 'تم تأكيد الطلب' },
  'conf.sub':              { en: 'We\'ve received your order and shared it with your chosen factory.', ar: 'استلمنا طلبك وأرسلناه إلى المصنع الذي اخترته.' },
  'conf.orderid':          { en: 'Order ID',             ar: 'رقم الطلب' },
  'conf.delivery':         { en: 'Estimated delivery',   ar: 'موعد التسليم المتوقع' },
  'conf.factory':          { en: 'Factory',              ar: 'المصنع' },
  'conf.total':            { en: 'Total paid',           ar: 'المبلغ المدفوع' },
  'conf.timeline':         { en: 'Timeline',             ar: 'الجدول الزمني' },
  'conf.t1':               { en: 'Order confirmed',      ar: 'تأكيد الطلب' },
  'conf.t2':               { en: 'Production file sent', ar: 'إرسال ملف الإنتاج' },
  'conf.t3':               { en: 'In production',        ar: 'قيد الإنتاج' },
  'conf.t4':               { en: 'Quality check',        ar: 'فحص الجودة' },
  'conf.t5':               { en: 'Shipped',              ar: 'تم الشحن' },
  'conf.t6':               { en: 'Delivered',            ar: 'تم التسليم' },
  'conf.track':            { en: 'Track order',          ar: 'تتبع الطلب' },
  'conf.continue':         { en: 'Continue shopping',    ar: 'متابعة التسوق' },

  /* Designer */
  'des.dashboard':         { en: 'Dashboard',            ar: 'لوحة التحكم' },
  'des.role':              { en: 'Designer',             ar: 'مصمم' },
  'des.welcome':           { en: 'Welcome back',         ar: 'مرحباً بعودتك' },
  'des.stat.templates':    { en: 'Templates live',       ar: 'قوالب نشطة' },
  'des.stat.orders':       { en: 'Orders this month',    ar: 'طلبات هذا الشهر' },
  'des.stat.earnings':     { en: 'Earnings (MTD)',       ar: 'أرباح الشهر' },
  'des.stat.conv':         { en: 'Avg conversion',       ar: 'متوسط التحويل' },
  'des.templates':         { en: 'My templates',         ar: 'قوالبي' },
  'des.recent':            { en: 'Recent orders',        ar: 'الطلبات الأخيرة' },
  'des.new':               { en: 'Create new template',  ar: 'إنشاء قالب جديد' },
  'des.tbl.name':          { en: 'Name',                 ar: 'الاسم' },
  'des.tbl.product':       { en: 'Product',              ar: 'المنتج' },
  'des.tbl.orders':        { en: 'Orders',               ar: 'الطلبات' },
  'des.tbl.earnings':      { en: 'Earnings',             ar: 'الأرباح' },
  'des.tbl.conv':          { en: 'Conversion',           ar: 'التحويل' },
  'des.tbl.status':        { en: 'Status',               ar: 'الحالة' },
  'des.tbl.actions':       { en: 'Actions',              ar: 'الإجراءات' },
  'des.builder.title':     { en: 'New template',         ar: 'قالب جديد' },
  'des.builder.s1':        { en: 'Upload artwork',       ar: 'رفع التصميم' },
  'des.builder.s2':        { en: 'Mark editable fields', ar: 'تحديد الحقول' },
  'des.builder.s3':        { en: 'Set constraints',      ar: 'تحديد القيود' },
  'des.builder.s4':        { en: 'Preview & submit',     ar: 'معاينة وإرسال' },

  /* Factory */
  'fac.queue':             { en: 'Order queue',          ar: 'قائمة الطلبات' },
  'fac.role':              { en: 'Factory',              ar: 'مصنع' },
  'fac.all':               { en: 'All orders',           ar: 'كل الطلبات' },
  'fac.pending':           { en: 'Pending',              ar: 'قيد الانتظار' },
  'fac.production':        { en: 'In production',        ar: 'قيد الإنتاج' },
  'fac.shipped':           { en: 'Shipped',              ar: 'تم الشحن' },
  'fac.tbl.order':         { en: 'Order #',              ar: 'رقم الطلب' },
  'fac.tbl.customer':      { en: 'Customer',             ar: 'العميل' },
  'fac.tbl.product':       { en: 'Product',              ar: 'المنتج' },
  'fac.tbl.qty':           { en: 'Qty',                  ar: 'الكمية' },
  'fac.tbl.finish':        { en: 'Finish',               ar: 'التشطيب' },
  'fac.tbl.received':      { en: 'Received',             ar: 'استلام' },
  'fac.tbl.status':        { en: 'Status',               ar: 'الحالة' },
  'fac.tbl.action':        { en: 'Action',               ar: 'إجراء' },
  'fac.view':              { en: 'View details',         ar: 'عرض التفاصيل' },
  'fac.specs':             { en: 'Specifications',       ar: 'المواصفات' },
  'fac.artwork':           { en: 'Artwork preview',      ar: 'معاينة التصميم' },
  'fac.download':          { en: 'Download production file (PDF)', ar: 'تنزيل ملف الإنتاج (PDF)' },
  'fac.next':              { en: 'Mark as next stage',   ar: 'الانتقال للمرحلة التالية' },

  /* Common */
  'common.add_to_cart':    { en: 'Add to cart',          ar: 'أضف إلى السلة' },
  'common.proceed':        { en: 'Proceed to checkout',  ar: 'إتمام الطلب' },
  'common.copyright':      { en: '© 2026 IMPRINT. All rights reserved.', ar: '© ٢٠٢٦ إمبرنت. جميع الحقوق محفوظة.' },
  'common.terms':          { en: 'Terms',                ar: 'الشروط' },
  'common.privacy':        { en: 'Privacy',              ar: 'الخصوصية' },
  'common.contact':        { en: 'Contact',              ar: 'تواصل' },
};

/* Apply translations to all data-i18n elements AND legacy data-en/data-ar */
function applyTranslations() {
  var lang = getLang();
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var key = el.getAttribute('data-i18n');
    if (!IMPRINT_T[key]) return;
    var text = IMPRINT_T[key][lang] || IMPRINT_T[key].en;
    if (el.hasAttribute('data-i18n-html')) {
      el.innerHTML = text.replace(/\n/g, '<br>');
    } else {
      el.textContent = text;
    }
  });
  /* placeholder version */
  document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
    var key = el.getAttribute('data-i18n-placeholder');
    if (!IMPRINT_T[key]) return;
    el.placeholder = IMPRINT_T[key][lang] || IMPRINT_T[key].en;
  });
  /* Legacy data-en / data-ar (used in configurator). Only update text nodes
     when the element has direct text content (avoid clobbering children) */
  document.querySelectorAll('[data-en]').forEach(function(el) {
    var en = el.getAttribute('data-en');
    var ar = el.getAttribute('data-ar');
    var text = lang === 'ar' && ar ? ar : en;
    if (text == null) return;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      if (el.placeholder !== undefined) el.placeholder = text;
    } else if (el.children.length === 0) {
      el.textContent = text;
    } else {
      /* If the element has children but only one is a direct text node, replace it */
      var hasOnlyTextDirect = Array.from(el.childNodes).every(function(n) { return n.nodeType === 3; });
      if (hasOnlyTextDirect) el.textContent = text;
    }
  });
}

/* Shortcut for getting a string */
function t(key) {
  var lang = getLang();
  if (!IMPRINT_T[key]) return key;
  return IMPRINT_T[key][lang] || IMPRINT_T[key].en;
}

/* ─── HEADER RENDERER ──────────────────────────── */
function initSiteHeader(opts) {
  opts = opts || {};
  var activePage = opts.activePage || '';
  var breadcrumb = opts.breadcrumb || '';
  var showCart   = opts.showCart !== false;
  var role       = opts.role || '';
  var mount      = document.getElementById('site-header');
  if (!mount) return;

  var c = getCountry();
  var code = getCountryCode();
  var lang = getLang();
  var cartCount = getCartCount();

  /* Country options */
  var countryOpts = Object.keys(GCC).map(function(k) {
    var g = GCC[k];
    var name = lang === 'ar' ? g.nameAr : g.name;
    var cur  = lang === 'ar' ? g.currencyAr : g.currency;
    return '<div class="country-option' + (k === code ? ' selected' : '') + '" onclick="imprintSetCountry(\'' + k + '\')">' +
      '<span class="flag">' + g.flag + '</span>' +
      '<span class="country-name">' + name + '</span>' +
      '<span class="currency-code">' + cur + '</span>' +
    '</div>';
  }).join('');

  /* Path prefix for subdirectory pages */
  var rootPath = (window.location.pathname.indexOf('/designer/') >= 0 ||
                  window.location.pathname.indexOf('/factory/') >= 0) ? '../' : '';

  /* Center content */
  var centerHtml = '';
  if (breadcrumb) {
    centerHtml = '<nav class="header-breadcrumb">' + breadcrumb + '</nav>';
  } else if (role) {
    centerHtml = '<div class="role-badge"><span class="dot"></span>' + role + '</div>';
  }

  /* Cart pill */
  var cartLabel = t('nav.cart');
  var cartHtml = showCart
    ? '<a class="cart-pill" href="' + rootPath + 'checkout.html">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 01-8 0"/></svg>' +
        '<span>' + cartLabel + ' (' + cartCount + ')</span>' +
      '</a>'
    : '';

  /* Theme icons */
  var themeSvg =
    '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>' +
    '<svg class="icon-sun"  viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';

  mount.innerHTML =
    '<header class="site-header">' +
      '<a class="site-logo" href="' + rootPath + 'index.html">IMPRINT<span class="reg">®</span></a>' +
      centerHtml +
      '<div class="header-actions">' +
        '<div class="country-selector" id="country-selector">' +
          '<button class="country-btn" onclick="imprintToggleCountry()" aria-label="Select country">' +
            '<span class="flag">' + c.flag + '</span>' +
            '<span class="currency" id="country-btn-label">' + (lang === 'ar' ? c.currencyAr : c.currency) + '</span>' +
            '<svg class="chevron" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1l4 4 4-4"/></svg>' +
          '</button>' +
          '<div class="country-dropdown">' + countryOpts + '</div>' +
        '</div>' +
        '<button class="theme-toggle" onclick="imprintToggleTheme()" aria-label="Toggle theme">' + themeSvg + '</button>' +
        '<button class="lang-toggle" onclick="imprintToggleLang()" aria-label="Toggle language">' +
          '<span id="shared-le" class="' + (lang === 'en' ? 'on' : '') + '">EN</span>' +
          '<span class="sep">/</span>' +
          '<span id="shared-la" class="' + (lang === 'ar' ? 'on' : '') + '">ع</span>' +
        '</button>' +
        cartHtml +
      '</div>' +
    '</header>';

  /* Close dropdown on outside click */
  document.addEventListener('click', function(e) {
    var sel = document.getElementById('country-selector');
    if (sel && !sel.contains(e.target)) sel.classList.remove('open');
  });

  /* Apply translations on first paint */
  applyTranslations();
}

/* ─── COUNTRY / THEME / LANG ACTIONS ───────────── */
function imprintToggleCountry() {
  var sel = document.getElementById('country-selector');
  if (sel) sel.classList.toggle('open');
}
function imprintSetCountry(code) {
  setCountryCode(code);
  /* Trigger a page event so callers can refresh prices without full reload */
  var evt = new CustomEvent('imprint:countrychange', { detail: { code: code } });
  document.dispatchEvent(evt);
  /* Default: reload to refresh all prices everywhere */
  window.location.reload();
}
function imprintToggleTheme() {
  var t = getTheme();
  setTheme(t === 'dark' ? 'light' : 'dark');
  var evt = new CustomEvent('imprint:themechange');
  document.dispatchEvent(evt);
}
function imprintToggleLang() {
  var lang = getLang() === 'en' ? 'ar' : 'en';
  setLang(lang);
  var isAr = lang === 'ar';
  document.documentElement.setAttribute('dir', isAr ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', isAr ? 'ar' : 'en');
  /* Update toggle UI */
  var le = document.getElementById('shared-le');
  var la = document.getElementById('shared-la');
  if (le) le.className = isAr ? '' : 'on';
  if (la) la.className = isAr ? 'on' : '';
  /* Update country currency code label */
  var c = getCountry();
  var btnLabel = document.getElementById('country-btn-label');
  if (btnLabel) btnLabel.textContent = isAr ? c.currencyAr : c.currency;
  /* Apply translations */
  applyTranslations();
  /* Notify pages so they can refresh dynamic content */
  var evt = new CustomEvent('imprint:langchange', { detail: { lang: lang } });
  document.dispatchEvent(evt);
}

/* ─── STAR RENDERER ────────────────────────────── */
function renderStars(rating, max) {
  max = max || 5;
  var html = '<span class="stars" aria-label="' + rating + ' out of ' + max + ' stars">';
  for (var i = 1; i <= max; i++) {
    html += i <= rating ? '★' : '<span class="empty">★</span>';
  }
  return html + '</span>';
}

/* ─── ORDER ID GENERATOR ───────────────────────── */
function generateOrderId() {
  var n = Math.floor(1000 + Math.random() * 9000);
  return 'IMP-' + n;
}

/* ─── TOAST ────────────────────────────────────── */
function imprintToast(msg) {
  var el = document.createElement('div');
  el.className = 'imp-toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(function() {
    el.style.transition = 'opacity 0.3s ease';
    el.style.opacity = '0';
    setTimeout(function() { el.remove(); }, 300);
  }, 2400);
}
