'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { jobService } from '@/lib/jobService';
import { AlertCircle, WifiOff } from 'lucide-react';
import { toast } from 'sonner';

interface JobFormData {
  customer_id?: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  description: string;
  total_cost: number;
  date_requested: string;
  delivery_deadline?: string;
}

export const CreateJobForm: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [customerId, setCustomerId] = useState<string>('');
  const [formData, setFormData] = useState<JobFormData>({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    description: '',
    total_cost: 0,
    date_requested: new Date().toISOString().split('T')[0],
    delivery_deadline: '',
  });

  // Auto-fill customer information from URL parameters
  useEffect(() => {
    const customer = searchParams.get('customer');
    const customerName = searchParams.get('customer_name');
    const customerPhone = searchParams.get('customer_phone');
    const customerEmail = searchParams.get('customer_email');

    console.log('URL Params:', { customer, customerName, customerPhone, customerEmail });

    if (customer) {
      setCustomerId(customer);
    }

    if (customerName || customerPhone || customerEmail) {
      setFormData(prev => ({
        ...prev,
        customer_name: customerName || prev.customer_name,
        customer_phone: customerPhone || prev.customer_phone,
        customer_email: customerEmail || prev.customer_email,
      }));
    }
  }, [searchParams]);

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
      toast.error('Validation Error', { description: validationError });
      setError(validationError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    setError('');
    setIsNetworkError(false);

    try {
      // Data Cleaning
      const submitData = {
        ...formData,
        // Only include customer_id if it is a real string, otherwise undefined
        customer_id: customerId && customerId.trim() !== '' ? customerId : undefined,
        // Ensure numeric values are numbers
        total_cost: Number(formData.total_cost),
        // Send undefined if strings are empty to avoid DB errors
        delivery_deadline: formData.delivery_deadline === '' ? undefined : formData.delivery_deadline,
        customer_email: formData.customer_email === '' ? undefined : formData.customer_email,
      };

      console.log('Submitting job data:', submitData);
      
      await jobService.createJob(submitData);
      
      toast.success('Job Created Successfully');
      router.push('/admin/jobs');
    } catch (err: any) {
      console.error('Failed to create job:', err);
      
      let toastTitle = 'Failed to create job';
      let userInstruction = 'Please check your inputs and try again.';

      // --- 1. HANDLE NETWORK ERRORS (No Internet / Server Down) ---
      if (!err.response) {
        toastTitle = 'Network Error';
        userInstruction = 'Unable to connect to the server. Please check your internet connection.';
        setIsNetworkError(true);
      } 
      // --- 2. HANDLE SERVER/DATABASE ERRORS ---
      else if (err.response && err.response.data) {
        const backendError = err.response.data;
        // Convert error object to string to search for keywords (handles 'details', 'message', 'error')
        const fullErrorString = JSON.stringify(backendError).toLowerCase();

        // SCENARIO: Duplicate Email (Postgres Code 23505)
        if (fullErrorString.includes('email') && (fullErrorString.includes('already exists') || fullErrorString.includes('duplicate'))) {
          toastTitle = 'Email Already Exists';
          userInstruction = 'This email is already registered to another customer. Please use a different email.';
        }
        // SCENARIO: Duplicate Phone
        else if (fullErrorString.includes('phone') && (fullErrorString.includes('already exists') || fullErrorString.includes('duplicate'))) {
          toastTitle = 'Phone Number Exists';
          userInstruction = 'This phone number is already registered. Please check the number or select the existing customer.';
        }
        // SCENARIO: Invalid Date
        else if (fullErrorString.includes('invalid input syntax') && fullErrorString.includes('date')) {
          toastTitle = 'Invalid Date Format';
          userInstruction = 'Please ensure the "Delivery Deadline" is a valid date or leave it empty.';
        }
        // SCENARIO: Text too long
        else if (fullErrorString.includes('value too long')) {
          toastTitle = 'Input Too Long';
          userInstruction = 'One of your text inputs is too long for the database. Please shorten it.';
        }
        // SCENARIO: Fallback for generic backend message
        else if (backendError.error && backendError.error !== 'Internal server error') {
          userInstruction = backendError.error;
        }
      }

      // Show Toast Notification
      toast.error(toastTitle, { description: userInstruction });
      
      // Show Persistent Error Box
      setError(userInstruction);
      
      // Scroll to top so user sees the error
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <h2 className="text-2xl font-bold text-gray-900">Create New Job</h2>
        <p className="text-gray-600">
          {customerId ? 'Creating job for existing customer' : 'Enter job details and customer information'}
        </p>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          
          {/* Enhanced Error Display */}
          {error && (
            <div className={`p-4 rounded-md border flex items-start space-x-3 ${
              isNetworkError ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
            }`}>
              {isNetworkError ? (
                <WifiOff className="h-5 w-5 text-yellow-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              )}
              <div className={`text-sm font-medium ${
                isNetworkError ? 'text-yellow-700' : 'text-red-700'
              }`}>
                {error}
              </div>
            </div>
          )}

          {/* Customer Information Section */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Customer Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer_name">Customer Name *</Label>
                <Input
                  id="customer_name"
                  name="customer_name"
                  type="text"
                  required
                  value={formData.customer_name}
                  onChange={handleChange}
                  placeholder="Enter customer name"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="customer_phone">Customer Phone *</Label>
                <Input
                  id="customer_phone"
                  name="customer_phone"
                  type="tel"
                  required
                  value={formData.customer_phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor="customer_email">Customer Email</Label>
              <Input
                id="customer_email"
                name="customer_email"
                type="email"
                value={formData.customer_email || ''}
                onChange={handleChange}
                placeholder="Enter email address"
                className="mt-1"
              />
            </div>
          </div>

          {/* Job Details Section */}
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Job Details</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="description">Job Description *</Label>
                <textarea
                  id="description"
                  name="description"
                  required
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe the printing job requirements, specifications, and any special instructions..."
                  rows={4}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 mt-1"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="total_cost">Total Cost (₦) *</Label>
                  <Input
                    id="total_cost"
                    name="total_cost"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.total_cost}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="date_requested">Date Requested *</Label>
                  <Input
                    id="date_requested"
                    name="date_requested"
                    type="date"
                    required
                    value={formData.date_requested}
                    onChange={handleChange}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="delivery_deadline">Delivery Deadline</Label>
                <Input
                  id="delivery_deadline"
                  name="delivery_deadline"
                  type="date"
                  value={formData.delivery_deadline || ''}
                  onChange={handleChange}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between border-t pt-6">
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
            disabled={loading}
            className="min-w-24"
          >
            {loading ? 'Creating...' : 'Create Job'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};