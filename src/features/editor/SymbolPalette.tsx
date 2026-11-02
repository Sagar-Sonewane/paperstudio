import { useState } from "react";
import { Button } from "../../components/ui/button.tsx";

interface SymbolPaletteProps {
  onInsert: (char: string) => void;
}

const SYMBOL_CATEGORIES = {
  Math: ["°", "±", "×", "÷", "≠", "≈", "≤", "≥", "∞", "√", "∛", "½", "⅓", "¼", "¾", "∑", "∆"],
  Greek: ["π", "θ", "α", "β", "γ", "λ", "μ", "σ", "ω", "Ω", "ε", "ρ"],
  Currency: ["₹", "$", "€", "£", "¥"],
  Devanagari: ["।", "॥", "ॐ", "॰"]
};

export function SymbolPalette({ onInsert }: SymbolPaletteProps) {
  const [activeCategory, setActiveCategory] = useState<keyof typeof SYMBOL_CATEGORIES>("Math");

  return (
    <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50 flex flex-col gap-2">
      <div className="flex items-center justify-between pb-1 border-b border-slate-200">
        <span className="text-xs font-semibold text-slate-700">Special Symbols</span>
        <div className="flex gap-1">
          {Object.keys(SYMBOL_CATEGORIES).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat as any)}
              className={`text-[11px] px-2 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                activeCategory === cat
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
        {SYMBOL_CATEGORIES[activeCategory].map((sym) => (
          <Button
            key={sym}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onInsert(sym)}
            className="h-7 w-7 p-0 text-sm font-semibold bg-white hover:bg-blue-50 hover:border-blue-300"
            title={`Insert ${sym}`}
          >
            {sym}
          </Button>
        ))}
      </div>
    </div>
  );
}
