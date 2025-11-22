'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, isApiError } from '@/lib/api';
import { Customer } from '@/types/customers';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Search, Users, Phone, Mail, Calendar, TrendingUp } from 'lucide-react';
import Link from 'next/link';

// Define the API response type
interface CustomersResponse {
  customers: Customer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const CustomerList: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await api.get<CustomersResponse>('/customers/customers');
      setCustomers(response.data.customers || []);
    } catch (err: unknown) {
      console.error('Failed to fetch customers:', err);
      if (isApiError(err)) {
        setError(err.error);
      } else {
        setError('Failed to load customers');
      }
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  // Safe filtering with null checks
  const filteredCustomers = (customers || []).filter(customer =>
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCustomerTier = (customer: Customer) => {
    const totalSpent = customer.total_amount_spent;
    const jobCount = customer.total_jobs_count;
    
    if (totalSpent > 1000000 && jobCount > 10) return 'VIP';
    
    if (totalSpent > 500000 && jobCount > 8) return 'Premium';
    
    if (totalSpent > 50000 && jobCount > 3) return 'Regular';
    
    if (jobCount > 1) return 'Returning';
    
    // New: First-time customer
    return 'New';
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'VIP':
        return 'bg-purple-100 text-purple-800';
      case 'Premium':
        return 'bg-blue-100 text-blue-800';
      case 'Regular':
        return 'bg-green-100 text-green-800';
      case 'Returning':  // Add if using the sophisticated system
        return 'bg-yellow-100 text-yellow-800';
      case 'Prospect':   // Add if using the sophisticated system
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600">Manage and track all customer relationships</p>
        </div>
        <Link href="/admin/customers/create">
          <Button>
            <Users className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </Link>
      </div>

      {error && (
        <div className="p-4 text-red-600 bg-red-50 rounded-lg">
          {error}
        </div>
      )}

      {/* Summary Cards */}
     {/* Summary Cards */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Customers</p>
              <p className="text-2xl font-bold text-gray-900">
                {customers.filter(c => c.total_jobs_count > 0).length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Repeat Customers</p>
              <p className="text-2xl font-bold text-gray-900">
                {customers.filter(c => c.total_jobs_count > 5).length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg. Jobs</p>
              <p className="text-2xl font-bold text-gray-900">
                {(customers.reduce((sum, c) => sum + c.total_jobs_count, 0) / (customers.length || 1)).toFixed(1)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search customers by name, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers List */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">
            Customer Directory ({filteredCustomers.length})
          </h3>
        </CardHeader>
        <CardContent>
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No customers found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{customer.name}</h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTierColor(getCustomerTier(customer))}`}>
                        {getCustomerTier(customer)}
                      </span>
                      {customer.total_jobs_count > 5 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Loyal
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-gray-400" />
                        {customer.phone}
                      </div>
                      {customer.email && (
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-gray-400" />
                          {customer.email}
                        </div>
                      )}
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        Last: {formatDate(customer.last_interaction_date)}
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2 text-gray-400" />
                        {customer.total_jobs_count} jobs
                      </div>
                    </div>
                    
                    {/* Customer Stats */}
                    <div className="flex items-center space-x-6 mt-3 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Total Spent:</span>
                        <span className="ml-2 font-semibold text-green-600">
                          {formatCurrency(customer.total_amount_spent)}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Avg. per Job:</span>
                        <span className="ml-2 font-semibold text-blue-600">
                          {formatCurrency(customer.total_jobs_count > 0 ? customer.total_amount_spent / customer.total_jobs_count : 0)}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">First Job:</span>
                        <span className="ml-2 font-semibold text-gray-600">
                          {formatDate(customer.first_interaction_date)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-4 lg:mt-0">
                    <Link href={`/admin/customers/${customer.id}`}>
                      <Button variant="outline" size="sm">
                        View Profile
                      </Button>
                    </Link>
                    <Link 
                      href={{
                        pathname: '/admin/jobs/create',
                        query: { 
                          customer: customer.id,
                          customer_name: customer.name,
                          customer_phone: customer.phone,
                          customer_email: customer.email || ''
                        }
                      }}
                    >
                      <Button size="sm">
                        New Job
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};