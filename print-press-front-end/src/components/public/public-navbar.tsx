'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LandingContent, WebsiteContactInfo } from '@/lib/publicContentService';

type PublicNavbarProps = {
  content: LandingContent;
  contact: WebsiteContactInfo;
  whatsappUrl: string;
  solid?: boolean;
};

const navLinks = [
  { href: '/#about', label: 'About' },
  { href: '/#services', label: 'Our Services' },
  { href: '/portfolio', label: 'Our Jobs', dynamicKey: 'navbar_jobs_text' as const },
];

export function PublicNavbar({
  content,
  contact,
  whatsappUrl,
  solid = false,
}: PublicNavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [menuOpen]);

  const shellClassName = solid
    ? 'border-slate-200/80 bg-white/92'
    : 'border-[#AABD77]/35 bg-[rgba(170,189,119,0.18)]';

  return (
    <>
      <div className={`fixed inset-x-0 top-0 z-40 border-b backdrop-blur-md ${shellClassName}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt={contact.company_name || 'BetaDigital Consult'}
              className="h-11 w-auto rounded-xl object-cover"
            />
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white/70 hover:text-slate-950"
              >
                {link.dynamicKey ? content[link.dynamicKey] || link.label : link.label}
              </Link>
            ))}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-2 rounded-full bg-white/80 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-sm ring-1 ring-white/70 transition hover:bg-white"
            >
              {content.navbar_contact_text || 'Contact Us'}
            </a>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/70 text-slate-900 shadow-sm md:hidden"
            aria-label="Open menu"
          >
            <span className="space-y-1.5">
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
            </span>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          />
          <aside className="absolute right-0 top-0 flex h-full w-[min(86vw,22rem)] flex-col border-l border-slate-200 bg-white px-6 py-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <img
                src="/logo.png"
                alt={contact.company_name || 'BetaDigital Consult'}
                className="h-10 w-auto rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-700"
              >
                Close
              </button>
            </div>
            <nav className="mt-10 grid gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-base font-medium text-slate-900 transition hover:border-emerald-200 hover:bg-emerald-50"
                >
                  {link.dynamicKey ? content[link.dynamicKey] || link.label : link.label}
                </Link>
              ))}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => setMenuOpen(false)}
                className="rounded-2xl bg-emerald-700 px-4 py-3 text-base font-semibold text-white"
              >
                {content.navbar_contact_text || 'Contact Us'}
              </a>
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}
