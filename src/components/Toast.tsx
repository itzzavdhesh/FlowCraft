/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { ToastConfig } from '../types';

interface ToastProps {
  toasts: ToastConfig[];
  onClose: (id: string) => void;
}

export default function Toast({ toasts, onClose }: ToastProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={onClose} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: ToastConfig; onClose: (id: string) => void; key?: React.Key }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-indigo-500 shrink-0" />,
  };

  const bgColors = {
    success: 'bg-emerald-50/95 border-emerald-100 shadow-emerald-100/50',
    error: 'bg-red-50/95 border-red-100 shadow-red-100/50',
    info: 'bg-indigo-50/95 border-indigo-100 shadow-indigo-100/50',
  };

  const textColors = {
    success: 'text-emerald-800',
    error: 'text-red-800',
    info: 'text-indigo-800',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      layout
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm ${bgColors[toast.type]}`}
    >
      {icons[toast.type]}
      <div className="flex-grow">
        <p className={`text-sm font-medium ${textColors[toast.type]}`}>{toast.message}</p>
      </div>
      <button
        onClick={() => onClose(toast.id)}
        aria-label="Close Toast"
        className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 dark:text-gray-400 dark:text-gray-500 transition-colors cursor-pointer shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
