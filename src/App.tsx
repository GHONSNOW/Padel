import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, query } from "firebase/firestore";
import { 
  Calendar, Clock, LogOut, Shield, ChevronRight, User as UserIcon,
  CheckCircle2, AlertTriangle, Building, ThumbsUp, MapPin, Star,
  X, Compass, Heart, Share2, Info, Loader2, Play, ChevronLeft, Ban
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { auth, db, googleProvider, handleFirestoreError, OperationType } from "./firebase";
import { Court, Booking, BlockedDate } from "./types";
import { CalendarView } from "./components/CalendarView";
import { AdminPanel } from "./components/AdminPanel";

// Static Courts Data with matching images from our assets directory
const COURTS: Court[] = [
  {
    id: "paund-four-arena",
    name: "Paund Four Arena",
    type: "Крытый корт",
    address: "ул. Акушинского, 98, Махачкала",
    price: 2000,
    rating: 4.9,
    image: "/src/assets/images/indoor_padel_court_1779487360055.png",
    description: "Премиальный закрытый падл корт в центре города. Профессиональное ультра-покрытие, превосходное панорамное освещение, комфортные раздевалки, душевые и зона отдыха с бесплатным чаем.",
    features: ["Крытый купол", "Охраняемая парковка", "Раздевалки", "Фитнес-душ", "Кафе-бар"]
  },
  {
    id: "sea-side-padel",
    name: "Sea Side Padel",
    type: "Открытый корт",
    address: "ул. Лаптиева, 55, Махачкала",
    price: 2000,
    rating: 4.7,
    image: "/src/assets/images/outdoor_padel_court_1779487378844.png",
    description: "Профессиональный открытый падл-корт на самом берегу Каспийского моря. Наслаждайтесь морским бризом и живописным закатом во время захватывающий игры под открытым небом.",
    features: ["Открытый воздух", "Вид на море", "Освещение 1000W", "Пляжная зона", "Прокат ракеток"]
  },
  {
    id: "kaspiysk-padel-prime",
    name: "Kaspiysk Padel Prime",
    type: "Крытый корт",
    address: "пр. Акулиничева, 15, Каспийск",
    price: 2000,
    rating: 4.8,
    image: "/src/assets/images/indoor_padel_court_1779487360055.png",
    description: "Новейший корт со шведским искусственным покрытием наивысшего качества. Просторные залы, сертифицированные тренеры и регулярные любительские турниры с крутыми призами.",
    features: ["Крытый зал", "Профи-покрытие", "Тренировочная зона", "Магазин экипировки", "Вентиляция"]
  }
];

export default function App() {
  // State
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"book" | "my-bookings" | "admin">("book");
  
  // Database data
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  
  // Selection
  const [selectedCourt, setSelectedCourt] = useState<Court>(COURTS[0]);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  
  // UI States
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingSuccessCode, setBookingSuccessCode] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>(["paund-four-arena"]);
  const [viewingCourt, setViewingCourt] = useState<Court | null>(null);
  const [cancelStatusMsg, setCancelStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // 1. Listen to Authenticated User
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Realtime sync with Firestore database when user is logged in
  useEffect(() => {
    if (!user) return;

    const bookingsPath = "bookings";
    const unsubscribeBookings = onSnapshot(collection(db, bookingsPath), (snapshot) => {
      const list: Booking[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Booking);
      });
      // Sort in-client: creation timestamp descending
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setBookings(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, bookingsPath);
    });

    const blockedPath = "blockedDates";
    const unsubscribeBlocked = onSnapshot(collection(db, blockedPath), (snapshot) => {
      const list: BlockedDate[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as BlockedDate);
      });
      setBlockedDates(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, blockedPath);
    });

    return () => {
      unsubscribeBookings();
      unsubscribeBlocked();
    };
  }, [user]);

  // Auth Handlers
  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Popup Sign-in Error: ", error);
      alert("Не удалось войти через Google. Попробуйте еще раз.");
    }
  };

  const handleSignOut = async () => {
    if (confirm("Вы уверены, что хотите выйти из аккаунта?")) {
      await signOut(auth);
      setActiveTab("book");
    }
  };

  // Check if admin
  const isAdmin = user?.email === "halilovramazan394@gmail.com";

  // Booking creator
  const executeBooking = async () => {
    if (!user) {
      alert("Пожалуйста, авторизуйтесь перед бронированием корта.");
      return;
    }
    if (selectedSlots.length === 0) {
      alert("Пожалуйста, выберите хотя бы один свободный часовой слот.");
      return;
    }

    // Verify day is not blocked
    const isBlocked = blockedDates.some(b => b.date === selectedDate);
    if (isBlocked) {
      alert("Эта дата временно заблокирована администратором.");
      return;
    }

    setSubmittingBooking(true);
    const bookingId = `book-${Date.now()}`;
    const code = `PP-${Math.floor(100 + Math.random() * 900)}-${Math.random().toString(36).substring(2, 4).toUpperCase()}`;
    const path = "bookings";

    const payload: Booking = {
      id: bookingId,
      courtId: selectedCourt.id,
      courtName: selectedCourt.name,
      userId: user.uid,
      userEmail: user.email || "",
      userName: user.displayName || "Игрок Padel",
      date: selectedDate,
      timeSlots: selectedSlots,
      hoursCount: selectedSlots.length,
      totalPrice: selectedSlots.length * 2000,
      bookingCode: code,
      createdAt: new Date().toISOString(),
      status: "active"
    };

    try {
      await setDoc(doc(db, path, bookingId), payload);
      setBookingSuccessCode(code);
      setSelectedSlots([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `${path}/${bookingId}`);
    } finally {
      setSubmittingBooking(false);
    }
  };

  // Booking Cancel Handler (User can cancel their own, Admin can cancel any)
  const cancelBooking = async (id: string) => {
    setCancellingId(id);
    setCancelStatusMsg(null);
    const path = "bookings";
    try {
      const bRef = doc(db, path, id);
      await updateDoc(bRef, { status: "cancelled" });
      setCancelStatusMsg({ type: "success", text: "Ваше бронирование успешно отменено!" });
      setTimeout(() => setCancelStatusMsg(null), 7000);
    } catch (error) {
      console.error("Firestore cancellation error:", error);
      setCancelStatusMsg({ 
        type: "error", 
        text: "Не удалось отменить бронирование. У вас есть права только на отмену собственных активных сессий." 
      });
      setTimeout(() => setCancelStatusMsg(null), 8000);
    } finally {
      setCancellingId(null);
    }
  };

  // Block Date Handler (Admin only)
  const blockDate = async (date: string, reason: string) => {
    const path = "blockedDates";
    try {
      const dRef = doc(db, path, date);
      await setDoc(dRef, {
        date,
        reason,
        blockedBy: user?.email || "admin"
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `${path}/${date}`);
    }
  };

  // Unblock Date Handler (Admin only)
  const unblockDate = async (date: string) => {
    const path = "blockedDates";
    try {
      const dRef = doc(db, path, date);
      await deleteDoc(dRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${date}`);
    }
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (favorites.includes(id)) {
      setFavorites(favorites.filter(f => f !== id));
    } else {
      setFavorites([...favorites, id]);
    }
  };

  // Filter bookings for regular player
  const myBookings = bookings.filter(b => 
    b.userId === user?.uid || 
    (b.userEmail && user?.email && b.userEmail.toLowerCase() === user.email.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center font-sans text-brand-blue">
        <Loader2 className="w-10 h-10 text-brand-red animate-spin" />
        <p className="text-[10px] font-black text-brand-blue mt-4 uppercase tracking-widest font-display">Подготовка корта P4...</p>
      </div>
    );
  }

  // SIGN IN COMPONENT
  if (!user) {
    return (
      <div 
        className="min-h-screen bg-brand-cream text-brand-dark flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans"
        id="sign-in-gate"
      >
        {/* Artistic tennis/padel net background */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.05] flex items-center justify-center">
          <svg className="w-full h-full scale-120" viewBox="0 0 100 200" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="5" y="5" width="90" height="190" />
            <line x1="5" y1="95" x2="95" y2="95" />
            <line x1="15" y1="5" x2="15" y2="195" strokeDasharray="2" />
            <line x1="85" y1="5" x2="85" y2="195" strokeDasharray="2" />
          </svg>
        </div>

        {/* Abstract Glowing Accent */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-brand-blue/10 blur-[130px] pointer-events-none" />

        <div className="w-full max-w-md bg-brand-dark text-white border border-brand-blue/30 p-8 rounded-3xl text-center relative z-10 space-y-8 shadow-2xl">
          
          {/* Brand Logo */}
          <div className="flex flex-col items-center gap-2">
            <div className="h-14 w-14 bg-brand-red rounded-2xl flex items-center justify-center shadow-lg shadow-brand-red/20 transition-transform hover:rotate-3">
              <span className="font-black italic text-2xl tracking-tighter text-white font-display">P4</span>
            </div>
            <div className="mt-2 text-center">
              <h1 className="text-2xl font-black uppercase tracking-tight text-white flex items-center justify-center gap-1.5 leading-none font-display">
                POUND <span className="text-brand-red">PADEL 4</span>
              </h1>
              <p className="text-[10px] text-brand-cream/80 font-black uppercase tracking-widest mt-1">
                МАХАЧКАЛА
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-black text-brand-cream uppercase tracking-tight font-display">Добро пожаловать в клуб!</h2>
            <p className="text-xs text-slate-300 leading-relaxed font-semibold">
              Авторизуйтесь через ваш Google аккаунт для моментального выбора часов, просмотра календаря свободных/занятых дней и отслеживания своей игровой статистики.
            </p>
          </div>

          {/* Sign In Button */}
          <div className="space-y-4">
            <button
              onClick={handleGoogleSignIn}
              className="w-full bg-brand-red hover:bg-brand-red/90 text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-brand-red/20 transition-all active:scale-98 outline-none text-xs tracking-wider uppercase font-display cursor-pointer"
            >
              {/* Google Colors Vector */}
              <svg className="w-4 h-4 text-white fill-current" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Войти через Google
            </button>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Вход абсолютно безопасен и защищен Firebase Security Gate &trade;
            </p>
          </div>
        </div>
      </div>
    );
  }

  // AUTHENTICATED WEB APP INTERFACE
  return (
    <div className="min-h-screen bg-brand-cream text-slate-800 flex flex-col font-sans" id="court-web-app">
      
      {/* EXTREMELY POLISHED RESPONSIVE WEB NAVBAR */}
      <header className="bg-brand-blue text-white shadow-md sticky top-0 z-50 px-4 sm:px-6 py-3.5 flex-shrink-0 border-b border-white/10" id="main-web-header">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3.5 md:gap-4">
          
          {/* Brand/Logo and mobile profile controls */}
          <div className="w-full md:w-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-brand-red rounded-xl flex items-center justify-center text-white font-black italic shadow-md shadow-brand-red/20 font-display transition-transform hover:-rotate-3">
                <span className="text-sm tracking-tighter">P4</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="text-base sm:text-lg font-black tracking-widest uppercase text-white leading-none font-display">
                    POUND <span className="text-brand-red">PADEL 4</span>
                  </span>
                  <span className="text-[9px] bg-brand-dark/40 text-brand-cream border border-white/10 font-black px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">МАХАЧКАЛА</span>
                </div>
                <p className="text-[10px] text-brand-cream/80 mt-1 font-medium">Личный спортивный ассистент &bull; Корты 1-го класса</p>
              </div>
            </div>

            {/* Mobile Profile & Logout Controls (Only visible under md) */}
            <div className="flex md:hidden items-center gap-2">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Avatar" 
                  className="h-8 w-8 rounded-lg object-contain border border-white/10 bg-brand-dark" 
                />
              ) : (
                <div className="h-8 w-8 rounded-lg bg-brand-red text-white flex items-center justify-center font-black uppercase text-xs font-display">
                  {user.email?.slice(0, 2)}
                </div>
              )}
              <button
                onClick={handleSignOut}
                className="p-1.5 hover:bg-white/10 rounded-lg text-brand-cream/80 hover:text-rose-400 transition-colors cursor-pointer"
                title="Выйти"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Area */}
          <div className="flex items-center gap-1 bg-brand-dark/30 p-1 rounded-2xl border border-white/10 w-full sm:w-auto justify-center">
            <button
              onClick={() => {
                setActiveTab("book");
                setViewingCourt(null);
              }}
              className={`px-3.5 sm:px-5 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === "book" ? "bg-brand-red text-white shadow-md font-extrabold" : "text-brand-cream/80 hover:text-white font-bold"
              }`}
            >
              Забронировать
            </button>

            <button
              onClick={() => setActiveTab("my-bookings")}
              className={`px-3.5 sm:px-5 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "my-bookings" ? "bg-brand-red text-white shadow-md font-extrabold" : "text-brand-cream/80 hover:text-white font-bold"
              }`}
            >
              Мои Игры
              {myBookings.filter(b => b.status === "active").length > 0 && (
                <span className="h-2 w-2 bg-brand-red rounded-full inline-block animate-pulse"></span>
              )}
            </button>

            {/* Privileged Admin Tab */}
            {isAdmin && (
              <button
                onClick={() => setActiveTab("admin")}
                className={`px-3.5 sm:px-5 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border border-brand-red/30 ${
                  activeTab === "admin" 
                    ? "bg-white text-brand-blue shadow-md font-black" 
                    : "text-brand-cream/80 hover:text-brand-red"
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Админ
              </button>
            )}
          </div>

          {/* Desktop User Profile Controls (Hidden under md) */}
          <div className="hidden md:flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs font-bold text-slate-100 block">{user.displayName || "Рамазан Игрок"}</span>
              <span className="text-[10px] text-brand-cream font-mono block font-bold leading-none mt-0.5">{user.email}</span>
            </div>
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="Avatar" 
                className="h-10 w-10 rounded-xl object-contain border border-white/10 bg-brand-dark" 
              />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-brand-red text-white flex items-center justify-center font-black uppercase text-sm font-display">
                {user.email?.slice(0, 2)}
              </div>
            )}
            <button
              onClick={handleSignOut}
              className="p-2.5 hover:bg-white/10 rounded-xl text-brand-cream/80 hover:text-rose-400 transition-colors cursor-pointer"
              title="Выйти"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* BODY CONTEXTS CONTAINER */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 lg:py-10 w-full" id="workspace-main-content">
        
        {/* TAB 1: BOOK COURT */}
        {activeTab === "book" && !viewingCourt && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-150 pb-5">
              <div>
                <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight font-display">
                  Выберите корт для игры
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Нажмите на любой корт ниже, чтобы открыть его персональную страницу, ознакомиться со сводкой правил клуба и забронировать часы игры.
                </p>
              </div>
              <span className="text-xs font-black text-brand-blue bg-brand-blue/10 rounded-xl px-3 py-1.5 whitespace-nowrap font-display">
                Доступно площадок: {COURTS.length}
              </span>
            </div>

            {/* List of Courts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {COURTS.map(court => {
                const isFav = favorites.includes(court.id);

                return (
                  <div
                    key={court.id}
                    onClick={() => {
                      setSelectedCourt(court);
                      setViewingCourt(court);
                      setSelectedSlots([]); // Reset selected slots when toggling courts
                    }}
                    className="group bg-white rounded-3xl overflow-hidden cursor-pointer border border-slate-150 hover:border-brand-blue/40 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col h-full"
                  >
                    {/* Court Image with Rating Badge */}
                    <div className="h-56 relative bg-slate-150 overflow-hidden">
                      <img 
                        src={court.image} 
                        alt={court.name}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      {/* Rating info tag */}
                      <div className="absolute top-4 left-4 bg-brand-blue text-white text-[10px] font-black tracking-widest shadow-md px-3 py-1.5 rounded-xl flex items-center gap-1 z-10 backdrop-blur-xs font-display">
                        <Star className="w-3.5 h-3.5 fill-current text-brand-red" />
                        <span>{court.rating}</span>
                      </div>

                      {/* Favorite button */}
                      <button
                        onClick={(e) => toggleFavorite(court.id, e)}
                        className="absolute top-4 right-4 p-2 bg-white/95 hover:bg-white text-rose-500 rounded-full shadow-md z-10 transition-colors cursor-pointer"
                      >
                        <Heart className={`w-4 h-4 ${isFav ? "fill-rose-500 text-rose-500" : "text-rose-400"}`} />
                      </button>
                    </div>

                    {/* Court Info elements */}
                    <div className="p-6 flex flex-col flex-1 justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[9px] uppercase font-black text-slate-500 bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg inline-block font-display">
                            {court.type}
                          </span>
                          <span className="text-sm font-black text-brand-blue font-mono">2 000 ₽ / ч.</span>
                        </div>
                        <h4 className="text-base font-black text-slate-950 leading-tight font-display">{court.name}</h4>
                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                          {court.description}
                        </p>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-slate-100">
                        {/* Tags list */}
                        <div className="flex flex-wrap gap-1">
                          {court.features.slice(0, 3).map(f => (
                            <span 
                              key={f} 
                              className="text-[9px] font-bold text-slate-500 bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-full whitespace-nowrap uppercase tracking-wider"
                            >
                              {f}
                            </span>
                          ))}
                          {court.features.length > 3 && (
                            <span className="text-[9px] font-bold text-brand-blue bg-brand-blue/5 px-2 py-0.5 rounded-full whitespace-nowrap">
                              +{court.features.length - 3} еще
                            </span>
                          )}
                        </div>

                        {/* CTA button placeholder */}
                        <div className="w-full bg-brand-cream text-brand-blue group-hover:bg-brand-blue group-hover:text-white text-[10px] font-black uppercase tracking-wider text-center py-3.5 rounded-xl transition-all font-display">
                          Открыть страницу корта &rarr;
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 1: DEDICATED INDIVIDUAL COURT PAGE */}
        {activeTab === "book" && viewingCourt && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            {/* Elegant header bar and fast back action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-150 pb-4">
              <button
                onClick={() => setViewingCourt(null)}
                className="group flex items-center gap-1.5 text-slate-700 hover:text-brand-blue font-black text-[10px] uppercase tracking-wider bg-white border border-slate-200 hover:border-brand-blue/30 px-4 py-2.5 rounded-2xl shadow-xs transition-all cursor-pointer w-fit"
              >
                <ChevronLeft className="w-4 h-4 text-brand-red group-hover:-translate-x-0.5 transition-transform" />
                Назад ко всем кортам
              </button>
              
              <span className="text-[9px] bg-brand-red text-white py-1.5 px-3 rounded-lg font-black uppercase tracking-widest font-mono self-start sm:self-auto">
                КОД КОРТА: {viewingCourt.id.toUpperCase()}
              </span>
            </div>

            {/* Immersive Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* L: Court profile metrics, photos & precise sports guidelines rules (Ordered 2nd on mobile) */}
              <div className="lg:col-span-5 space-y-6 order-2 lg:order-1">
                
                {/* Showcase Court Panel */}
                <div className="bg-white border border-slate-150 rounded-3xl overflow-hidden shadow-xs">
                  <div className="h-60 relative bg-slate-100">
                    <img 
                      src={viewingCourt.image} 
                      alt={viewingCourt.name} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 left-4 bg-brand-blue text-white text-[10px] font-black tracking-widest shadow-md px-3 py-1.5 rounded-xl flex items-center gap-1 z-10 font-display">
                      <Star className="w-3.5 h-3.5 fill-current text-brand-red" />
                      <span>{viewingCourt.rating} &bull; Превосходно</span>
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    <span className="text-[10px] uppercase font-black text-brand-blue bg-brand-blue/10 px-2.5 py-1 rounded-lg inline-block font-display">
                      {viewingCourt.type}
                    </span>
                    <h3 className="text-xl font-black text-slate-950 font-display leading-tight">{viewingCourt.name}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 font-bold">
                      <MapPin className="text-brand-red w-4 h-4 flex-shrink-0" /> 
                      {viewingCourt.address}
                    </p>
                    
                    <p className="text-xs leading-relaxed text-slate-500 font-medium pt-3 border-t border-slate-100">
                      {viewingCourt.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {viewingCourt.features.map(f => (
                        <span 
                          key={f} 
                          className="text-[9px] font-black text-slate-600 bg-slate-50 border border-slate-150 px-2.5 py-1 rounded-full uppercase tracking-wide"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RULES GUIDELINES CARD (Required Russian сводка правил) */}
                <div className="bg-brand-dark text-white rounded-3xl p-6 border border-brand-blue/20 shadow-md space-y-5">
                  <div className="border-b border-white/10 pb-3 flex items-center justify-between">
                    <h4 className="text-xs font-black text-brand-cream uppercase tracking-wider flex items-center gap-2 font-display">
                      <Shield className="w-4 h-4 text-brand-red" />
                      СВОД ПРАВИЛ КЛУБА И КОРТА
                    </h4>
                    <span className="text-[8px] bg-brand-red/20 text-brand-red px-2 py-0.5 rounded-md font-black uppercase font-mono">ВАЖНО</span>
                  </div>

                  <div className="space-y-4">
                    {/* Rule 1 */}
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center text-lg flex-shrink-0 shadow-inner">
                        👟
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-brand-cream uppercase tracking-tight font-display">Сменная чистая обувь</h5>
                        <p className="text-[11px] text-slate-300 leading-normal mt-1 font-semibold">
                          Приходить строго со сменной чистой обувью. Игра в уличной или грязной обуви категорически запрещена во избежание повреждения ворса.
                        </p>
                      </div>
                    </div>

                    {/* Rule 2 */}
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-xl flex-shrink-0 shadow-inner">
                        🥤
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-brand-cream uppercase tracking-tight font-display">Без напитков на корт</h5>
                        <p className="text-[11px] text-slate-300 leading-normal mt-1 font-semibold">
                          Заходить на профессиональный корт с напитками (соки, сладкая газировка, кофе и проч.) запрещено. Разрешена только чистая вода.
                        </p>
                      </div>
                    </div>

                    {/* Rule 3 */}
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-xl flex-shrink-0 shadow-inner">
                        ⏱️
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-brand-cream uppercase tracking-tight font-display">Выход за 5 минут до конца</h5>
                        <p className="text-[11px] text-slate-300 leading-normal mt-1 font-semibold">
                          Необходимо освобождать корт за 5 минут до окончания действия вашей брони для регламентной очистки и подготовки зоны к игре следующих гостей.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 p-3.5 rounded-2xl flex items-center gap-2.5 text-[10px] text-slate-300 font-semibold leading-relaxed">
                    <Info className="w-5 h-5 text-brand-red flex-shrink-0" />
                    <span>Соблюдение правил игрового регламента гарантирует идеальное состояние покрытия корта P4 для всех игроков!</span>
                  </div>
                </div>

              </div>

              {/* R: Interactive Reservation Calendar & slot picker (7 cols, Ordered 1st on mobile) */}
              <div className="lg:col-span-7 space-y-6 order-1 lg:order-2">
                
                {/* Court Indicator Banner */}
                <div className="bg-brand-dark text-white rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-brand-blue/15">
                  <div>
                    <span className="text-[9px] text-brand-cream uppercase font-black tracking-widest block font-display">ВЫ ОФОРМЛЯЕТЕ БРОНЬ НА КОРТ</span>
                    <h4 className="text-base font-black text-white mt-1 font-display">{viewingCourt.name}</h4>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Цена аренды</span>
                    <span className="text-lg font-black text-brand-red block font-mono mt-0.5">2 000 ₽ <span className="text-[9px] text-slate-400">/ час</span></span>
                  </div>
                </div>

                {/* Calendar Selector Component */}
                <CalendarView
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  selectedSlots={selectedSlots}
                  setSelectedSlots={setSelectedSlots}
                  bookings={bookings}
                  blockedDates={blockedDates}
                />

                {/* Checkout pricing sum and booking submitter */}
                {selectedSlots.length > 0 && (
                  <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-250">
                    <div className="text-center sm:text-left">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest font-display">Выбранная дата</span>
                      <span className="text-base font-black text-slate-900 block mt-1 font-display">
                        {new Date(selectedDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })} &bull; {selectedSlots.length} ч.
                      </span>
                    </div>

                    <button
                      onClick={executeBooking}
                      disabled={submittingBooking}
                      className="w-full sm:w-auto bg-brand-red text-white hover:bg-brand-red/90 font-black px-8 py-4 rounded-2xl shadow-lg shadow-brand-red/10 transition-all uppercase tracking-widest cursor-pointer disabled:opacity-50 text-xs flex items-center justify-center gap-2 font-display"
                    >
                      {submittingBooking ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          Обработка брони...
                        </>
                      ) : (
                        <>
                          Оформить аренду &bull; {selectedSlots.length * 2000} ₽
                        </>
                      )}
                    </button>
                  </div>
                )}

              </div>

            </div>
          </div>
        )}

        {/* TAB 2: MY BOOKINGS LIST */}
        {activeTab === "my-bookings" && (
          <div className="bg-white border border-slate-100 rounded-3xl p-6 lg:p-8 shadow-xs max-w-3xl mx-auto space-y-6">
            
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight font-display">Мои Игровые Сессии</h3>
              <p className="text-xs text-slate-500 mt-1">Список ваших зарезервированных часов. Назовите код администратору при входе на площадку.</p>
            </div>

            {cancelStatusMsg && (
              <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs md:text-sm font-bold leading-relaxed border transition-all animate-in fade-in slide-in-from-top-1 duration-200 ${
                cancelStatusMsg.type === "success" 
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}>
                {cancelStatusMsg.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 animate-bounce" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                )}
                <span>{cancelStatusMsg.text}</span>
              </div>
            )}

            {myBookings.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center justify-center gap-3">
                <Calendar className="w-12 h-12 text-slate-300 animate-pulse" />
                <span className="text-sm text-slate-500 font-bold">Вы пока не бронировали площадки в нашем клубе.</span>
                <button
                  onClick={() => setActiveTab("book")}
                  className="mt-4 bg-brand-red text-white font-black px-6 py-3 rounded-2xl text-xs uppercase tracking-widest transition-all hover:bg-brand-red/90 cursor-pointer font-display shadow-md"
                >
                  Забронировать первый час
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myBookings.map(b => (
                  <div 
                    key={b.id} 
                    className={`border rounded-2xl p-5 relative overflow-hidden transition-all ${
                      b.status === "cancelled" ? "bg-slate-50/70 border-slate-150 opacity-60" : "bg-white border-slate-100 shadow-3xs hover:border-slate-350"
                    }`}
                  >
                    {/* Color Status bar tag */}
                    <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                      b.status === "active" ? "bg-brand-blue" : "bg-slate-300"
                    }`} />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
                       <div className="flex items-center gap-3.5">
                        <div className="h-12 w-12 bg-brand-blue text-white font-black italic rounded-xl flex items-center justify-center text-sm flex-shrink-0 font-display">
                          P4
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900 leading-snug">{b.courtName}</h4>
                          <span className="text-[10px] font-mono font-bold text-slate-450 block mt-1">Код брони: {b.bookingCode}</span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-slate-450 block font-bold uppercase tracking-wider font-display">Резерв времени</span>
                        <span className="text-sm font-black text-slate-950 block mt-1">
                          {new Date(b.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                        </span>
                        <span className="text-xs text-brand-red block leading-tight mt-1 font-bold font-mono">
                          Часы: {b.timeSlots.join(", ")}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-50 mt-4 pt-4 text-xs font-semibold">
                      <div className="flex items-center gap-4 text-slate-400 font-display">
                        <div>
                          <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider">Длительность</span>
                          <span className="text-slate-900 font-black mt-0.5 block font-mono">{b.hoursCount} ч.</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider">Оплачено</span>
                          <span className="text-slate-900 font-black mt-0.5 block font-mono">{b.totalPrice} ₽</span>
                        </div>
                      </div>

                      <div>
                        {b.status === "active" ? (
                          <div className="flex items-center gap-3">
                            <button
                              disabled={cancellingId === b.id}
                              onClick={() => {
                                if (confirm("Вы действительно хотите отменить бронирование? Деньги будут моментально возвращены на баланс.")) {
                                  cancelBooking(b.id);
                                }
                              }}
                              className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl transition-all font-bold uppercase tracking-wide cursor-pointer disabled:opacity-55 disabled:cursor-wait"
                            >
                              {cancellingId === b.id ? "Отмена..." : "Отменить бронь"}
                            </button>
                            <span className="text-[10px] bg-emerald-50 border border-emerald-100 text-emerald-800 px-3 py-2 rounded-xl font-black uppercase tracking-wider flex items-center gap-1 font-display">
                              <CheckCircle2 className="w-3.5 h-3.5 animate-pulse" /> Подтверждено
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-rose-500 bg-rose-50 border border-rose-100 px-3 py-2 rounded-xl font-black uppercase tracking-wider block font-display">Бронь Отменена</span>
                        )}
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* TAB 3: ADMIN PANEL DASHBOARD */}
        {activeTab === "admin" && isAdmin && (
          <AdminPanel
            bookings={bookings}
            blockedDates={blockedDates}
            onCancelBooking={cancelBooking}
            onBlockDate={blockDate}
            onUnblockDate={unblockDate}
          />
        )}

      </main>

      {/* CONFETTI SUCCESS MODAL */}
      <AnimatePresence>
        {bookingSuccessCode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-100 font-sans"
            id="success-checkout-modal"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-white border border-slate-100 rounded-3xl p-8 max-w-sm w-full text-center relative shadow-2xl space-y-6"
            >
              <div className="mx-auto h-16 w-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight font-display">Корт успешно забронирован!</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  Время успешно оплачено и занесено в базу данных. Желаем вам отличной и результативной игры!
                </p>
              </div>

              {/* Code */}
              <div className="bg-brand-dark border border-brand-blue/30 p-4 rounded-2xl font-mono text-center space-y-1">
                <span className="text-[9px] text-slate-400 uppercase font-bold block tracking-widest font-display">Код для доступа ко входу</span>
                <span className="text-xl font-black text-brand-red block tracking-widest">{bookingSuccessCode}</span>
              </div>

              <button
                onClick={() => {
                  setBookingSuccessCode(null);
                  setActiveTab("my-bookings");
                }}
                className="w-full bg-brand-blue hover:bg-brand-blue/90 text-white font-black py-3 px-6 rounded-2xl text-xs uppercase tracking-widest transition-all cursor-pointer font-display"
              >
                Мои бронирования
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Branding line */}
      <footer className="bg-brand-blue text-brand-cream/70 border-t border-white/10 py-8 text-center text-xs mt-12 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-bold tracking-wider font-display">&copy; 2026 POUND PADEL 4 &bull; Все права защищены</p>
          <p className="text-[10px] text-brand-cream/60 mt-1 font-semibold leading-relaxed">Режим работы: Ежедневно, с 08:00 до 23:00. Махачкала, Республика Дагестан</p>
        </div>
      </footer>

    </div>
  );
}
