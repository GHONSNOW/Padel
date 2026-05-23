import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShieldCheck, Loader2, Sparkles, Smartphone, CheckCircle2, X, Lock, Coins, ArrowRight, Wallet
} from "lucide-react";

interface PaymentGatewayProps {
  amount: number;
  courtName: string;
  selectedDate: string;
  selectedSlots: string[];
  onSuccess: (method: "cash" | "transfer") => void;
  onClose: () => void;
  userEmail: string;
  userName: string;
  userPhone: string;
}

type PaymentStep = "method" | "processing" | "success";

export function PaymentGateway({
  amount,
  courtName,
  selectedDate,
  selectedSlots,
  onSuccess,
  onClose,
  userEmail,
  userName,
  userPhone
}: PaymentGatewayProps) {
  const [step, setStep] = useState<PaymentStep>("method");
  const [selectedMethod, setSelectedMethod] = useState<"cash" | "transfer" | null>(null);

  // Simulation processing steps timers
  useEffect(() => {
    if (step !== "processing") return;

    const timer = setTimeout(() => {
      setStep("success");
      // Trigger actual database submission after 2 seconds success screen
      setTimeout(() => {
        if (selectedMethod) {
          onSuccess(selectedMethod);
        }
      }, 2000);
    }, 1800);

    return () => clearTimeout(timer);
  }, [step, selectedMethod, onSuccess]);

  const selectPaymentMethod = (method: "cash" | "transfer") => {
    setSelectedMethod(method);
    setStep("processing");
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999] overflow-y-auto" id="payment-gateway-dialog">
      <motion.div 
        initial={{ scale: 0.95, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 15, opacity: 0 }}
        className="bg-white dark:bg-brand-dark border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col font-sans"
      >
        {/* Header bar */}
        <div className="bg-brand-blue text-white p-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 bg-brand-red rounded-lg flex items-center justify-center font-display font-black italic text-sm text-white">
              P4
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-brand-cream leading-none font-display">Способ оплаты</h3>
              <p className="text-[10px] text-slate-300 font-mono font-bold mt-1">Подтверждение бронирования POUND PADEL 4</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Order Quick Summary Card */}
        <div className="bg-slate-50 dark:bg-slate-900/40 px-6 py-4 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-display">Корт</span>
            <span className="text-sm font-extrabold text-slate-900 dark:text-slate-150">{courtName}</span>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-none mt-1">
              {new Date(selectedDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })} &bull; {selectedSlots.join(", ")}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-display">К оплате</span>
            <span className="text-lg font-black text-brand-blue dark:text-brand-red font-mono">{amount.toLocaleString("ru-RU")} ₽</span>
          </div>
        </div>

        {/* Dynamic Step Content Workspace */}
        <div className="p-6 md:p-8 flex-1">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: CHOOSE PAYMENT METHOD */}
            {step === "method" && (
              <motion.div
                key="step-method"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <div className="text-center md:text-left space-y-1">
                  <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight font-display">Выберите способ оплаты</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Оплата производится непосредственно на ресепшене клуба POUND PADEL 4 перед началом игровой сессии.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option Cards: Cash */}
                  <div 
                    onClick={() => selectPaymentMethod("cash")}
                    className="group bg-white dark:bg-brand-dark border-2 border-slate-150 dark:border-slate-800 hover:border-brand-blue dark:hover:border-brand-blue rounded-2xl p-5 text-center cursor-pointer transition-all hover:shadow-md flex flex-col items-center justify-center gap-3.5"
                  >
                    <div className="h-12 w-12 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Coins className="w-6 h-6 text-amber-550" />
                    </div>
                    <div>
                      <h5 className="text-xs font-black uppercase text-slate-950 dark:text-slate-100 font-display">Наличными</h5>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1 uppercase tracking-wide">На ресепшене клуба</p>
                    </div>
                  </div>

                  {/* Option Cards: Bank Transfer */}
                  <div 
                    onClick={() => selectPaymentMethod("transfer")}
                    className="group bg-white dark:bg-brand-dark border-2 border-slate-150 dark:border-slate-800 hover:border-brand-blue dark:hover:border-brand-blue rounded-2xl p-5 text-center cursor-pointer transition-all hover:shadow-md flex flex-col items-center justify-center gap-3.5"
                  >
                    <div className="h-12 w-12 bg-indigo-50 dark:bg-indigo-950/40 text-brand-blue dark:text-brand-red rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Smartphone className="w-6 h-6 text-brand-blue" />
                    </div>
                    <div>
                      <h5 className="text-xs font-black uppercase text-slate-950 dark:text-slate-100 font-display">Переводом</h5>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1 uppercase tracking-wide">На ресепшене через SBP/банк</p>
                    </div>
                  </div>
                </div>

                {/* Confirming Contact phone number is attached */}
                <div className="bg-slate-50 dark:bg-white/5 border border-slate-150 dark:border-white/5 rounded-2xl p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Контактные данные игрока</span>
                  </div>
                  <div className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold space-y-1">
                    <div><span className="text-slate-400">Имя:</span> {userName}</div>
                    <div><span className="text-slate-400">Email:</span> {userEmail}</div>
                    <div><span className="text-slate-400">Телефон для связи:</span> <span className="text-brand-red font-mono font-bold">{userPhone}</span></div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: PROCESSING LOADER */}
            {step === "processing" && (
              <motion.div
                key="step-processing"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12 space-y-6 flex flex-col items-center justify-center"
              >
                <div className="relative">
                  <Loader2 className="w-16 h-16 text-brand-blue dark:text-brand-red animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-indigo-700 dark:text-rose-600" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                    Оформление бронирования...
                  </h4>
                  <p className="text-xs text-slate-450 dark:text-slate-500 font-bold max-w-xs uppercase tracking-wider leading-relaxed">
                    Записываем детали заказа и проверяем контактные данные.
                  </p>
                </div>
              </motion.div>
            )}

            {/* STEP 3: SUCCESS ANIMATED GRAPHIC */}
            {step === "success" && (
              <motion.div
                key="step-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10 space-y-6 flex flex-col items-center justify-center"
              >
                <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-lg relative border border-emerald-200 animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-2">
                  <h4 className="text-base font-black text-slate-950 dark:text-white uppercase tracking-tight font-display">Заказ сформирован!</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-semibold leading-relaxed">
                    Бронь успешно создана. Оплатите ее по прибытии на ресепшен клуба.
                  </p>
                </div>

                {/* Digital ticket info */}
                <div className="bg-slate-50 dark:bg-white/5 border border-slate-150 dark:border-white/5 rounded-2xl p-4 w-full max-w-xs text-left text-[11px] font-mono space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-450 uppercase font-black font-display">Способ оплаты:</span>
                    <span className="text-brand-blue dark:text-brand-cream font-black">
                      {selectedMethod === "cash" ? "Наличными на ресепшене" : "Переводом на ресепшене"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-150 dark:border-slate-800 pt-1.5">
                    <span className="text-slate-450 uppercase font-black font-display">Сумма к оплате:</span>
                    <span className="text-slate-800 dark:text-white font-extrabold">{amount} ₽</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-150 dark:border-slate-800 pt-1.5">
                    <span className="text-slate-450 uppercase font-black font-display">Телефон:</span>
                    <span className="text-slate-800 dark:text-white font-extrabold">{userPhone}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[9px] text-slate-450 dark:text-slate-500 uppercase tracking-wider font-extrabold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Создаем ваше игровое окно...</span>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
