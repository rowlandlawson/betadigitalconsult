'use client';

import { Toaster } from 'sonner';

export function ToasterProvider() {
  return (
    <Toaster
      position="top-center"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: 'border border-gray-200 shadow-lg',
          title: 'text-gray-900 font-semibold',
          description: 'text-gray-600',
          actionButton: 'bg-blue-600 text-white hover:bg-blue-700',
        },
      }}
    />
  );
}

