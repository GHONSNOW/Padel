import React, { useState } from "react";
import { 
  TrendingUp, Users, Calendar, AlertTriangle, 
  Lock, Unlock, CheckCircle, XCircle, Search, Trash2 
} from "lucide-react";
import { Booking, BlockedDate } from "../types";

interface AdminPanelProps {
  bookings: Booking[];
  blockedDates: BlockedDate[];
  onCancelBooking: (id: string) => Promise<void>;
  onBlockDate: (date: string, reason: string) => Promise<void>;
  onUnblockDate: (date: string) => Promise<void>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  bookings,
  blockedDates,
  onCancelBooking,
  onBlockDate,
  onUnblockDate,
}) => {
  const [blockDateStr, setBlockDateStr] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "cancelled">("all");
  const [bookingToCancelAdmin, setBookingToCancelAdmin] = useState<Booking | null>(null);

  // Calculate Statistics
  const activeBookings = bookings.filter(b => b.status === "active");
  const totalRevenue = activeBookings.reduce((sum, b) => sum + b.totalPrice, 0);
  const totalHours = activeBookings.reduce((sum, b) => sum + b.hoursCount, 0);

  // Group unique players
  const uniquePlayers = new Set(bookings.map(b => b.userEmail)).size;

  const handleBlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockDateStr) return;
    onBlockDate(blockDateStr, blockReason || "Закрыто на тех. обслуживание");
    setBlockDateStr("");
    setBlockReason("");
  };

  // Filter Bookings for list
  const filteredBookings = bookings.filter(b => {
    const matchesEmail = b.userEmail.toLowerCase().includes(searchEmail.toLowerCase()) || 
                         b.userName.toLowerCase().includes(searchEmail.toLowerCase()) ||
                         b.bookingCode.toLowerCase().includes(searchEmail.toLowerCase());
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    return matchesEmail && matchesStatus;
  });

  return (
    <div className="space-y-8" id="admin-panel-root">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight font-display">Панель Управления [P4]</h2>
        <p className="text-xs text-slate-500 font-medium">Мониторинг доходов клуба, блокировка игрового поля и контроль броней в реальном времени.</p>
      </div>

      {/* Grid Row Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat Card 1 */}
        <div className="bg-brand-dark border border-brand-blue/20 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block font-display">Касса клуба</span>
            <span className="text-2xl font-black text-white mt-1.5 block font-mono">{totalRevenue.toLocaleString("ru-RU")} ₽</span>
            <span className="text-[10px] text-brand-red font-black uppercase tracking-widest mt-1.5 block font-display">Стабильный доход</span>
          </div>
          <div className="p-3 bg-brand-blue/20 rounded-2xl text-brand-red shadow-inner">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Stat Card 2 */}
        <div className="bg-brand-dark border border-brand-blue/20 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block font-display">Сыграно часов</span>
            <span className="text-2xl font-black text-white mt-1.5 block font-mono">{totalHours} ч.</span>
            <span className="text-[10px] text-brand-blue font-bold block mt-1.5">Общая аренда</span>
          </div>
          <div className="p-3 bg-brand-blue/20 rounded-2xl text-brand-blue">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* Stat Card 3 */}
        <div className="bg-brand-dark border border-brand-blue/20 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block font-display">Игроков в системе</span>
            <span className="text-2xl font-black text-white mt-1.5 block font-mono">{uniquePlayers}</span>
            <span className="text-[10px] text-brand-red font-bold block mt-1.5">Уникальные профили</span>
          </div>
          <div className="p-3 bg-brand-blue/20 rounded-2xl text-brand-red">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Stat Card 4 */}
        <div className="bg-brand-dark border border-brand-blue/20 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block font-display">Закрыто дней</span>
            <span className="text-2xl font-black text-rose-400 mt-1.5 block font-mono">{blockedDates.length}</span>
            <span className="text-[10px] text-rose-400 font-bold block mt-1.5">Сервисные работы</span>
          </div>
          <div className="p-3 bg-rose-950/40 rounded-2xl text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Col: Blocking controls */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-black text-slate-950 dark:text-slate-100 flex items-center gap-2 uppercase font-display">
              <Lock className="w-5 h-5 text-rose-600" />
              Блокировка дат
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Блокируйте даты для технических работ или турниров. Эти даты сразу окрасятся в красный цвет и станут недоступны для игроков на календаре.
            </p>
          </div>

          <form onSubmit={handleBlockSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase block mb-1">Выберите дату</label>
              <input 
                type="date"
                required
                value={blockDateStr}
                onChange={(e) => setBlockDateStr(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 font-mono font-bold focus:ring-2 focus:ring-brand-blue outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase block mb-1">Причина закрытия</label>
              <input 
                type="text"
                placeholder="Турнир, тех. работы, закрыто"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-brand-blue outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-brand-red text-white font-black hover:bg-brand-red/90 py-3 rounded-2xl text-xs uppercase tracking-wide transition-all shadow-md cursor-pointer"
            >
              Закрыть день на календаре
            </button>
          </form>

          {/* Blocked Dates List */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider font-display">Деактивированные даты</h4>
            {blockedDates.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Нет заблокированных дней.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {blockedDates.map(bd => (
                  <div key={bd.date} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-xs font-black text-slate-950 dark:text-slate-100 block font-mono">
                        {bd.date}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate block font-medium">{bd.reason}</span>
                    </div>
                    <button
                      onClick={() => onUnblockDate(bd.date)}
                      className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-400 hover:text-emerald-400 rounded-xl transition-colors cursor-pointer"
                      title="Активировать дату обратно"
                    >
                      <Unlock className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Booking list global */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-slate-950 dark:text-slate-100 uppercase font-display">Все Бронирования</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Полный контроль зарезервированного времени.</p>
            </div>

            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 self-start font-display">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${statusFilter === "all" ? "bg-brand-blue text-white shadow-xs" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"}`}
              >
                Все
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${statusFilter === "active" ? "bg-brand-blue text-white shadow-xs" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"}`}
              >
                Прежние
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("cancelled")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${statusFilter === "cancelled" ? "bg-brand-red text-white shadow-xs" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"}`}
              >
                Отмены
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-3 text-sm">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Поиск по Email, имени или коду брони..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="bg-transparent border-none outline-none flex-1 text-slate-800 dark:text-slate-100 text-xs font-semibold placeholder:text-slate-400 placeholder:font-normal"
            />
          </div>

          {/* Bookings Table/Cards */}
          <div className="space-y-3.5 max-h-120 overflow-y-auto pr-1">
            {filteredBookings.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">Бронирования не найдены.</p>
            ) : (
              filteredBookings.map(b => (
                <div 
                  key={b.id} 
                  className={`border rounded-2xl p-4.5 transition-all ${
                    b.status === "cancelled" 
                      ? "bg-slate-50/50 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800 opacity-60" 
                      : "bg-white dark:bg-slate-950 border-slate-150 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-2.5">
                    <div>
                      <span className="text-xs font-black text-slate-950 dark:text-slate-100 block">{b.courtName}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-400 block font-mono font-semibold mt-0.5">Код: {b.bookingCode} &bull; {new Date(b.createdAt).toLocaleString("ru-RU")}</span>
                    </div>
                    <div className="text-right sm:text-right">
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg inline-block ${
                        b.status === "active" 
                          ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" 
                          : "bg-slate-150 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                      }`}>
                        {b.status === "active" ? "Активна" : "Отменена"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 text-[9px] font-black uppercase tracking-wider block">Клиент</span>
                      <span className="font-bold text-slate-950 dark:text-indigo-200 block mt-0.5">{b.userName}</span>
                      {b.userPhone && (
                        <span className="text-[11px] text-brand-red font-bold font-mono block mt-0.5">тел: {b.userPhone}</span>
                      )}
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block mt-0.5">{b.userEmail}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[9px] font-black uppercase tracking-wider block">Детали сеанса</span>
                      <span className="font-bold text-slate-900 dark:text-indigo-100 block mt-0.5 font-mono">
                        {b.date} &bull; {b.timeSlots.join(", ")}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-black block mt-0.5">
                        {b.totalPrice} ₽ ({b.hoursCount} ч.) &bull; {b.paymentMethod === "cash" ? "Наличные" : b.paymentMethod === "transfer" ? "Перевод" : "Онлайн-оплата"}
                      </span>
                    </div>
                  </div>

                  {b.status === "active" && (
                    <div className="flex items-center justify-end mt-4 border-t border-slate-100 pt-3">
                      <button
                        onClick={() => {
                          setBookingToCancelAdmin(b);
                        }}
                        className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        Отменить административно
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Admin custom cancellation confirmation modal */}
      {bookingToCancelAdmin && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-[99999] font-sans" id="admin-cancellation-dialog">
          <div className="bg-white dark:bg-brand-dark border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full relative shadow-2xl space-y-5">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <AlertTriangle className="w-5 h-5 text-brand-red flex-shrink-0" />
              <h4 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-tight font-display">
                Админ-отмена брони
              </h4>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-350">
              <p className="font-bold leading-relaxed">
                Вы действительно хотите выполнить <span className="text-brand-red font-black">административную отмену</span> бронирования на корт <span className="text-slate-900 dark:text-white font-black">{bookingToCancelAdmin.courtName}</span>?
              </p>
              
              <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-150 dark:border-slate-800 space-y-2 font-mono">
                <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase text-[9px]">Код брони:</span> <span className="text-slate-800 dark:text-slate-200 font-extrabold">{bookingToCancelAdmin.bookingCode}</span></div>
                <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-1.5"><span className="text-slate-400 font-bold uppercase text-[9px]">Клиент:</span> <span className="text-slate-800 dark:text-slate-200 font-bold">{bookingToCancelAdmin.userName}</span></div>
                <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-1.5"><span className="text-slate-400 font-bold uppercase text-[9px]">Телефон:</span> <span className="text-brand-red font-bold">{bookingToCancelAdmin.userPhone || "—"}</span></div>
                <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-1.5"><span className="text-slate-400 font-bold uppercase text-[9px]">Сеанс:</span> <span className="text-slate-800 dark:text-slate-200 font-bold text-right">{bookingToCancelAdmin.date} в {bookingToCancelAdmin.timeSlots.join(", ")}</span></div>
              </div>

              <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-snug font-semibold mt-1">
                Данные часы игры будут моментально разблокированы и станут открыты в календаре для всех пользователей сайта.
              </p>
            </div>

            <div className="flex gap-2.5 pt-1.5">
              <button
                type="button"
                onClick={() => setBookingToCancelAdmin(null)}
                className="flex-1 border border-slate-200 dark:border-slate-750 hover:bg-slate-50 dark:hover:bg-white/5 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider font-display text-slate-650 dark:text-slate-350 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = bookingToCancelAdmin.id;
                  setBookingToCancelAdmin(null);
                  await onCancelBooking(id);
                }}
                className="flex-1 bg-brand-red hover:bg-brand-red/90 text-white font-black py-3 rounded-xl text-[10px] font-black uppercase tracking-wider font-display shadow-md cursor-pointer"
              >
                Да, отменить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
