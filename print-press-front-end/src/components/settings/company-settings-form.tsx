'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCompanySettings } from '@/lib/useCompanySettings';
import { Building2, Save, RotateCcw, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

export const CompanySettingsForm: React.FC = () => {
  const { settings, loading, updateSettings, uploadLogo } = useCompanySettings();
  const [formData, setFormData] = useState(settings);
  const [logoPreview, setLogoPreview] = useState<string | null>(settings.logo || null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormData(settings);
    setLogoPreview(settings.logo || null);
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        toast.error('Please select a valid image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        toast.error('File size must be less than 5MB');
        return;
      }

      setLogoFile(file);
      setError('');
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      toast.info('Logo selected. Click Save Changes to upload.');
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setLogoFile(null);
    setFormData(prev => ({ ...prev, logo: undefined }));
    toast.info('Logo removed. Click Save Changes to update.');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      let finalLogoUrl = formData.logo;
      
      // Upload logo if a new file was selected
      if (logoFile) {
        try {
          finalLogoUrl = await uploadLogo(logoFile);
          // Logo upload already shows success toast in useCompanySettings
          // Reset file input after successful upload
          setLogoFile(null);
          // Update preview to show the uploaded logo
          setLogoPreview(finalLogoUrl);
        } catch (uploadErr) {
          // Error toast already shown in useCompanySettings
          throw uploadErr;
        }
      }
      
      // Update all settings (including logo if it was just uploaded)
      await updateSettings({ ...formData, logo: finalLogoUrl });
      // Success toast already shown in updateSettings
      
      // Reset file input element to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: unknown) {
      console.error('Failed to save settings:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save settings';
      setError(errorMessage);
      // Error toast already shown in hooks
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all company settings to defaults?')) {
      setFormData(settings);
      setLogoPreview(settings.logo || null);
      setLogoFile(null);
      setError('');
      toast.info('Settings reset to current values');
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
        <p className="text-gray-600">Manage your company information that appears on receipts and documents</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Company Information</h2>
          <p className="text-sm text-gray-600">This information will be displayed on all job receipts</p>
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
            <p className="text-xs text-gray-500 mt-1">This will appear as the main heading on receipts</p>
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
            <p className="text-xs text-gray-500 mt-1">A brief description of your business</p>
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
            <p className="text-xs text-gray-500 mt-1">Primary contact phone number</p>
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

          {/* Logo Upload */}
          <div>
            {/* <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Logo
            </label> */}
            {/* <div className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleLogoChange}
                  />
                </label>
              </div>
              
              {logoPreview && (
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Image 
                      src={logoPreview} 
                      alt="Logo preview" 
                      width={64}
                      height={64}
                      className="h-16 w-auto max-w-32 object-contain"
                    unoptimized
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Logo Preview</p>
                      <p className="text-xs text-gray-500">{logoFile ? 'New file selected' : 'Current logo'}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveLogo}
                    className="p-2 hover:bg-gray-100 rounded transition"
                    type="button"
                  >
                    <X className="h-5 w-5 text-gray-400 hover:text-red-600" />
                  </button>
                </div>
              )}
            </div> */}
          </div>

        </CardContent>

        <CardFooter className="flex justify-between">
          {/* <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Current
          </Button> */}
          <Button
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};