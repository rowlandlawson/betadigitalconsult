'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCompanySettings } from '@/lib/useCompanySettings';
import { Building2, Save } from 'lucide-react';
import { toast } from 'sonner';

export const CompanySettingsForm: React.FC = () => {
  const { settings, loading, updateSettings, uploadLogo } =
    useCompanySettings();
  const [formData, setFormData] = useState(settings);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    
    let finalLogoUrl = formData.logo;

    // Upload logo if a new file was selected
    if (logoFile) {
      try {
        finalLogoUrl = await uploadLogo(logoFile);
        setLogoFile(null);
        toast.success('Logo uploaded successfully');
      } catch (uploadErr) {
        console.error('Logo upload failed:', uploadErr);
        toast.error('Failed to upload logo');
        setSaving(false);
        return;
      }
    }

    // Update all settings (including logo if it was just uploaded)
    try {
      await updateSettings({ ...formData, logo: finalLogoUrl });
      toast.success('Company settings saved successfully');
    } catch (err: unknown) {
      console.error('Failed to save settings:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to save settings';
      setError(errorMessage);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Building2 className="h-8 w-8 mr-2" />
          Company Settings
        </h1>
        <p className="text-gray-600">
          Manage your company information that appears on receipts and documents
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Company Information</h2>
          <p className="text-sm text-gray-600">
            This information will be displayed on all job receipts
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name *
            </label>
            <Input
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter company name"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              This will appear as the main heading on receipts
            </p>
          </div>

          {/* Company Tagline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Tagline
            </label>
            <Input
              name="tagline"
              type="text"
              value={formData.tagline}
              onChange={handleChange}
              placeholder="e.g., Professional Printing Services"
            />
            <p className="text-xs text-gray-500 mt-1">
              A brief description of your business
            </p>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address *
            </label>
            <Input
              name="address"
              type="text"
              value={formData.address}
              onChange={handleChange}
              placeholder="e.g., 123 Main Street, Lagos, Nigeria"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Full business address</p>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <Input
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="e.g., +234 (0) 802 345 6789"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Primary contact phone number
            </p>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <Input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g., contact@company.com"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Primary contact email</p>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};