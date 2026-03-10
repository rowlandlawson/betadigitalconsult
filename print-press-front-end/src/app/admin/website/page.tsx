'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  AdminWebsiteResponse,
  LandingContent,
  PortfolioItem,
  PortfolioItemPayload,
  websiteAdminService,
} from '@/lib/publicContentService';

type WebsiteTab = 'web' | 'jobs';
type WebTab = 'about' | 'services';
type ServicesTab = 'summary' | 'list';
type JobsTab = 'upload' | 'categories';
type CategoryForm = { name: string; description: string };

const ITEMS_PER_PAGE = 8;
const EMPTY_CATEGORY: CategoryForm = { name: '', description: '' };
const EMPTY_ITEM: PortfolioItemPayload = {
  title: '',
  description: '',
  media_type: 'image',
  media_url: '',
  category_id: null,
  is_featured: false,
  display_order: 0,
};

const inputClassName =
  'rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';
const textareaClassName =
  'rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

function TabButton({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-3 text-left transition ${
        active
          ? 'border-emerald-600 bg-emerald-600 text-white'
          : 'border-gray-200 bg-gray-50 text-gray-800 hover:border-emerald-200 hover:bg-emerald-50'
      }`}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className={`mt-1 text-xs ${active ? 'text-emerald-50' : 'text-gray-600'}`}>
        {description}
      </p>
    </button>
  );
}

function MediaThumb({ item }: { item: PortfolioItem }) {
  return item.media_type === 'video' ? (
    <video className="h-28 w-full rounded-xl bg-black object-cover" muted playsInline>
      <source src={item.media_url} />
    </video>
  ) : (
    <img src={item.media_url} alt={item.title} className="h-28 w-full rounded-xl object-cover" />
  );
}

export default function WebsiteAdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdminWebsiteResponse | null>(null);
  const [contentForm, setContentForm] = useState<LandingContent | null>(null);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WebsiteTab>('web');
  const [activeWebTab, setActiveWebTab] = useState<WebTab>('about');
  const [activeServicesTab, setActiveServicesTab] = useState<ServicesTab>('summary');
  const [activeJobsTab, setActiveJobsTab] = useState<JobsTab>('upload');
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(EMPTY_CATEGORY);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<PortfolioItemPayload>(EMPTY_ITEM);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [jobsPage, setJobsPage] = useState(1);

  const categories = useMemo(() => data?.categories || [], [data]);
  const items = useMemo(() => data?.items || [], [data]);
  const serviceItems = contentForm?.services_items || [];
  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  const visibleItems = useMemo(() => {
    const start = (jobsPage - 1) * ITEMS_PER_PAGE;
    return items.slice(start, start + ITEMS_PER_PAGE);
  }, [items, jobsPage]);

  const load = async () => {
    setLoading(true);
    try {
      const response = await websiteAdminService.getWebsiteData();
      setData(response);
      setContentForm({
        ...response.content,
        services_items: response.content.services_items || [],
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to load website content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setActiveTab(searchParams.get('tab') === 'jobs' ? 'jobs' : 'web');
  }, [searchParams]);

  useEffect(() => {
    if (jobsPage > totalPages) setJobsPage(totalPages);
  }, [jobsPage, totalPages]);

  const updateContentField = <K extends keyof LandingContent>(key: K, value: LandingContent[K]) => {
    if (!contentForm) return;
    setContentForm({ ...contentForm, [key]: value });
  };

  const updateServiceItem = (index: number, value: string) => {
    if (!contentForm) return;
    const nextItems = [...serviceItems];
    nextItems[index] = value;
    setContentForm({ ...contentForm, services_items: nextItems });
  };

  const addServiceItem = () => {
    if (!contentForm) return;
    setContentForm({
      ...contentForm,
      services_items: [...serviceItems, ''],
    });
  };

  const removeServiceItem = (index: number) => {
    if (!contentForm) return;
    setContentForm({
      ...contentForm,
      services_items: serviceItems.filter((_, itemIndex) => itemIndex !== index),
    });
  };

  const saveSection = async (
    event: FormEvent,
    sectionKey: string,
    patch: Partial<LandingContent>
  ) => {
    event.preventDefault();
    if (!contentForm) return;
    setSavingSection(sectionKey);
    try {
      const response = await websiteAdminService.updateLandingContent({
        ...contentForm,
        ...patch,
      });
      setContentForm(response.content);
      setData((current) => (current ? { ...current, content: response.content } : current));
      toast.success('Section updated');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update section');
    } finally {
      setSavingSection(null);
    }
  };

  const saveCategory = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (editingCategoryId) {
        await websiteAdminService.updateCategory(editingCategoryId, categoryForm);
        toast.success('Category updated');
      } else {
        await websiteAdminService.createCategory(categoryForm);
        toast.success('Category created');
      }
      setCategoryForm(EMPTY_CATEGORY);
      setEditingCategoryId(null);
      await load();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save category');
    }
  };

  const saveJob = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (editingItemId) {
        await websiteAdminService.updatePortfolioItem(editingItemId, itemForm);
        toast.success('Job updated');
      } else {
        await websiteAdminService.createPortfolioItem(itemForm);
        toast.success('Job created');
      }
      setItemForm(EMPTY_ITEM);
      setEditingItemId(null);
      await load();
      setJobsPage(1);
    } catch (error) {
      console.error(error);
      toast.error('Failed to save job');
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    await websiteAdminService.deleteCategory(id);
    await load();
  };

  const deleteJob = async (id: string) => {
    if (!confirm('Delete this job entry?')) return;
    await websiteAdminService.deletePortfolioItem(id);
    await load();
  };

  const uploadMedia = async (file: File | null) => {
    if (!file) return;
    setUploadingMedia(true);
    try {
      const response = await websiteAdminService.uploadJobMedia(file);
      setItemForm((current) => ({
        ...current,
        media_url: response.media_url,
        media_type: response.media_type,
      }));
      toast.success('Media uploaded successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload media');
    } finally {
      setUploadingMedia(false);
    }
  };

  const switchTopTab = (tab: WebsiteTab) => {
    setActiveTab(tab);
    router.replace(`/admin/website?tab=${tab}`, { scroll: false });
  };

  if (loading || !data || !contentForm) {
    return <div className="p-6">Loading website content...</div>;
  }

  return (
    <div className="space-y-8 bg-gray-50 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Website Studio</h1>
        <p className="mt-1 text-sm text-gray-600">
          Web Content and Our Jobs are separate. Each tab shows only the section you want to work on.
        </p>
      </div>

      <section className="rounded-3xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => switchTopTab('web')}
            className={`rounded-2xl px-5 py-3 text-sm font-semibold ${
              activeTab === 'web' ? 'bg-emerald-600 text-white' : 'bg-gray-50 text-gray-700'
            }`}
          >
            Web Content
          </button>
          <button
            type="button"
            onClick={() => switchTopTab('jobs')}
            className={`rounded-2xl px-5 py-3 text-sm font-semibold ${
              activeTab === 'jobs' ? 'bg-emerald-600 text-white' : 'bg-gray-50 text-gray-700'
            }`}
          >
            Our Jobs
          </button>
        </div>
      </section>

      {activeTab === 'web' ? (
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
            <div className="grid gap-3">
              <TabButton
                active={activeWebTab === 'about'}
                onClick={() => setActiveWebTab('about')}
                title="About"
                description="Edit only the About section content."
              />
              <TabButton
                active={activeWebTab === 'services'}
                onClick={() => setActiveWebTab('services')}
                title="Our Services"
                description="Edit the section summary and the service list."
              />
            </div>

            <div className="rounded-3xl border border-gray-200 bg-gray-50 p-6">
              {activeWebTab === 'about' ? (
                <form
                  onSubmit={(event) =>
                    saveSection(event, 'about', {
                      about_description: contentForm.about_description || '',
                    })
                  }
                  className="grid gap-5"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">About</p>
                    <p className="mt-1 text-sm text-gray-600">
                      This label stays fixed on the website. Only the description is editable.
                    </p>
                  </div>
                  <textarea
                    className={textareaClassName}
                    value={contentForm.about_description || ''}
                    onChange={(event) => updateContentField('about_description', event.target.value)}
                    rows={9}
                    placeholder="About description"
                  />
                  <button
                    type="submit"
                    className="w-fit rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    {savingSection === 'about' ? 'Saving...' : 'Save About'}
                  </button>
                </form>
              ) : null}

              {activeWebTab === 'services' ? (
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveServicesTab('summary')}
                      className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                        activeServicesTab === 'summary'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-gray-700'
                      }`}
                    >
                      Summary
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveServicesTab('list')}
                      className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                        activeServicesTab === 'list'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-gray-700'
                      }`}
                    >
                      Services List
                    </button>
                  </div>

                  {activeServicesTab === 'summary' ? (
                    <form
                      onSubmit={(event) =>
                        saveSection(event, 'services-summary', {
                          services_description: contentForm.services_description || '',
                        })
                      }
                      className="grid gap-5"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Our Services Summary</p>
                        <p className="mt-1 text-sm text-gray-600">
                          This is the intro text shown above the service cards on the homepage.
                        </p>
                      </div>
                      <textarea
                        className={textareaClassName}
                        value={contentForm.services_description || ''}
                        onChange={(event) =>
                          updateContentField('services_description', event.target.value)
                        }
                        rows={8}
                        placeholder="Services summary"
                      />
                      <button
                        type="submit"
                        className="w-fit rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                      >
                        {savingSection === 'services-summary' ? 'Saving...' : 'Save Summary'}
                      </button>
                    </form>
                  ) : null}

                  {activeServicesTab === 'list' ? (
                    <form
                      onSubmit={(event) =>
                        saveSection(event, 'services-list', {
                          services_items: serviceItems.map((item) => item.trim()).filter(Boolean),
                        })
                      }
                      className="grid gap-5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Services List</p>
                          <p className="mt-1 text-sm text-gray-600">
                            Each line becomes a service card on the website.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={addServiceItem}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700"
                        >
                          Add Service
                        </button>
                      </div>

                      <div className="grid gap-4">
                        {serviceItems.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-5 text-sm text-gray-600">
                            No services added yet. Click "Add Service" to begin.
                          </div>
                        ) : (
                          serviceItems.map((item, index) => (
                            <div
                              key={`service-item-${index}`}
                              className="grid gap-3 rounded-2xl border border-white bg-white p-4 md:grid-cols-[minmax(0,1fr)_auto]"
                            >
                              <input
                                className={inputClassName}
                                value={item}
                                onChange={(event) => updateServiceItem(index, event.target.value)}
                                placeholder={`Service ${index + 1}`}
                              />
                              <button
                                type="button"
                                onClick={() => removeServiceItem(index)}
                                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600"
                              >
                                Remove
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      <button
                        type="submit"
                        className="w-fit rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                      >
                        {savingSection === 'services-list' ? 'Saving...' : 'Save Services List'}
                      </button>
                    </form>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === 'jobs' ? (
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
            <div className="grid gap-3">
              <TabButton
                active={activeJobsTab === 'upload'}
                onClick={() => setActiveJobsTab('upload')}
                title="Upload Jobs"
                description="Upload and manage job entries only."
              />
              <TabButton
                active={activeJobsTab === 'categories'}
                onClick={() => setActiveJobsTab('categories')}
                title="Add Category"
                description="Create and manage job categories only."
              />
            </div>

            <div className="rounded-3xl border border-gray-200 bg-gray-50 p-6">
              {activeJobsTab === 'categories' ? (
                <div className="space-y-6">
                  <form onSubmit={saveCategory} className="grid gap-4">
                    <input
                      className={inputClassName}
                      value={categoryForm.name}
                      onChange={(event) =>
                        setCategoryForm({ ...categoryForm, name: event.target.value })
                      }
                      placeholder="Category name"
                      required
                    />
                    <input
                      className={inputClassName}
                      value={categoryForm.description}
                      onChange={(event) =>
                        setCategoryForm({ ...categoryForm, description: event.target.value })
                      }
                      placeholder="Description"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                      >
                        {editingCategoryId ? 'Update' : 'Add'} Category
                      </button>
                      {editingCategoryId ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryForm(EMPTY_CATEGORY);
                            setEditingCategoryId(null);
                          }}
                          className="rounded border border-gray-300 px-4 py-2 text-sm"
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </form>

                  <div className="space-y-3">
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white bg-white px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{category.name}</p>
                          <p className="mt-1 text-sm text-gray-600">
                            {category.description || 'No description'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategoryId(category.id);
                              setCategoryForm({
                                name: category.name,
                                description: category.description || '',
                              });
                            }}
                            className="rounded border border-gray-300 px-3 py-1 text-xs"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCategory(category.id)}
                            className="rounded border border-red-300 px-3 py-1 text-xs text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {activeJobsTab === 'upload' ? (
                <div className="space-y-6">
                  <form onSubmit={saveJob} className="grid gap-4 md:grid-cols-2">
                    <input
                      className={inputClassName}
                      value={itemForm.title}
                      onChange={(event) =>
                        setItemForm({ ...itemForm, title: event.target.value })
                      }
                      placeholder="Job title"
                      required
                    />
                    <select
                      className={inputClassName}
                      value={itemForm.category_id || ''}
                      onChange={(event) =>
                        setItemForm({ ...itemForm, category_id: event.target.value || null })
                      }
                    >
                      <option value="">Uncategorized</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <textarea
                      className={`${textareaClassName} md:col-span-2`}
                      value={itemForm.description || ''}
                      onChange={(event) =>
                        setItemForm({ ...itemForm, description: event.target.value })
                      }
                      rows={4}
                      placeholder="Short description"
                    />
                    <select
                      className={inputClassName}
                      value={itemForm.media_type}
                      onChange={(event) =>
                        setItemForm({
                          ...itemForm,
                          media_type: event.target.value as 'image' | 'video',
                        })
                      }
                    >
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                    </select>
                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-gray-700">Upload media</span>
                      <input
                        className={inputClassName}
                        type="file"
                        accept="image/*,video/*"
                        onChange={(event) => uploadMedia(event.target.files?.[0] || null)}
                      />
                      <span className="text-xs text-gray-500">
                        {uploadingMedia
                          ? 'Uploading to cloud...'
                          : itemForm.media_url
                            ? 'Media uploaded successfully'
                            : 'Choose an image or video'}
                      </span>
                    </label>
                    <div className="md:col-span-2 rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
                      {itemForm.media_url ? (
                        <span className="break-all">Uploaded media URL: {itemForm.media_url}</span>
                      ) : (
                        <span>No media uploaded yet.</span>
                      )}
                    </div>
                    <div className="md:col-span-2 flex gap-2">
                      <button
                        type="submit"
                        disabled={!itemForm.media_url || uploadingMedia}
                        className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
                      >
                        {editingItemId ? 'Update' : 'Add'} Job Entry
                      </button>
                      {editingItemId ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItemId(null);
                            setItemForm(EMPTY_ITEM);
                          }}
                          className="rounded border border-gray-300 px-4 py-2 text-sm"
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </form>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">Uploaded Jobs</h3>
                        <p className="text-sm text-gray-600">
                          Showing {visibleItems.length} of {items.length} jobs
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <button
                          type="button"
                          onClick={() => setJobsPage((current) => Math.max(1, current - 1))}
                          disabled={jobsPage === 1}
                          className="rounded border border-gray-300 px-3 py-1.5 disabled:opacity-40"
                        >
                          Prev
                        </button>
                        <span>
                          Page {jobsPage} of {totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setJobsPage((current) => Math.min(totalPages, current + 1))
                          }
                          disabled={jobsPage === totalPages}
                          className="rounded border border-gray-300 px-3 py-1.5 disabled:opacity-40"
                        >
                          Next
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      {visibleItems.map((item) => (
                        <article
                          key={item.id}
                          className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
                        >
                          <div className="p-3">
                            <MediaThumb item={item} />
                          </div>
                          <div className="border-t border-gray-100 px-4 py-3">
                            <p className="line-clamp-1 text-sm font-semibold text-gray-900">
                              {item.title}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">
                              {item.category.name}
                            </p>
                            <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                              {item.description || 'No description'}
                            </p>
                            <div className="mt-3 flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItemId(item.id);
                                  setItemForm({
                                    title: item.title,
                                    description: item.description || '',
                                    media_type: item.media_type,
                                    media_url: item.media_url,
                                    category_id: item.category.id,
                                    is_featured: item.is_featured,
                                    display_order: item.display_order,
                                  });
                                }}
                                className="rounded border border-gray-300 px-3 py-1 text-xs"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteJob(item.id)}
                                className="rounded border border-red-300 px-3 py-1 text-xs text-red-600"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
