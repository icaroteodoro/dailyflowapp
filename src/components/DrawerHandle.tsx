import React from 'react';
import { ChevronLeft, Sun } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const DrawerHandle: React.FC = () => {
  const { isExpanded, toggleExpanded, dailyPlanItems } = useAppStore();
  const uncompletedCount = dailyPlanItems.filter((i) => !i.completedLocally).length;

  if (isExpanded) return null;

  return (
    <div
      onClick={toggleExpanded}
      className="w-full h-full cursor-pointer select-none flex flex-col items-center justify-center bg-[#0f172a] hover:bg-slate-800 text-slate-200 border-l border-y border-white/10 rounded-l-2xl shadow-2xl transition-all active:scale-95"
      title="Clique para expandir o DailyFlow"
    >
      <div className="flex flex-col items-center gap-2 py-1">
        <Sun className="w-5 h-5 text-amber-400 animate-pulse" />

        {uncompletedCount > 0 && (
          <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full shadow-sm">
            {uncompletedCount}
          </span>
        )}

        <div className="w-1 h-4 bg-slate-700 rounded-full my-0.5" />

        <ChevronLeft className="w-4 h-4 text-slate-400" />
      </div>
    </div>
  );
};
