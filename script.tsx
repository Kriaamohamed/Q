import React, { useState, useEffect, useContext, createContext, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, Sun, Moon, Menu, X, CheckCircle, 
  Instagram, Youtube, Image as ImageIcon, ChevronRight, 
  Settings, ShoppingBag, LayoutDashboard, AlertCircle, Phone, Lock
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, doc, collection, onSnapshot, addDoc, updateDoc, deleteDoc
} from 'firebase/firestore';

// --- Firebase Initialization ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'modex-default';

// Helper to get consistent collection paths
const getPublicPath = (colName) => collection(db, 'artifacts', appId, 'public', 'data', colName);

// --- Translations ---
const translations = {
  en: {
    nav_home: "Home", nav_services: "Services", nav_portfolio: "Portfolio", nav_admin: "Admin",
    hero_title: "Grow Your Social Presence with MoDex",
    hero_subtitle: "Premium social media engagement and professional YouTube thumbnail design to elevate your brand.",
    btn_order: "Order Now", btn_portfolio: "View Portfolio",
    services_title: "Our Premium Services",
    price_per_1k: "DT / 1000", price_flat: "DT / item",
    public_warning: "The account/video must be PUBLIC. Private accounts cannot be processed.",
    form_name: "Full Name", form_phone: "Phone Number (WhatsApp)", form_url: "Link (URL)",
    form_qty: "Quantity", form_notes: "Additional Notes",
    checkout_title: "Complete Your Order",
    payment_method: "Payment Method", pay_card: "Bank Card (Coming Soon)", pay_ooredoo: "Ooredoo (Coming Soon)", pay_cod: "Manual Processing / Transfer",
    btn_confirm: "Confirm Order", total: "Total Price",
    success_msg: "Your order has been received successfully! We will contact you shortly.",
    status_pending: "Pending", status_processing: "Processing", status_completed: "Completed", status_cancelled: "Cancelled",
    admin_orders: "Orders", admin_services: "Services",
  },
  fr: {
    nav_home: "Accueil", nav_services: "Services", nav_portfolio: "Portfolio", nav_admin: "Admin",
    hero_title: "Développez votre présence sociale avec MoDex",
    hero_subtitle: "Engagement premium sur les réseaux sociaux et conception professionnelle de miniatures YouTube.",
    btn_order: "Commander", btn_portfolio: "Voir Portfolio",
    services_title: "Nos Services Premium",
    price_per_1k: "DT / 1000", price_flat: "DT / unité",
    public_warning: "Le compte/vidéo doit être PUBLIC. Les comptes privés ne peuvent pas être traités.",
    form_name: "Nom complet", form_phone: "Numéro de téléphone", form_url: "Lien (URL)",
    form_qty: "Quantité", form_notes: "Notes supplémentaires",
    checkout_title: "Finaliser votre commande",
    payment_method: "Méthode de paiement", pay_card: "Carte Bancaire (Bientôt)", pay_ooredoo: "Ooredoo (Bientôt)", pay_cod: "Traitement Manuel / Virement",
    btn_confirm: "Confirmer la commande", total: "Prix Total",
    success_msg: "Votre commande a été reçue avec succès ! Nous vous contacterons sous peu.",
    status_pending: "En attente", status_processing: "En cours", status_completed: "Terminé", status_cancelled: "Annulé",
    admin_orders: "Commandes", admin_services: "Services",
  },
  ar: {
    nav_home: "الرئيسية", nav_services: "خدماتنا", nav_portfolio: "أعمالنا", nav_admin: "الإدارة",
    hero_title: "عزز تواجدك الاجتماعي مع MoDex",
    hero_subtitle: "خدمات تفاعل استثنائية وتصميم احترافي للصور المصغرة لليوتيوب.",
    btn_order: "اطلب الآن", btn_portfolio: "شاهد أعمالنا",
    services_title: "خدماتنا المميزة",
    price_per_1k: "د.ت / 1000", price_flat: "د.ت / للقطعة",
    public_warning: "يجب أن يكون الحساب/الفيديو عاماً (PUBLIC). لا يمكن معالجة الحسابات الخاصة.",
    form_name: "الاسم الكامل", form_phone: "رقم الهاتف", form_url: "الرابط (URL)",
    form_qty: "الكمية", form_notes: "ملاحظات إضافية",
    checkout_title: "إتمام الطلب",
    payment_method: "طريقة الدفع", pay_card: "بطاقة بنكية (قريباً)", pay_ooredoo: "أوريدو (قريباً)", pay_cod: "معالجة يدوية / تحويل",
    btn_confirm: "تأكيد الطلب", total: "السعر الإجمالي",
    success_msg: "تم استلام طلبك بنجاح! سنتواصل معك قريباً.",
    status_pending: "قيد الانتظار", status_processing: "قيد التنفيذ", status_completed: "مكتمل", status_cancelled: "ملغى",
    admin_orders: "الطلبات", admin_services: "الخدمات",
  }
};

