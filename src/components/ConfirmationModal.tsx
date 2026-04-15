import React from 'react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'info'
}) => {
    if (!isOpen) return null;

    const variantStyles = {
        danger: 'bg-rose-500 hover:bg-rose-600 shadow-rose-200 dark:shadow-none',
        warning: 'bg-amber-500 hover:bg-amber-600 shadow-amber-200 dark:shadow-none',
        info: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none'
    };

    const iconMap = {
        danger: <span className="material-symbols-outlined text-rose-500 text-3xl">warning</span>,
        warning: <span className="material-symbols-outlined text-amber-500 text-3xl">priority_high</span>,
        info: <span className="material-symbols-outlined text-indigo-500 text-3xl">info</span>
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                <div className="p-8 text-center text-slate-900 dark:text-white">
                    <div className="size-16 mx-auto rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-6">
                        {iconMap[variant]}
                    </div>
                    <h3 className="text-xl font-black mb-2 leading-tight uppercase tracking-tight">{title}</h3>
                    <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed px-2">
                        {message}
                    </p>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => { onConfirm(); onClose(); }}
                            className={`w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest text-white shadow-xl transition-all active:scale-95 ${variantStyles[variant]}`}
                        >
                            {confirmLabel}
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-mono"
                        >
                            {cancelLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
