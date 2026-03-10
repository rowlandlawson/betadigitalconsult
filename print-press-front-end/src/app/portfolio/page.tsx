'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  LandingContent,
  PortfolioItem,
  publicContentService,
  PublicPortfolioResponse,
  WebsiteContactInfo,
} from '@/lib/publicContentService';
import { PublicFooter } from '@/components/public/public-footer';
import { PublicNavbar } from '@/components/public/public-navbar';

const DATE_FILTERS = [
  { value: 'all', label: 'All time' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 12 months' },
] as const;

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'az', label: 'Title A-Z' },
] as const;

const renderMedia = (item: PortfolioItem) => {
  if (item.media_type === 'video') {
    return (
      <video
        controls
        className="h-64 w-full rounded-[1.5rem] bg-black object-cover"
        preload="metadata"
      >
        <source src={item.media_url} />
      </video>
    );
  }

  return (
    <a
      href={item.media_url}
      target="_blank"
      rel="noreferrer"
      className="block overflow-hidden rounded-[1.5rem]"
      aria-label={`Open ${item.title}`}
    >
      <img
        src={item.media_url}
        alt={item.title}
        className="h-64 w-full object-cover transition duration-500 hover:scale-[1.03]"
      />
    </a>
  );
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));

export default function PortfolioPage() {
  const [data, setData] = useState<PublicPortfolioResponse>({
    categories: [],
    items: [],
  });
  const [landingContent, setLandingContent] = useState<LandingContent>({
    hero_title: '',
    navbar_jobs_text: 'Our Jobs',
    navbar_contact_text: 'Contact Us',
  });
  const [contact, setContact] = useState<WebsiteContactInfo>({
    company_name: 'BetaDigital Consult',
    tagline: '',
    email: '',
    address: '',
    phone: '',
    whatsapp_number: '',
    logo: null,
  });
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeDateRange, setActiveDateRange] =
    useState<(typeof DATE_FILTERS)[number]['value']>('all');
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]['value']>('newest');

  useEffect(() => {
    const load = async () => {
      try {
        const [portfolioResponse, landingResponse] = await Promise.all([
          publicContentService.getPortfolio(),
          publicContentService.getLanding(),
        ]);
        setData(portfolioResponse);
        setLandingContent(landingResponse.content);
        setContact(landingResponse.contact);
      } catch (error) {
        console.error('Failed to load portfolio:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const categoryOptions = useMemo(() => {
    const dynamicCategories = data.categories
      .filter((category) => category.items.length > 0)
      .map((category) => ({
        value: category.slug || category.id,
        label: category.name,
      }));

    return [{ value: 'all', label: 'All categories' }, ...dynamicCategories];
  }, [data.categories]);

  const filteredItems = useMemo(() => {
    const now = Date.now();

    return [...data.items]
      .filter((item) => {
        if (activeCategory === 'all') return true;
        return (item.category?.slug || item.category?.id) === activeCategory;
      })
      .filter((item) => {
        if (activeDateRange === 'all') return true;
        const ageInDays = (now - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24);
        return ageInDays <= Number(activeDateRange);
      })
      .sort((a, b) => {
        if (sortBy === 'oldest') {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortBy === 'az') {
          return a.title.localeCompare(b.title);
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [activeCategory, activeDateRange, data.items, sortBy]);

  const selectedCategoryLabel =
    categoryOptions.find((option) => option.value === activeCategory)?.label || 'All categories';
  const whatsappNumber = (contact.whatsapp_number || contact.phone || '').replace(/[^\d]/g, '');
  const whatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}` : '#';

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f5faf7_0%,#ffffff_28%,#ffffff_100%)] text-slate-900">
      <PublicNavbar
        content={landingContent}
        contact={contact}
        whatsappUrl={whatsappUrl}
        solid
      />
      <section className="relative overflow-hidden border-b border-emerald-100">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_34%),radial-gradient(circle_at_85%_18%,_rgba(148,163,184,0.18),_transparent_24%)]" />
        <div className="mx-auto max-w-7xl px-6 pb-12 pt-28 md:pb-16 md:pt-32">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">
            Our Jobs
          </p>
          <div className="mt-5 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-slate-950 md:text-6xl md:leading-[1.02]">
                Recent print, design, and production work presented as a clean archive.
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
                Browse completed jobs by category or timeframe. Each item reflects the kind of
                practical, business-ready output we deliver for brands, events, and campaigns.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[1.5rem] border border-white/80 bg-white/85 p-5 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.42)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Total jobs
                </p>
                <p className="mt-3 text-3xl font-semibold text-slate-950">{data.items.length}</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/80 bg-white/85 p-5 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.42)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Categories
                </p>
                <p className="mt-3 text-3xl font-semibold text-slate-950">{data.categories.length}</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/80 bg-white/85 p-5 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.42)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Showing
                </p>
                <p className="mt-3 text-xl font-semibold text-slate-950">{selectedCategoryLabel}</p>
              </div>
            </div>
          </div>
          <div className="mt-8">
            <Link href="/" className="text-sm font-semibold text-emerald-700 hover:underline">
              Back to Home
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 md:py-12">
        <div className="rounded-[2rem] border border-emerald-100 bg-white p-5 shadow-[0_35px_80px_-50px_rgba(15,23,42,0.4)] md:p-6">
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Category
              </span>
              <select
                value={activeCategory}
                onChange={(event) => setActiveCategory(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white"
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Timeframe
              </span>
              <select
                value={activeDateRange}
                onChange={(event) =>
                  setActiveDateRange(event.target.value as (typeof DATE_FILTERS)[number]['value'])
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white"
              >
                {DATE_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Sort
              </span>
              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(event.target.value as (typeof SORT_OPTIONS)[number]['value'])
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5 text-sm text-slate-600">
            <p>
              Showing <span className="font-semibold text-slate-950">{filteredItems.length}</span>{' '}
              job{filteredItems.length === 1 ? '' : 's'}
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveCategory('all');
                setActiveDateRange('all');
                setSortBy('newest');
              }}
              className="rounded-full border border-slate-200 px-4 py-2 font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Reset filters
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16 md:pb-20">
        {loading ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-slate-600 shadow-sm">
            Loading jobs...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
            <p className="text-lg font-semibold text-slate-900">No jobs match this filter.</p>
            <p className="mt-2 text-sm text-slate-600">
              Try another category or widen the date range to see more work.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => (
              <article
                key={item.id}
                className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_30px_70px_-48px_rgba(15,23,42,0.45)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_35px_80px_-45px_rgba(15,23,42,0.52)]"
              >
                <div className="overflow-hidden bg-slate-100 p-3">{renderMedia(item)}</div>
                <div className="p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                      {item.category?.name || 'Uncategorized'}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {formatDate(item.created_at)}
                    </span>
                  </div>
                  <h2 className="mt-4 text-xl font-semibold leading-snug text-slate-950">
                    {item.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {item.description || 'Completed production work delivered for client use.'}
                  </p>
                  <div className="mt-5">
                    <a
                      href={item.media_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
                    >
                      Open full media
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <PublicFooter content={landingContent} contact={contact} whatsappUrl={whatsappUrl} />
    </main>
  );
}
