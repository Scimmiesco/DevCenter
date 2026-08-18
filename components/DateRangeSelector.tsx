import React, { useState, useEffect } from "react";
import { Calendar } from "lucide-react";

export type DateRange = {
  label: string;
  start: Date;
  end: Date;
};

interface DateRangeSelectorProps {
  currentRange: DateRange;
  onRangeChange: (range: DateRange) => void;
  disabled?: boolean;
}

const PRESETS = [
  { label: "2 Semanas", days: 14 },
  { label: "1 Mês", days: 30 },
  { label: "2 Meses", days: 60 },
  { label: "6 Meses", days: 180 },
  { label: "1 Ano", days: 365 },
];

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  currentRange,
  onRangeChange,
  disabled,
}) => {
  const [isCustom, setIsCustom] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const handlePreset = (days: number, label: string) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);

    setIsCustom(false);
    onRangeChange({ label, start, end });
  };

  const handleCustomSubmit = () => {
    if (!customStart || !customEnd) return;
    const start = new Date(customStart);
    const end = new Date(customEnd);
    onRangeChange({ label: "Personalizado", start, end });
  };

  // Sync custom inputs if external range changes to a custom one
  useEffect(() => {
    if (currentRange.label === "Personalizado") {
      setIsCustom(true);
      setCustomStart(currentRange.start.toISOString().split("T")[0]);
      setCustomEnd(currentRange.end.toISOString().split("T")[0]);
    }
  }, [currentRange]);

  return (
    <div className="w-full bg-transparent flex flex-col gap-2">
      <div className="flex items-center gap-2 text-accent-light text-xs font-bold uppercase tracking-wider">
        <Calendar size={16} /> Período de Análise
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            disabled={disabled}
            onClick={() => handlePreset(preset.days, preset.label)}
            className={`p-2 rounded-full text-xs font-bold transition-all border-2 cursor-pointer
                             ${!isCustom && currentRange.label === preset.label
                ? "bg-accent border-accent-light text-surface font-extrabold"
                : "border-accent-text-accent-light text-accent-light hover:border-accent hover:text-accent-light"
              }`}
          >
            {preset.label}
          </button>
        ))}
        <button
          disabled={disabled}
          onClick={() => setIsCustom(true)}
          className={`px-3 py-2 rounded-full text-xs font-bold transition-all border-2
                         ${isCustom
              ? "bg-accent border-accent-light text-accent-light font-extrabold"
              : "border-accent-text-accent-light text-accent-light hover:border-accent hover:text-accent-light"
            }`}
        >
          Personalizado
        </button>
      </div>

      {isCustom && (
        <div className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-200">
          <input
            type="date"
            className="bg-gray950 border border-gray800 rounded px-2 py-1.5 text-xs text-white color-scheme-dark"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            disabled={disabled}
          />
          <span className="text-gray600">-</span>
          <input
            type="date"
            className="bg-gray950 border border-gray800 rounded px-2 py-1.5 text-xs text-white color-scheme-dark"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            disabled={disabled}
          />
          <button
            onClick={handleCustomSubmit}
            disabled={disabled}
            className="px-3 py-1.5 bg-gray800 hover:bg-gray700 text-white rounded text-xs font-bold ml-2"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
};