const AppContext = createContext();

export default function App() {
  const [user, setUser] = useState(null);
  const [lang, setLang] = useState('en');
  const [theme, setTheme] = useState('dark');
  const [currentPage, setCurrentPage] = useState('home');
  const [services, setServices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const t = (key) => translations[lang][key] || key;
  const isRTL = lang === 'ar';

  // Theme effect
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Firebase Auth
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
        setIsAdmin(true); // Treat custom token users as admins for demo
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  // Fetch Data
  useEffect(() => {
    if (!user) return;

    // Fetch Services
    const unsubServices = onSnapshot(getPublicPath('services'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setServices(data);
      
      // Seed default data if empty
      if (data.length === 0) {
        seedDefaultServices();
      }
    }, console.error);

    // Fetch Orders
    const unsubOrders = onSnapshot(getPublicPath('orders'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setOrders(data.sort((a, b) => b.createdAt - a.createdAt));
    }, console.error);

    return () => { unsubServices(); unsubOrders(); };
  }, [user]);

  const seedDefaultServices = async () => {
    const defaults = [
      { name: 'Instagram Likes', platform: 'Instagram', type: 'per_1k', price: 5, active: true, icon: 'Instagram' },
      { name: 'Instagram Views', platform: 'Instagram', type: 'per_1k', price: 2, active: true, icon: 'Instagram' },
      { name: 'Instagram Followers', platform: 'Instagram', type: 'per_1k', price: 20, active: true, icon: 'Instagram' },
      { name: 'TikTok Likes', platform: 'TikTok', type: 'per_1k', price: 7, active: true, icon: 'CheckCircle' },
      { name: 'TikTok Views', platform: 'TikTok', type: 'per_1k', price: 1.2, active: true, icon: 'CheckCircle' },
      { name: 'TikTok Followers', platform: 'TikTok', type: 'per_1k', price: 30, active: true, icon: 'CheckCircle' },
      { name: 'YouTube Thumbnail', platform: 'YouTube', type: 'flat', price: 20, active: true, icon: 'Youtube' },
    ];
    for (const svc of defaults) {
      await addDoc(getPublicPath('services'), svc);
    }
  };

  const contextValue = {
    user, lang, setLang, theme, setTheme, t, isRTL, 
    setCurrentPage, services, orders, isAdmin, setIsAdmin
  };

  return (
    <AppContext.Provider value={contextValue}>
      <div className={`min-h-screen font-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0f140f] text-gray-200' : 'bg-gray-50 text-gray-800'} ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
        <Navbar />
        <main className="pt-20">
          <AnimatePresence mode="wait">
            {currentPage === 'home' && <Home key="home" />}
            {currentPage === 'admin' && <AdminDashboard key="admin" />}
          </AnimatePresence>
        </main>
        <WhatsAppCTA />
      </div>
    </AppContext.Provider>
  );
}

function Navbar() {
  const { lang, setLang, theme, setTheme, t, isRTL, setCurrentPage, isAdmin } = useContext(AppContext);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'py-3 bg-white/70 dark:bg-black/70 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 shadow-sm' : 'py-5 bg-transparent'}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        {/* Logo */}
        <div 
          className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-lime-500 to-emerald-600 cursor-pointer tracking-tighter"
          onClick={() => setCurrentPage('home')}
        >
          MoDex.
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center space-x-8 rtl:space-x-reverse">
          <button onClick={() => setCurrentPage('home')} className="hover:text-lime-500 transition-colors font-medium">{t('nav_home')}</button>
          <a href="#services" onClick={() => setCurrentPage('home')} className="hover:text-lime-500 transition-colors font-medium">{t('nav_services')}</a>
          {isAdmin && (
            <button onClick={() => setCurrentPage('admin')} className="text-amber-500 hover:text-amber-400 font-medium flex items-center gap-1">
              <Lock size={16} /> {t('nav_admin')}
            </button>
          )}
        </div>

        {/* Controls */}
        <div className="hidden md:flex items-center space-x-4 rtl:space-x-reverse">
          <div className="flex bg-gray-200 dark:bg-gray-800 rounded-full p-1">
            {['en', 'fr', 'ar'].map(l => (
              <button 
                key={l} 
                onClick={() => setLang(l)}
                className={`px-3 py-1 rounded-full text-xs font-semibold uppercase transition-all ${lang === l ? 'bg-white dark:bg-gray-600 text-black dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}
              >
                {l}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            {theme === 'dark' ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-indigo-600" />}
          </button>
          <button className="bg-gradient-to-r from-lime-600 to-emerald-600 text-white px-5 py-2 rounded-full font-semibold shadow-lg hover:shadow-lime-500/30 transition-all hover:-translate-y-0.5">
            {t('btn_order')}
          </button>
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      
      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 w-full bg-white dark:bg-[#0f140f] border-b border-gray-200 dark:border-gray-800 p-4 shadow-xl md:hidden flex flex-col space-y-4"
          >
            <div className="flex justify-center space-x-4 rtl:space-x-reverse mb-4">
               {['en', 'fr', 'ar'].map(l => (
                  <button 
                    key={l} 
                    onClick={() => {setLang(l); setMobileMenuOpen(false);}}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold uppercase ${lang === l ? 'bg-lime-500 text-white' : 'bg-gray-100 dark:bg-gray-800'}`}
                  >
                    {l}
                  </button>
                ))}
            </div>
            <button className="w-full bg-lime-600 text-white py-3 rounded-lg font-bold">{t('btn_order')}</button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function Home() {
  const { t, services, isRTL } = useContext(AppContext);
  const [selectedService, setSelectedService] = useState(null);

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex flex-col items-center"
    >
      {/* Hero Section */}
      <section className="relative w-full overflow-hidden flex flex-col items-center justify-center min-h-[85vh] text-center px-4">
        {/* Background glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-lime-500/20 rounded-full blur-[120px] pointer-events-none" />
        
        <motion.div 
          initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }}
          className="z-10 max-w-4xl"
        >
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-lime-500/30 bg-lime-500/10 text-lime-600 dark:text-lime-400 font-semibold text-sm backdrop-blur-sm">
            ✨ Premium Digital Services
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight text-gray-900 dark:text-white">
            {t('hero_title')}
          </h1>
          <p className="text-lg md:text-2xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto">
            {t('hero_subtitle')}
          </p>
          <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 ${isRTL ? 'sm:space-x-reverse' : ''}`}>
            <a href="#services" className="px-8 py-4 w-full sm:w-auto bg-gradient-to-r from-lime-600 to-emerald-600 text-white rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(101,163,13,0.4)] hover:shadow-[0_0_30px_rgba(101,163,13,0.6)] hover:-translate-y-1 transition-all">
              {t('btn_order')}
            </a>
            <button className="px-8 py-4 w-full sm:w-auto bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl font-bold text-lg hover:bg-gray-50 dark:hover:bg-white/10 transition-all flex justify-center items-center gap-2">
              <ImageIcon size={20} /> {t('btn_portfolio')}
            </button>
          </div>
        </motion.div>
      </section>

      {/* Services Section */}
      <section id="services" className="w-full py-20 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">{t('services_title')}</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">Choose from our selection of premium services designed to boost your digital presence safely and effectively.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.filter(s => s.active).map(service => (
            <ServiceCard 
              key={service.id} 
              service={service} 
              onOrder={() => setSelectedService(service)} 
            />
          ))}
        </div>
      </section>

      {/* Order Modal */}
      <AnimatePresence>
        {selectedService && (
          <OrderModal service={selectedService} onClose={() => setSelectedService(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ServiceCard({ service, onOrder }) {
  const { t, isRTL } = useContext(AppContext);
  
  const getIcon = () => {
    switch(service.platform) {
      case 'Instagram': return <Instagram size={28} className="text-pink-500" />;
      case 'YouTube': return <Youtube size={28} className="text-red-500" />;
      case 'TikTok': return <span className="font-bold text-xl text-black dark:text-white tracking-tighter">TikTok</span>;
      default: return <CheckCircle size={28} className="text-lime-500" />;
    }
  };

  return (
    <motion.div 
      whileHover={{ y: -5, scale: 1.02 }}
      className="group relative bg-white dark:bg-[#1a1f1a] rounded-2xl p-6 border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-xl dark:hover:shadow-lime-900/20 transition-all overflow-hidden flex flex-col"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-lime-500/10 rounded-full blur-3xl group-hover:bg-lime-500/20 transition-all pointer-events-none" />
      
      <div className="flex justify-between items-start mb-6 z-10">
        <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10">
          {getIcon()}
        </div>
        {service.promo && (
          <span className="bg-red-500/10 text-red-500 px-3 py-1 rounded-full text-xs font-bold uppercase border border-red-500/20">
            Promo
          </span>
        )}
      </div>

      <h3 className="text-2xl font-bold mb-2 z-10">{service.name}</h3>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 flex-grow z-10">
        High quality, fast delivery, and premium support.
      </p>

      <div className="flex items-end justify-between z-10 mt-auto">
        <div>
          <span className="text-3xl font-extrabold text-lime-600 dark:text-lime-400">{service.price}</span>
          <span className="text-gray-500 text-sm ml-1 font-medium">{t(service.type === 'flat' ? 'price_flat' : 'price_per_1k')}</span>
        </div>
        <button 
          onClick={onOrder}
          className="bg-gray-900 dark:bg-white text-white dark:text-black p-3 rounded-xl hover:bg-lime-600 dark:hover:bg-lime-500 hover:text-white transition-colors"
        >
          <ChevronRight size={20} className={isRTL ? 'rotate-180' : ''} />
        </button>
      </div>
    </motion.div>
  );
}

function OrderModal({ service, onClose }) {
  const { t, isRTL, user } = useContext(AppContext);
  const [formData, setFormData] = useState({
    name: '', phone: '', url: '', qty: service.type === 'flat' ? 1 : 1000, notes: '', payment: 'cod'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const totalPrice = useMemo(() => {
    if (service.type === 'flat') return service.price * formData.qty;
    return (formData.qty / 1000) * service.price;
  }, [formData.qty, service]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.url || !formData.phone) return;
    setIsSubmitting(true);
    
    try {
      const orderData = {
        serviceId: service.id,
        serviceName: service.name,
        platform: service.platform,
        customerName: formData.name,
        phone: formData.phone,
        url: formData.url,
        quantity: Number(formData.qty),
        notes: formData.notes,
        totalPrice,
        paymentMethod: formData.payment,
        status: 'pending',
        createdAt: Date.now(),
        userId: user ? user.uid : 'anonymous'
      };
      
      await addDoc(getPublicPath('orders'), orderData);
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error("Order error", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white dark:bg-[#151a15] w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50 dark:bg-white/5">
          <h2 className="text-2xl font-bold">{t('checkout_title')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-black/10 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          {success ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle size={64} className="text-lime-500 mb-4" />
              <h3 className="text-2xl font-bold mb-2">{t('success_msg')}</h3>
              <p className="text-gray-500">Redirecting...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Order Summary Box */}
              <div className="bg-lime-500/10 border border-lime-500/20 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-lime-700 dark:text-lime-400">{service.name}</h4>
                  <p className="text-sm text-gray-500">{service.price} {t(service.type === 'flat' ? 'price_flat' : 'price_per_1k')}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-gray-900 dark:text-white">{totalPrice.toFixed(2)} DT</div>
                  <div className="text-xs text-gray-500">{t('total')}</div>
                </div>
              </div>

              {/* Public Warning */}
              {service.platform !== 'YouTube' && (
                <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-amber-600 dark:text-amber-400">
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{t('public_warning')}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold">{t('form_name')} *</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl p-3 outline-none focus:border-lime-500 transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold">{t('form_phone')} *</label>
                  <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl p-3 outline-none focus:border-lime-500 transition-colors" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold">{t('form_url')} *</label>
                <input required type="url" placeholder="https://" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl p-3 outline-none focus:border-lime-500 transition-colors" />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold">{t('form_qty')} *</label>
                <input 
                  required type="number" 
                  min={service.type === 'flat' ? 1 : 100} 
                  step={service.type === 'flat' ? 1 : 100} 
                  value={formData.qty} 
                  onChange={e => setFormData({...formData, qty: e.target.value})} 
                  className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl p-3 outline-none focus:border-lime-500 transition-colors font-mono text-lg" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold">{t('form_notes')}</label>
                <textarea rows={2} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl p-3 outline-none focus:border-lime-500 transition-colors resize-none" />
              </div>

              {/* Payment Methods */}
              <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-white/5">
                <label className="text-sm font-semibold">{t('payment_method')}</label>
                <div className="grid grid-cols-1 gap-3">
                  <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${formData.payment === 'cod' ? 'border-lime-500 bg-lime-500/5' : 'border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                    <input type="radio" name="payment" value="cod" checked={formData.payment === 'cod'} onChange={() => setFormData({...formData, payment: 'cod'})} className="hidden" />
                    <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${formData.payment === 'cod' ? 'border-lime-500' : 'border-gray-400'}`}>
                      {formData.payment === 'cod' && <div className="w-2.5 h-2.5 bg-lime-500 rounded-full" />}
                    </div>
                    <span className="font-medium">{t('pay_cod')}</span>
                  </label>
                  
                  <label className="flex items-center p-4 border border-gray-200 dark:border-white/10 rounded-xl opacity-60 cursor-not-allowed bg-gray-100 dark:bg-white/5">
                    <input type="radio" disabled className="hidden" />
                    <div className="w-5 h-5 rounded-full border-2 border-gray-400 mr-3" />
                    <span className="font-medium text-gray-500">{t('pay_card')}</span>
                  </label>
                  
                  <label className="flex items-center p-4 border border-gray-200 dark:border-white/10 rounded-xl opacity-60 cursor-not-allowed bg-gray-100 dark:bg-white/5">
                    <input type="radio" disabled className="hidden" />
                    <div className="w-5 h-5 rounded-full border-2 border-gray-400 mr-3" />
                    <span className="font-medium text-gray-500">{t('pay_ooredoo')}</span>
                  </label>
                </div>
              </div>

              <button 
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-lime-600 to-emerald-600 text-white rounded-xl py-4 font-bold text-lg hover:shadow-lg hover:shadow-lime-500/30 transition-all disabled:opacity-70 flex justify-center items-center"
              >
                {isSubmitting ? <span className="animate-spin border-2 border-white/20 border-t-white w-6 h-6 rounded-full mr-2" /> : null}
                {t('btn_confirm')} - {totalPrice.toFixed(2)} DT
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function AdminDashboard() {
  const { t, orders, services, isRTL, isAdmin } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('orders');

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <Lock size={64} className="mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-500">You must be logged in as an administrator.</p>
        </div>
      </div>
    );
  }

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId), {
        status: newStatus
      });
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'processing': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-lime-500 to-emerald-600">
            Admin Dashboard
          </h1>
          <p className="text-gray-500 mt-1">Manage your platform data.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('orders')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'orders' ? 'bg-lime-600 text-white' : 'bg-gray-200 dark:bg-white/10'}`}>Orders</button>
          <button onClick={() => setActiveTab('services')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'services' ? 'bg-lime-600 text-white' : 'bg-gray-200 dark:bg-white/10'}`}>Services</button>
        </div>
      </div>

      {activeTab === 'orders' && (
        <div className="bg-white dark:bg-[#1a1f1a] rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/5">
                  <th className="p-4 font-semibold text-sm">Date</th>
                  <th className="p-4 font-semibold text-sm">Customer</th>
                  <th className="p-4 font-semibold text-sm">Service</th>
                  <th className="p-4 font-semibold text-sm">Amount</th>
                  <th className="p-4 font-semibold text-sm">Status</th>
                  <th className="p-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4 text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="p-4">
                      <div className="font-medium">{order.customerName}</div>
                      <div className="text-xs text-gray-500">{order.phone}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{order.serviceName}</div>
                      <div className="text-xs text-gray-500">Qty: {order.quantity} | <a href={order.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Link</a></div>
                    </td>
                    <td className="p-4 font-bold">{order.totalPrice.toFixed(2)} DT</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(order.status)}`}>
                        {t(`status_${order.status}`) || order.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <select 
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className="bg-transparent border border-gray-300 dark:border-gray-600 rounded p-1 text-sm outline-none"
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan="6" className="p-8 text-center text-gray-500">No orders found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'services' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map(service => (
            <div key={service.id} className="bg-white dark:bg-[#1a1f1a] p-5 rounded-2xl border border-gray-200 dark:border-white/5">
              <h3 className="font-bold text-lg mb-2">{service.name}</h3>
              <div className="text-sm text-gray-500 mb-4">Platform: {service.platform}</div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm font-medium">Price:</span>
                <input 
                  type="number" 
                  defaultValue={service.price}
                  onBlur={(e) => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'services', service.id), { price: Number(e.target.value) })}
                  className="bg-gray-100 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded px-2 py-1 w-24 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input 
                  type="checkbox" 
                  checked={service.active}
                  onChange={(e) => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'services', service.id), { active: e.target.checked })}
                  className="rounded text-lime-500 focus:ring-lime-500"
                />
                Active
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WhatsAppCTA() {
  return (
    <a 
      href="https://wa.me/21627049943" 
      target="_blank" 
      rel="noreferrer"
      className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-[0_4px_20px_rgba(37,211,102,0.4)] hover:scale-110 transition-transform flex items-center justify-center group"
    >
      <Phone size={24} className="animate-pulse" />
      <span className="absolute right-full mr-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Need help? Contact us!
      </span>
    </a>
  );
}