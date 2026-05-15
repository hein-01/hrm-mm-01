import React, { useState, useRef, useEffect } from 'react';

export interface DropdownOption {
  value: string;
  label: string;
  subLabel?: string;
}

interface DropdownMenuProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  className?: string;
  triggerClassName?: string;
  align?: 'left' | 'right';
  customTrigger?: React.ReactNode;
}

export default function DropdownMenu({
  value,
  onChange,
  options,
  className = '',
  triggerClassName = '',
  align = 'left',
  customTrigger,
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      {customTrigger ? (
        <div 
            onClick={() => setIsOpen(prev => !prev)} 
            aria-haspopup="listbox" 
            aria-expanded={isOpen} 
            className="cursor-pointer"
        >
            {customTrigger}
        </div>
      ) : (
          <button
            type="button"
            onClick={() => setIsOpen(prev => !prev)}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm whitespace-nowrap ${triggerClassName}`}
          >
            <span className="truncate max-w-[180px]">{selected?.label ?? value}</span>
            <span
              className={`material-symbols-outlined text-[16px] text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            >
              keyboard_arrow_down
            </span>
          </button>
      )}

      {/* Floating panel */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute top-full mt-2 min-w-[200px] bg-white/90 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-100 dark:border-slate-700 shadow-2xl shadow-slate-200/60 dark:shadow-slate-900/60 z-[1100] overflow-hidden animate-in fade-in zoom-in-95 duration-200 ease-out origin-top-left ${align === 'right' ? 'right-0 origin-top-right' : 'left-0'}`}
        >
          <div className="py-1.5">
            {options.map(opt => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                  className={`w-full flex items-center justify-between gap-4 px-4 py-2.5 text-sm font-medium transition-colors text-left ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-700 dark:hover:text-indigo-300'
                  }`}
                >
                  <div className="flex flex-col items-start">
                    <span>{opt.label}</span>
                    {opt.subLabel && (
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-normal mt-0.5">
                        {opt.subLabel}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <span className="material-symbols-outlined text-[16px] text-indigo-500 shrink-0">
                      check
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
