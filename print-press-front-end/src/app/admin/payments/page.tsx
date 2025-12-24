'use client';

import { useState } from 'react';
import { PaymentList } from '@/components/payments/payment-list';
import { OutstandingPayments } from '@/components/payments/outstanding-payments';

export default function AdminPaymentsPage() {
  const [activeTab, setActiveTab] = useState<'paid' | 'outstanding'>('paid');

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-4 sm:space-x-8">
          <button
            onClick={() => setActiveTab('paid')}
            className={`py-3 px-1 border-b-2 font-medium text-sm sm:text-base transition-colors ${activeTab === 'paid'
                ? 'border-[#AABD77] text-[#AABD77]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Paid Payments
          </button>
          <button
            onClick={() => setActiveTab('outstanding')}
            className={`py-3 px-1 border-b-2 font-medium text-sm sm:text-base transition-colors ${activeTab === 'outstanding'
                ? 'border-[#AABD77] text-[#AABD77]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Outstanding Payments
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'paid' && <PaymentList userRole="admin" />}
      {activeTab === 'outstanding' && <OutstandingPayments />}
    </div>
  );
}
