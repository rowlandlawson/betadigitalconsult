'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api, isApiError } from '@/lib/api';
import { ReceiptData } from '@/types/payments';
import { formatCurrency, formatDate, getLogoUrl } from '@/lib/utils';
import { useCompanySettings } from '@/lib/useCompanySettings';
import Image from 'next/image';
import { Printer, Download, ArrowLeft } from 'lucide-react';

interface ReceiptProps {
  paymentId: string;
  userRole: 'admin' | 'worker';
  showBackButton?: boolean;
  onBack?: () => void;
}

export const Receipt: React.FC<ReceiptProps> = ({ paymentId, showBackButton = true, onBack }) => {
  const router = useRouter();
  const { settings } = useCompanySettings();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const fetchReceipt = useCallback(async () => {
    try {
      const response = await api.get<ReceiptData>(`/payments/receipt/${paymentId}`);
      setReceipt(response.data);
    } catch (err: unknown) {
      console.error('Failed to fetch receipt:', err);
      if (isApiError(err)) {
        setError(err.error);
      } else {
        setError('Failed to load receipt');
      }
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    fetchReceipt();
  }, [fetchReceipt]);

  const printReceipt = () => {
    window.print();
  };

  const downloadReceipt = async () => {
    try {
      const response = await api.get(`/payments/receipt/${paymentId}/pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt-${receipt?.receipt.receipt_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error('Failed to download receipt:', err);
      alert('Failed to download receipt');
    }
  };

  const handleBackClick = () => {
    if (onBack) {
      onBack();
      return;
    }
    router.back();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error || 'Receipt not found'}</p>
        <Button onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const { receipt: receiptData } = receipt;
  // Convert logo URL to full URL if needed
  // const logoFromSettings = settings.logo ? getLogoUrl(settings.logo) : null;
  // const logoFromReceipt = receiptData.business.logo ? getLogoUrl(receiptData.business.logo) : null;
  const companyLogo = '/logo.png';
  const companyName = settings.name || receiptData.business.name;
  const companyTagline = settings.tagline;
  const companyPhone = settings.phone || receiptData.business.phone || '';
  const companyEmail = settings.email || receiptData.business.email || '';
  const companyAddress = settings.address || receiptData.business.address || '';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Action Buttons */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        {showBackButton ? (
          <Button
            variant="outline"
            onClick={handleBackClick}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Payments
          </Button>
        ) : (
          <span />
        )}
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={downloadReceipt}
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button onClick={printReceipt}>
            <Printer className="h-4 w-4 mr-2" />
            Print Receipt
          </Button>
        </div>
      </div>

      {/* Receipt */}
      <Card className="print:shadow-none print:border-0 relative">
        {/* Watermark Logo - Larger */}
        <div className="absolute inset-0 pointer-events-none opacity-15 print:opacity-20 z-0 flex items-center justify-center">
          <div className="relative w-96 h-96 md:w-[500px] md:h-[500px]"> {/* Larger size with responsive breakpoints */}
            <Image
              src={companyLogo}
              alt="Watermark"
              fill
              className="object-contain"
              style={{
                transform: 'rotate(-15deg) scale(1.2)' // Larger scale
              }}
              unoptimized
            />
          </div>
        </div>

        <CardContent className="p-6 md:p-8 print:p-0 relative z-10">
          {/* Enhanced Receipt Header */}
          <div className="border-b border-gray-300 pb-6 mb-6">
            {/* Top Row: Logo and Company Info */}
            <div className="flex flex-col justify-between items-center md:items-center gap-4 mb-4">
              {/* Logo - Responsive */}
              <div className="flex-shrink-0">
                <div className="md:w-80 md:h-36 w-50 h-auto flex items-center justify-center">
                  <Image
                    src={companyLogo}
                    alt={companyName}
                    width={80}
                    height={80}
                    className="w-full h-full object-contain p-1"
                    unoptimized
                    onError={(e) => { 
                      (e.target as HTMLImageElement).style.display = 'none'; 
                    }}
                  />
                </div>
              </div>

              {/* Company Info - Centered on mobile, right on desktop */}
              <div className="text-center">
                {/* <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  {companyName}
                </h1> */}
                {companyTagline && (
                  <p className="text-gray-600 text-base md:text-lg font-medium">
                    {companyTagline}
                  </p>
                )}
                {(companyPhone || companyEmail) && (
                  <div className="flex flex-col sm:flex-row sm:justify-center md:justify-end gap-2 sm:gap-4 mt-2">
                    {companyPhone && (
                      <span className="text-sm text-gray-500">{companyPhone}</span>
                    )}
                    {companyEmail && (
                      <span className="text-sm text-gray-500">{companyEmail}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Receipt Title and Number */}
            <div className="text-center mt-4">
              <div className="inline-flex flex-col items-center">
                <h2 className="text-xl md:text-2xl font-bold text-blue-600 uppercase tracking-wide">
                  OFFICIAL RECEIPT
                </h2>
                <div className="mt-2 px-4 py-2 bg-gray-100 rounded-lg">
                  <span className="text-sm text-gray-600">Receipt #</span>
                  <span className="ml-2 text-lg font-mono font-bold text-gray-900">
                    {receiptData.receipt_number}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Issued on {formatDate(receiptData.date)}
                </p>
              </div>
            </div>
          </div>

          {/* Rest of your receipt content remains exactly the same */}
          {/* Receipt Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Receipt Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Receipt Number:</span>
                  <span className="font-semibold">{receiptData.receipt_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date Issued:</span>
                  <span className="font-semibold">{formatDate(receiptData.date)}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer Name:</span>
                  <span className="font-semibold">{receiptData.customer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-semibold">{receiptData.customer.phone}</span>
                </div>
                {receiptData.customer.email && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-semibold">{receiptData.customer.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Job Information */}
          <div className="border border-gray-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Job Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">Ticket ID</p>
                <p className="font-semibold">{receiptData.job.ticket_id}</p>
              </div>
              <div>
                <p className="text-gray-600">Description</p>
                <p className="font-semibold">{receiptData.job.description}</p>
              </div>
              <div>
                <p className="text-gray-600">Date Requested</p>
                <p className="font-semibold">{formatDate(receiptData.job.date_requested)}</p>
              </div>
              {receiptData.job.delivery_deadline && (
                <div>
                  <p className="text-gray-600">Delivery Deadline</p>
                  <p className="font-semibold">{formatDate(receiptData.job.delivery_deadline)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="border border-gray-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-lg">
                <span className="text-gray-600">Amount Paid:</span>
                <span className="font-bold text-green-600">
                  {formatCurrency(receiptData.payment.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Type:</span>
                <span className="font-semibold capitalize">
                  {receiptData.payment.type.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Method:</span>
                <span className="font-semibold capitalize">
                  {receiptData.payment.method}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Job Cost:</span>
                <span className="font-semibold">
                  {formatCurrency(receiptData.job.total_cost)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Previously Paid:</span>
                <span className="font-semibold">
                  {formatCurrency(receiptData.payment.amount_paid - receiptData.payment.amount)}
                </span>
              </div>
              <div className="flex justify-between text-lg border-t border-gray-200 pt-2">
                <span className="text-gray-600">Remaining Balance:</span>
                <span className={`font-bold ${
                  receiptData.payment.balance > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {formatCurrency(receiptData.payment.balance)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment History */}
          {receiptData.payment_history.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment History</h3>
              <div className="space-y-2">
                {receiptData.payment_history.map((payment, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <div>
                      <p className="font-medium text-gray-900">
                        {formatCurrency(payment.amount)} - {payment.payment_type.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(payment.date)} • {payment.payment_method.toUpperCase()}
                        {payment.notes && ` • ${payment.notes}`}
                      </p>
                    </div>
                    <span className="text-sm text-gray-500">{payment.receipt_number}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {receiptData.payment.notes && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg mb-6">
              <h4 className="font-semibold text-gray-900 mb-2">Payment Notes</h4>
              <p className="text-gray-600">{receiptData.payment.notes}</p>
            </div>
          )}

          {/* Footer: Company Contact Information */}
          <div className="text-center mt-8 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Contact Information</h4>
                {companyPhone && <p className="text-gray-600">{companyPhone}</p>}
                {companyEmail && <p className="text-gray-600">{companyEmail}</p>}
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Address</h4>
                {companyAddress && <p className="text-gray-600">{companyAddress}</p>}
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Business Hours</h4>
                <p className="text-gray-600">Mon - Fri: 8:00 AM - 6:00 PM</p>
                <p className="text-gray-600">Sat: 9:00 AM - 4:00 PM</p>
              </div>
            </div>
            
            {/* Receipt number and details in footer */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <p className="text-gray-500 text-sm">
                Receipt #: <span className="font-semibold">{receiptData.receipt_number}</span> | 
                Issued: <span className="font-semibold">{formatDate(receiptData.date)}</span> | 
                Customer: <span className="font-semibold">{receiptData.customer.name}</span>
              </p>
              <p className="text-gray-400 text-xs mt-2">
                This is an computer-generated receipt. No signature required.
                {(companyPhone || companyEmail) && (
                  <>
                    {' '}For inquiries, please contact: {[
                      companyPhone,
                      companyEmail
                    ].filter(Boolean).join(' • ')}
                  </>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:shadow-none,
          .print\\:shadow-none * {
            visibility: visible;
          }
          .print\\:shadow-none {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          
          /* Ensure watermark prints properly */
          .opacity-15 {
            opacity: 0.15 !important;
          }
        }
      `}</style>
    </div>
  );
};