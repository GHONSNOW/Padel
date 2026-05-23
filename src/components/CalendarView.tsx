import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check, Clock, AlertCircle } from "lucide-react";
import { Booking, BlockedDate } from "../types";

interface CalendarViewProps {
  selectedDate: string; // YYYY-MM-DD
  setSelectedDate: (date: string) => void;
  selectedSlots: string[];
  setSelectedSlots: (slots: string[]) => void;
  bookings: Booking[];
  blockedDates: BlockedDate[];
}

export const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", 
  "14:00", "15:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"
];

export const CalendarView: React.FC<CalendarViewProps> = ({
  selectedDate,
  setSelectedDate,
  selectedSlots,
  setSelectedSlots,
  bookings,
  blockedDates,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Helper: Get days of month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const daysInMonth: Date[] = [];
    const firstDayIndex = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Align to Monday

    // Fill days of previous month as null placeholders
    for (let i = 0; i < firstDayIndex; i++) {
      daysInMonth.push(null as any);
    }

    // Fill days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      daysInMonth.push(new Date(year, month, i));
    }

    return daysInMonth;
  };

  const days = getDaysInMonth(currentMonth);

  const formatDateString = (d: Date) => {
    if (!d) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const isToday = (d: Date) => {
    const today = new Date();
    return d && d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();
  };

  const isDayDisabled = (d: Date) => {
    if (!d) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d < today) return true;

    // Limit booking up to 2 months in the future
    const limit = new Date();
    limit.setMonth(limit.getMonth() + 2);
    limit.setHours(23, 59, 59, 999);
    return d > limit;
  };

  // Check if dates are green (free) or red (booked / blocked)
  const getDateStatusByDay = (dateStr: string) => {
    // 1. Check if blocked by Admin
    const isBlocked = blockedDates.some(b => b.date === dateStr);
    if (isBlocked) {
      return { status: "blocked", label: "Заблокировано", color: "bg-rose-50 border-rose-300 text-rose-800" };
    }

    // 2. Filter bookings for this active date
    const dayBookings = bookings.filter(b => b.date === dateStr && b.status === "active");
    
    // Count total unique hours booked
    const bookedSlotsSet = new Set<string>();
    dayBookings.forEach(b => {
      b.timeSlots.forEach(slot => {
        bookedSlotsSet.add(slot);
      });
    });

    if (bookedSlotsSet.size >= TIME_SLOTS.length) {
      return { status: "full", label: "Все забронировано", color: "bg-rose-50 border-rose-300 text-rose-800" };
    }

    return { status: "free", label: "Свободно", color: "bg-emerald-50 border-emerald-300 text-emerald-800" };
  };

  const isNextMonthDisabled = () => {
    const today = new Date();
    const limitMonth = new Date(today.getFullYear(), today.getMonth() + 2, 1);
    
    const displayNextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    return displayNextMonth > limitMonth;
  };

  const changeMonth = (offset: number) => {
    if (offset > 0 && isNextMonthDisabled()) return;
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
    setCurrentMonth(next);
  };

  // Get booked slots for the selected date to disable them in selection
  const getBookedSlotsForSelectedDate = () => {
    const dayBookings = bookings.filter(b => b.date === selectedDate && b.status === "active");
    const booked = new Set<string>();
    dayBookings.forEach(b => {
      b.timeSlots.forEach(slot => {
        booked.add(slot);
      });
    });
    return booked;
  };

  const bookedSlotsThisDay = getBookedSlotsForSelectedDate();

  const handleSlotToggle = (slot: string) => {
    if (bookedSlotsThisDay.has(slot)) return; // Can't select already booked slots
    if (selectedSlots.includes(slot)) {
      setSelectedSlots(selectedSlots.filter(s => s !== slot));
    } else {
      setSelectedSlots([...selectedSlots, slot].sort());
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6" id="calendar-booking-view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-brand-red flex-shrink-0" />
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight uppercase font-display">Календарь бронирования</h3>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-1.5 w-full sm:w-auto bg-slate-50 dark:bg-slate-800/80 sm:bg-transparent p-1.5 sm:p-0 rounded-2xl">
          <button
            onClick={() => changeMonth(-1)}
            type="button"
            className="p-1.5 sm:p-2 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-705 rounded-xl transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-600 dark:text-slate-400" />
          </button>
          <span className="text-xs font-black text-slate-800 dark:text-slate-200 min-w-[95px] sm:min-w-[120px] text-center select-none uppercase tracking-wider font-display">
            {currentMonth.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
          </span>
          <button
            onClick={() => changeMonth(1)}
            type="button"
            disabled={isNextMonthDisabled()}
            className="p-1.5 sm:p-2 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-705 rounded-xl transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="space-y-4">
        {/* Week Days Headers */}
        <div className="grid grid-cols-7 text-center gap-1.5 text-xs font-bold text-slate-400 font-display">
          <span>ПН</span>
          <span>ВТ</span>
          <span>СР</span>
          <span>ЧТ</span>
          <span>ПТ</span>
          <span>СБ</span>
          <span className="text-rose-500">ВС</span>
        </div>

        {/* Month Day Cells */}
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} className="aspect-square"></div>;
            }

            const dateStr = formatDateString(day);
            const isDisabled = isDayDisabled(day);
            const isSel = selectedDate === dateStr;
            const info = getDateStatusByDay(dateStr);

            // Styling variables
            let cellClass = "relative aspect-square rounded-2xl flex flex-col items-center justify-center text-sm font-bold transition-all cursor-pointer border ";
            let indicatorClass = "absolute bottom-1 w-1.5 h-1.5 rounded-full ";

            if (isDisabled) {
              cellClass += "bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800/50 text-slate-300 dark:text-slate-600 cursor-not-allowed";
              indicatorClass += "bg-transparent";
            } else if (isSel) {
              // App brand highlight color (Sports Blue + Sports Red)
              cellClass += "bg-brand-blue border-brand-blue text-white shadow-md shadow-brand-blue/20 scale-105 z-10 font-black ring-2 ring-brand-blue/50";
              indicatorClass += "bg-brand-red";
            } else {
              // Not selected, future day
              cellClass += "hover:scale-[1.02] hover:border-brand-blue/30 ";
              if (info.status === "blocked") {
                cellClass += "bg-rose-50 dark:bg-rose-955/20 border-rose-300 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 font-bold";
                indicatorClass += "bg-rose-500";
              } else if (info.status === "full") {
                cellClass += "bg-rose-50 dark:bg-rose-955/20 border-rose-350 dark:border-rose-900/40 text-rose-600 dark:text-rose-300 font-bold";
                indicatorClass += "bg-rose-500";
              } else {
                // Free (Green as requested)
                cellClass += "bg-emerald-50 dark:bg-emerald-955/20 border-emerald-300 dark:border-emerald-900/40 text-emerald-850 dark:text-emerald-300 font-bold";
                indicatorClass += "bg-emerald-500 animate-pulse";
              }
            }

            return (
              <div
                key={dateStr}
                onClick={() => {
                  if (isDisabled) return;
                  setSelectedDate(dateStr);
                  setSelectedSlots([]); // reset slots when day changes
                }}
                className={cellClass}
                title={info.label}
              >
                <span>{day.getDate()}</span>
                {isToday(day) && !isSel && (
                  <span className="absolute top-1 text-[8px] tracking-tight bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-extrabold px-1 py-0.5 rounded-md leading-none">
                    СЕГОДНЯ
                  </span>
                )}
                <span className={indicatorClass} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend with Green for free, Red for booked */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-semibold font-display">
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-md bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-300 dark:border-emerald-900"></span>
          <span>Свободные даты (Зеленый)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-md bg-rose-50 dark:bg-rose-950/20 border-2 border-rose-300 dark:border-rose-900"></span>
          <span>Занятые / Закрытые (Красный)</span>
        </div>
      </div>

      {/* Slots selection */}
      {selectedDate && (
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-tight flex items-center gap-1.5 font-display">
              <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              Выберите время на {" "}
              <span className="text-slate-900 dark:text-slate-100 underline decoration-brand-red decoration-2">
                {new Date(selectedDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
              </span>
            </h4>
            <span className="text-[11px] font-black text-white bg-brand-blue px-2.5 py-1 rounded-lg font-mono uppercase tracking-wide">
              2000 ₽ / час
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {TIME_SLOTS.map((slot) => {
              const isBooked = bookedSlotsThisDay.has(slot);
              const isSelected = selectedSlots.includes(slot);

              let buttonClass = "py-3 px-3 rounded-2xl text-xs font-bold transition-all text-center flex flex-col items-center justify-center border ";
              if (isBooked) {
                buttonClass += "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed line-through";
              } else if (isSelected) {
                buttonClass += "bg-brand-blue border-brand-blue text-white shadow-sm scale-98 ring-2 ring-brand-blue/40";
              } else {
                buttonClass += "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-brand-blue/30 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer";
              }

              return (
                <button
                  key={slot}
                  type="button"
                  disabled={isBooked}
                  onClick={() => handleSlotToggle(slot)}
                  className={buttonClass}
                >
                  <span className="font-bold tracking-tight text-sm font-mono">{slot}</span>
                  <span className={`text-[9px] mt-1 uppercase font-bold tracking-wider leading-none block ${isSelected ? "text-brand-red" : isBooked ? "text-slate-300 dark:text-slate-500" : "text-emerald-700 dark:text-emerald-400 font-semibold"}`}>
                    {isBooked ? "Занято" : isSelected ? "Выбрано" : "Свободно"}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedSlots.length > 0 && (
            <div className="bg-brand-dark border border-brand-blue/25 p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-1 duration-150">
              <div>
                <span className="text-[10px] text-brand-red uppercase font-black tracking-widest block">Резервируемое время ({selectedSlots.length} ч.)</span>
                <span className="text-sm text-brand-cream font-mono font-bold mt-1 block">
                  {selectedSlots.join(", ")}
                </span>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-xs text-slate-400 line-through mr-1.5 block sm:inline-block font-bold">
                  {selectedSlots.length * 2000} ₽
                </span>
                <span className="text-lg font-black text-white whitespace-nowrap font-display">
                  Итого: {" "}
                  <span className="text-brand-red font-mono font-black">
                    {selectedSlots.length * 2000} ₽
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
