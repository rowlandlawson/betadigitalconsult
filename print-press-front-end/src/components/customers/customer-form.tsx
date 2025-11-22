'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, isApiError } from '@/lib/api';
import { CustomerFormData, Customer } from '@/types/customers';

interface CustomerFormProps {
  customerId?: string;
  mode: 'create' | 'edit';
}

export const CustomerForm: React.FC<CustomerFormProps> = ({ customerId, mode }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    const fetchCustomer = async () => {
      if (mode === 'edit' && customerId) {
        try {
          setFetchLoading(true);
          const response = await api.get<{ customer: Customer }>(`/customers/customers/${customerId}`);
          const customer = response.data.customer;
          setFormData({
            name: customer.name,
            phone: customer.phone,
            email: customer.email || '',
          });
        } catch (err: unknown) {
          console.error('Failed to fetch customer:', err);
          if (isApiError(err)) {
            setError(err.error);
          } else {
            setError('Failed to load customer');
          }
        } finally {
          setFetchLoading(false);
        }
      }
    };

    fetchCustomer();
  }, [mode, customerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic validation
    if (!formData.name.trim() || !formData.phone.trim()) {
      setError('Name and phone are required');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'create') {
        await api.post('/customers/customers', formData);
        router.push('/admin/customers');
      } else if (mode === 'edit' && customerId) {
        await api.put(`/customers/customers/${customerId}`, formData);
        router.push('/admin/customers');
      }
    } catch (err: unknown) {
      console.error('Failed to save customer:', err);
      if (isApiError(err)) {
        setError(err.error);
      } else {
        setError(`Failed to ${mode} customer`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  if (fetchLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <h2 className="text-2xl font-bold text-gray-900">
          {mode === 'create' ? 'Add New Customer' : 'Edit Customer'}
        </h2>
        <p className="text-gray-600">
          {mode === 'create' ? 'Enter customer details' : 'Update customer information'}
        </p>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <Input
            label="Full Name *"
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter customer's full name"
            disabled={loading}
          />
          
          <Input
            label="Phone Number *"
            name="phone"
            type="tel"
            required
            value={formData.phone}
            onChange={handleChange}
            placeholder="Enter phone number"
            disabled={loading}
          />
          
          <Input
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter email address (optional)"
            disabled={loading}
          />

          {/* Customer Preview */}
          {(formData.name || formData.phone) && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">Customer Preview</h4>
              <div className="space-y-2 text-sm">
                {formData.name && (
                  <p className="text-blue-700">
                    <span className="font-medium">Name:</span> {formData.name}
                  </p>
                )}
                {formData.phone && (
                  <p className="text-blue-700">
                    <span className="font-medium">Phone:</span> {formData.phone}
                  </p>
                )}
                {formData.email && (
                  <p className="text-blue-700">
                    <span className="font-medium">Email:</span> {formData.email}
                  </p>
                )}
              </div>
            </div>
          )}
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
            {mode === 'create' ? 'Create Customer' : 'Update Customer'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};