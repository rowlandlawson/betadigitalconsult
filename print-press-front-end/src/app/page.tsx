'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { publicContentService, PublicLandingResponse } from '@/lib/publicContentService';
import { PublicFooter } from '@/components/public/public-footer';
import { PublicNavbar } from '@/components/public/public-navbar';

const DEFAULT_DATA: PublicLandingResponse = {
  content: {
    hero_title: 'Print and design support that helps your brand show up well.',
    hero_subtitle:
      'From everyday business materials to campaign-ready print jobs, we help you look polished, prepared, and easy to trust.',
    hero_panel_title: 'Built for brands that want clean, confident presentation.',
    hero_panel_description:
      'We combine design thinking, quality production, and dependable turnaround so your printed materials feel as professional as your business.',
    about_title: 'About BetaDigital Consult',
    about_description:
      'We deliver quality design and print services for growing businesses.',
    services_title: 'What We Do',
    services_description:
      'Branding, design, and print production with professional finishing.',
    services_items: [
      'Brand identity design',
      'Brochures, flyers, and company profiles',
      'Large-format banners and signage',
      'Business cards and branded stationery',
      'Packaging and label production',
      'Event and campaign print support',
    ],
    cta_title: 'Ready to Start?',
    cta_description: 'Message us on WhatsApp to discuss your project.',
    cta_button_text: 'Chat on WhatsApp',
  },
  contact: {
    company_name: 'BetaDigital Consult',
    tagline: '',
    email: '',
    address: '',
    phone: '',
    whatsapp_number: '',
    logo: null,
  },
  featured_portfolio: [],
};

const toWhatsAppUrl = (value: string) => {
  const normalized = value.replace(/[^\d+]/g, '');
  if (!normalized) return '#';
  const number = normalized.startsWith('+') ? normalized.slice(1) : normalized;
  return `https://wa.me/${number}`;
};

const renderMedia = (mediaType: 'image' | 'video', mediaUrl: string, title: string) => {
  if (mediaType === 'video') {
    return (
      <video controls className="h-52 w-full rounded-lg border border-gray-200 bg-black object-cover">
        <source src={mediaUrl} />
      </video>
    );
  }

  return (
    <a
      href={mediaUrl}
      target="_blank"
      rel="noreferrer"
      className="block overflow-hidden rounded-lg"
      aria-label={`Open ${title}`}
    >
      <img
        src={mediaUrl}
        alt={title}
        className="h-52 w-full rounded-lg border border-gray-200 object-cover transition duration-300 hover:scale-[1.02]"
      />
    </a>
  );
};

