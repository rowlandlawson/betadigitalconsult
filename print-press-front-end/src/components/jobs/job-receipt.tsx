'use client';

import React from 'react';
import { JobWithDetails } from '@/types/jobs';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useCompanySettings } from '@/lib/useCompanySettings';

interface JobReceiptProps {
  job: JobWithDetails;
  userRole: 'admin' | 'worker';
}

export const JobReceipt: React.FC<JobReceiptProps> = ({ job, userRole }) => {
  const { settings } = useCompanySettings();

  return (
    <div className="hidden print:block bg-white p-8">
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .print-container {
            max-width: 800px;
            margin: 0 auto;
            font-family: Arial, sans-serif;
          }
        }
      `}</style>
      
      <div className="print-container">
        {/* Company Header */}
        <div className="text-center mb-8 border-b-2 border-gray-900 pb-4">
          <div className="flex justify-center mb-3">
            {settings.logo ? (
              <img 
                src={settings.logo} 
                alt={`${settings.name} Logo`} 
                className="h-16 w-auto"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="h-16 w-16 flex items-center justify-center bg-gray-100 rounded">
                <span className="text-2xl font-bold text-gray-600">
                  {settings.name?.charAt(0) || 'L'}
                </span>
              </div>
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{settings.name}</h1>
          <p className="text-gray-600 text-sm">{settings.tagline}</p>
          <div className="mt-2 text-xs text-gray-600 space-y-1">
            <p>📍 {settings.address}</p>
            <p>📞 {settings.phone}</p>
            <p>✉️ {settings.email}</p>
          </div>
        </div>

        {/* Receipt Title */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">JOB RECEIPT</h2>
          <p className="text-sm text-gray-600">Receipt No: {job.ticket_id}</p>
          <p className="text-sm text-gray-600">Date: {formatDate(new Date().toISOString())}</p>
        </div>

        {/* Customer Information */}
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <h3 className="text-sm font-bold text-gray-900 mb-3">CUSTOMER INFORMATION</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600 text-xs">Customer Name:</p>
              <p className="font-semibold text-gray-900">{job.customer_name}</p>
            </div>
            <div>
              <p className="text-gray-600 text-xs">Phone:</p>
              <p className="font-semibold text-gray-900">{job.customer_phone}</p>
            </div>
            {job.customer_email && (
              <div className="col-span-2">
                <p className="text-gray-600 text-xs">Email:</p>
                <p className="font-semibold text-gray-900">{job.customer_email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Job Details */}
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <h3 className="text-sm font-bold text-gray-900 mb-3">JOB DETAILS</h3>
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <p className="text-gray-600 text-xs">Job ID:</p>
              <p className="font-semibold text-gray-900">{job.ticket_id}</p>
            </div>
            <div>
              <p className="text-gray-600 text-xs">Status:</p>
              <p className="font-semibold text-gray-900 capitalize">{job.status.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-gray-600 text-xs">Date Requested:</p>
              <p className="font-semibold text-gray-900">{formatDate(job.date_requested)}</p>
            </div>
            {job.delivery_deadline && (
              <div>
                <p className="text-gray-600 text-xs">Delivery Deadline:</p>
                <p className="font-semibold text-gray-900">{formatDate(job.delivery_deadline)}</p>
              </div>
            )}
            <div className="col-span-2">
              <p className="text-gray-600 text-xs">Description:</p>
              <p className="font-semibold text-gray-900">{job.description}</p>
            </div>
          </div>
        </div>

        {/* Materials Used */}
        {job.materials.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-900 mb-3">MATERIALS USED</h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-900">
                  <th className="text-left text-xs font-bold text-gray-900 pb-2">Material</th>
                  <th className="text-right text-xs font-bold text-gray-900 pb-2">Qty</th>
                  <th className="text-right text-xs font-bold text-gray-900 pb-2">Unit Cost</th>
                  <th className="text-right text-xs font-bold text-gray-900 pb-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {job.materials.map((material, index) => (
                  <tr key={material.id || index} className="border-b border-gray-200">
                    <td className="py-2 text-gray-900">{material.material_name}</td>
                    <td className="text-right text-gray-900">{material.quantity}</td>
                    <td className="text-right text-gray-900">{formatCurrency(material.unit_cost)}</td>
                    <td className="text-right font-semibold text-gray-900">{formatCurrency(material.total_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Financial Summary */}
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <h3 className="text-sm font-bold text-gray-900 mb-3">FINANCIAL SUMMARY</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Cost:</span>
              <span className="font-semibold text-gray-900">{formatCurrency(job.total_cost)}</span>
            </div>
            {job.materials_cost && (
              <div className="flex justify-between">
                <span className="text-gray-600">Materials Cost:</span>
                <span className="font-semibold text-gray-900">{formatCurrency(job.materials_cost)}</span>
              </div>
            )}
            {job.labor_cost && (
              <div className="flex justify-between">
                <span className="text-gray-600">Labor Cost:</span>
                <span className="font-semibold text-gray-900">{formatCurrency(job.labor_cost)}</span>
              </div>
            )}
            {job.waste_cost && (
              <div className="flex justify-between">
                <span className="text-gray-600">Waste & Expenses:</span>
                <span className="font-semibold text-gray-900">{formatCurrency(job.waste_cost)}</span>
              </div>
            )}
            <div className="border-t border-gray-900 pt-2 flex justify-between font-bold text-gray-900">
              <span>Amount Paid:</span>
              <span>{formatCurrency(job.amount_paid)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg text-gray-900">
              <span>Balance Due:</span>
              <span className={job.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                {formatCurrency(job.balance)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Payment Status:</span>
              <span className="font-semibold text-gray-900 capitalize">{job.payment_status.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center border-t-2 border-gray-900 pt-4 text-xs text-gray-600">
          <p className="font-semibold text-gray-900 mb-2">Thank you for your business!</p>
          <p>This is an official receipt from {settings.name}.</p>
          <p>For inquiries, please contact us at {settings.email}</p>
          <p className="mt-4 text-gray-500">Printed on {formatDate(new Date().toISOString())}</p>
        </div>
      </div>
    </div>
  );
};
