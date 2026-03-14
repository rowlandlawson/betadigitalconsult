'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PaperWidth } from './ReceiptPrintView';

interface PaperSizeModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (size: PaperWidth) => void;
}

const PAPER_OPTIONS: { value: PaperWidth; label: string; desc: string }[] = [
    { value: '57mm', label: '57 mm', desc: 'Small thermal' },
    { value: '58mm', label: '58 mm', desc: 'Standard thermal' },
    { value: '80mm', label: '80 mm', desc: 'Wide thermal' },
];

export const PaperSizeModal: React.FC<PaperSizeModalProps> = ({
    open,
    onClose,
    onConfirm,
}) => {
    const [selected, setSelected] = useState<PaperWidth>('80mm');
    const backdropRef = useRef<HTMLDivElement>(null);

    /* close on Escape */
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            ref={backdropRef}
            onClick={(e) => {
                if (e.target === backdropRef.current) onClose();
            }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
            <div
                className="bg-white rounded-xl shadow-2xl w-[360px] max-w-[90vw] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-blue-600"
                        >
                            <polyline points="6 9 6 2 18 2 18 9" />
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                            <rect x="6" y="14" width="12" height="8" />
                        </svg>
                        Select Paper Size
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Choose the thermal paper width for printing
                    </p>
                </div>

                {/* Paper Options */}
                <div className="px-6 py-5 space-y-3">
                    {PAPER_OPTIONS.map((opt) => {
                        const isSelected = selected === opt.value;
                        return (
                            <button
                                key={opt.value}
                                onClick={() => setSelected(opt.value)}
                                className={`
                  w-full flex items-center gap-4 px-4 py-3 rounded-lg border-2 transition-all duration-150
                  ${isSelected
                                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                                    }
                `}
                            >
                                {/* Radio indicator */}
                                <div
                                    className={`
                    w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                    ${isSelected ? 'border-blue-500' : 'border-gray-300'}
                  `}
                                >
                                    {isSelected && (
                                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                    )}
                                </div>

                                {/* Paper width icon (proportional rectangles) */}
                                <div className="flex items-end gap-0.5 flex-shrink-0">
                                    <div
                                        className={`rounded-sm ${isSelected ? 'bg-blue-400' : 'bg-gray-300'}`}
                                        style={{
                                            width:
                                                opt.value === '57mm'
                                                    ? '14px'
                                                    : opt.value === '58mm'
                                                        ? '15px'
                                                        : '20px',
                                            height: '24px',
                                        }}
                                    />
                                </div>

                                {/* Label */}
                                <div className="text-left flex-1">
                                    <div
                                        className={`font-semibold ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}
                                    >
                                        {opt.label}
                                    </div>
                                    <div className="text-xs text-gray-500">{opt.desc}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(selected)}
                        className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polyline points="6 9 6 2 18 2 18 9" />
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                            <rect x="6" y="14" width="12" height="8" />
                        </svg>
                        Print
                    </button>
                </div>
            </div>
        </div>
    );
};