export default function HomePage() {
  const [data, setData] = useState<PublicLandingResponse>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await publicContentService.getLanding();
        setData(response);
      } catch (error) {
        console.error('Failed to load landing page data:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setHeroVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const whatsappUrl = useMemo(
    () => toWhatsAppUrl(data.contact.whatsapp_number || data.contact.phone || ''),
    [data.contact.phone, data.contact.whatsapp_number]
  );
  const whatsappNumber = data.contact.whatsapp_number || data.contact.phone || '-';
  const heroAccent = data.contact.company_name || 'BetaDigital Consult';
  const heroEyebrow =
    data.content.hero_eyebrow || 'Print support for brands that want to look ready';
  const serviceItems = data.content.services_items?.filter(Boolean) || [];

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f6fbf8_0%,#ffffff_38%,#ffffff_100%)] text-gray-900">
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.20),_transparent_42%),radial-gradient(circle_at_80%_18%,_rgba(15,23,42,0.14),_transparent_28%)]" />
        <PublicNavbar content={data.content} contact={data.contact} whatsappUrl={whatsappUrl} />
        <div className="mx-auto grid max-w-6xl gap-14 px-6 pb-20 pt-28 md:items-center lg:grid-cols-[1.1fr_0.9fr] lg:pb-24 lg:pt-32">
          <div
            className={`transition-all duration-1000 ease-out ${heroVisible ? 'opacity-100' : 'opacity-0'}`}
            style={{ transform: `translateY(${heroVisible ? 0 : 28}px)` }}
          >
            <p className="inline-flex rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700 shadow-sm backdrop-blur">
              {heroEyebrow}
            </p>
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.32em] text-slate-500">
              {heroAccent}
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight text-slate-950 md:text-6xl md:leading-[1.05]">
              <span className="block">{data.content.hero_title}</span>
              <span className="mt-3 block text-balance text-emerald-700">
                {data.content.hero_highlight_text ||
                  'The kind of print work that makes people take your brand seriously.'}
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">
              {data.content.hero_subtitle}
            </p>
            <div
              className={`mt-10 flex flex-wrap gap-4 transition-all delay-150 duration-1000 ${
                heroVisible ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ transform: `translateY(${heroVisible ? 0 : 22}px)` }}
            >
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {(data.content.cta_button_text || 'Chat on WhatsApp') +
                  (whatsappNumber !== '-' ? ` (${whatsappNumber})` : '')}
              </a>
              <Link
                href="/portfolio"
                className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
              >
                View Our Jobs
              </Link>
            </div>
            <div
              className={`mt-12 grid max-w-2xl gap-4 sm:grid-cols-3 transition-all delay-300 duration-1000 ${
                heroVisible ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ transform: `translateY(${heroVisible ? 0 : 18}px)` }}
            >
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.45)] backdrop-blur">
                <p className="text-2xl font-semibold text-slate-950">Thoughtful</p>
                <p className="mt-1 text-sm text-slate-600">Design choices that make your message easier to trust.</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.45)] backdrop-blur">
                <p className="text-2xl font-semibold text-slate-950">Reliable</p>
                <p className="mt-1 text-sm text-slate-600">Turnaround you can plan around for launches and events.</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.45)] backdrop-blur">
                <p className="text-2xl font-semibold text-slate-950">Consistent</p>
                <p className="mt-1 text-sm text-slate-600">A clean look across print, signage, packaging, and collateral.</p>
              </div>
            </div>
          </div>

          <div
            className={`relative transition-all delay-200 duration-1000 ease-out ${
              heroVisible ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transform: `translateY(${heroVisible ? 0 : 28}px)` }}
          >
            <div className="absolute -left-8 top-10 h-24 w-24 rounded-full bg-emerald-200/50 blur-3xl" />
            <div className="absolute -right-6 bottom-10 h-28 w-28 rounded-full bg-slate-200/70 blur-3xl" />
            <div className="px-2 py-6 lg:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">
                Trusted by growing brands
              </p>
              <p className="mt-3 text-3xl font-semibold leading-tight text-slate-950">
                {heroAccent}
              </p>
              <p className="mt-5 max-w-md text-base leading-8 text-slate-600">
                Practical design support, dependable print delivery, and a finish that feels
                considered from the first impression.
              </p>

              <div className="mt-8 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Business-ready print</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Brochures, company profiles, branded stationery, event materials, and
                    campaign assets.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">Production support</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Clear communication, dependable timelines, and finishing that looks calm
                    and professional.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 text-xs font-medium text-slate-600">
                <span className="rounded-full bg-white/80 px-3 py-2 shadow-sm ring-1 ring-slate-200">
                  Corporate identity print
                </span>
                <span className="rounded-full bg-white/80 px-3 py-2 shadow-sm ring-1 ring-slate-200">
                  Large-format signage
                </span>
                <span className="rounded-full bg-white/80 px-3 py-2 shadow-sm ring-1 ring-slate-200">
                  Marketing collateral
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative -mt-8 pb-8">
        <div className="mx-auto max-w-5xl px-6">
          <div
            className={`rounded-[2rem] border border-emerald-100 bg-[linear-gradient(135deg,#ffffff_0%,#f3fbf7_100%)] p-6 shadow-[0_30px_70px_-45px_rgba(16,185,129,0.45)] transition-all duration-1000 ${
              heroVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
            }`}
          >
            <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-emerald-700">
                  Production snapshot
                </p>
                <h2 className="mt-3 text-2xl font-semibold leading-tight text-slate-950 md:text-3xl">
                  {data.content.hero_panel_title || 'Built for brands that want clean, confident presentation.'}
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
                  {data.content.hero_panel_description ||
                    'We combine design thinking, quality production, and dependable turnaround so your printed materials feel as professional as your business.'}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
                <div className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Best for</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    Company profiles, branded event packs, launch materials, signage, and premium print runs.
                  </p>
                </div>
                <div className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Working style</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    Friendly communication, practical guidance, and output that feels finished.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="bg-gray-50 py-14 scroll-mt-28">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">About</p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-950 md:text-4xl">
            A dependable print partner for brands that need polished delivery.
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-8 text-gray-700 md:text-lg">
            {data.content.about_description}
          </p>
        </div>
      </section>

      <section id="services" className="mx-auto max-w-6xl px-6 py-14 scroll-mt-28">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">
          Our Services
        </p>
        <div className="mt-4 max-w-3xl">
          <h2 className="text-3xl font-semibold text-slate-950 md:text-4xl">
            Print and design services presented clearly, so clients know exactly what Beta offers.
          </h2>
          <p className="mt-5 text-base leading-8 text-gray-700 md:text-lg">
            {data.content.services_description}
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {serviceItems.map((service, index) => (
            <article
              key={`${service}-${index}`}
              className="rounded-[1.6rem] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f6fbf8_100%)] p-5 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.35)]"
            >
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <p className="text-sm leading-7 text-slate-700 md:text-base">{service}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold">{data.content.jobs_section_title || 'Our Jobs'}</h2>
          <Link href="/portfolio" className="text-sm font-semibold text-emerald-700 hover:underline">
            {data.content.jobs_section_link_text || 'View All Jobs'}
          </Link>
        </div>
        {loading ? (
          <p className="text-gray-600">{data.content.jobs_loading_text || 'Loading jobs...'}</p>
        ) : data.featured_portfolio.length === 0 ? (
          <p className="text-gray-600">{data.content.jobs_empty_text || 'No jobs added yet.'}</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {data.featured_portfolio.slice(0, 3).map((item) => (
              <article key={item.id} className="rounded-xl border border-gray-200 p-4 shadow-sm">
                {renderMedia(item.media_type, item.media_url, item.title)}
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  {item.category?.name || 'Uncategorized'}
                </p>
                <h3 className="mt-1 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{item.description}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="bg-emerald-700 py-14 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-semibold">{data.content.cta_title}</h2>
          <p className="mt-3 max-w-3xl text-emerald-50">{data.content.cta_description}</p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-block rounded-md bg-white px-5 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            {(data.content.cta_button_text || 'Chat on WhatsApp') +
              (whatsappNumber !== '-' ? ` (${whatsappNumber})` : '')}
          </a>
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-6xl px-6 py-12 scroll-mt-28">
        <h2 className="text-xl font-semibold">{data.content.contact_section_title || 'Contact'}</h2>
        <div className="mt-4 grid gap-3 text-sm text-gray-700 md:grid-cols-3">
          <p>
            <span className="font-semibold">Email:</span> {data.contact.email || '-'}
          </p>
          <p>
            <span className="font-semibold">Address:</span> {data.contact.address || '-'}
          </p>
          <p>
            <span className="font-semibold">Phone:</span> {data.contact.phone || '-'}
          </p>
          <p>
            <span className="font-semibold">WhatsApp:</span> {whatsappNumber}
          </p>
        </div>
      </section>

      <PublicFooter content={data.content} contact={data.contact} whatsappUrl={whatsappUrl} />
    </main>
  );
}
