// components/jobs/create-job-form.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { jobService } from '@/lib/jobService';
import { isApiError } from '@/lib/api';
import { JobFormData } from '@/types/jobs';

export const CreateJobForm: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [formData, setFormData] = useState<JobFormData>({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    description: '',
    total_cost: 0,
    date_requested: new Date().toISOString().split('T')[0],
    delivery_deadline: '',
  });

  const validateForm = (data: JobFormData): string | null => {
    if (!data.customer_name.trim()) return 'Customer name is required';
    if (!data.customer_phone.trim()) return 'Customer phone is required';
    if (!data.description.trim()) return 'Job description is required';
    if (data.total_cost <= 0) return 'Total cost must be greater than 0';
    if (!data.date_requested) return 'Date requested is required';
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm(formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await jobService.createJob(formData);
      router.push('/admin/jobs');
    } catch (err: unknown) {
      console.error('Failed to create job:', err);
      if (isApiError(err)) {
        setError(err.error);
      } else {
        setError('Failed to create job');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <h2 className="text-2xl font-bold text-gray-900">Create New Job</h2>
        <p className="text-gray-600">Enter job details and customer information</p>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          {/* Customer Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Customer Name *"
              name="customer_name"
              type="text"
              required
              value={formData.customer_name}
              onChange={handleChange}
              placeholder="Enter customer name"
            />
            
            <Input
              label="Customer Phone *"
              name="customer_phone"
              type="tel"
              required
              value={formData.customer_phone}
              onChange={handleChange}
              placeholder="Enter phone number"
            />
          </div>

          <Input
            label="Customer Email"
            name="customer_email"
            type="email"
            value={formData.customer_email || ''}
            onChange={handleChange}
            placeholder="Enter email address"
          />

          {/* Job Details */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Description *
            </label>
            <textarea
              name="description"
              required
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the printing job requirements..."
              rows={4}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Total Cost (₦) *"
              name="total_cost"
              type="number"
              min="0"
              step="0.01"
              required
              value={formData.total_cost}
              onChange={handleChange}
              placeholder="0.00"
            />
            
            <Input
              label="Date Requested *"
              name="date_requested"
              type="date"
              required
              value={formData.date_requested}
              onChange={handleChange}
            />
          </div>

          <Input
            label="Delivery Deadline"
            name="delivery_deadline"
            type="date"
            value={formData.delivery_deadline || ''}
            onChange={handleChange}
          />
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={loading}
          >
            Create Job
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};