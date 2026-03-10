import Link from 'next/link';
import { LandingContent, WebsiteContactInfo } from '@/lib/publicContentService';

type PublicFooterProps = {
  content: LandingContent;
  contact: WebsiteContactInfo;
  whatsappUrl: string;
};

export function PublicFooter({ content, contact, whatsappUrl }: PublicFooterProps) {
  const companyName = contact.company_name || 'BetaDigital Consult';

  return (
    <footer className="border-t border-emerald-100 bg-[linear-gradient(180deg,#f4faf6_0%,#eef6f1_100%)]">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <div>
          <img
            src="/logo.png"
            alt={companyName}
            className="h-12 w-auto rounded-xl object-cover"
          />
          <h2 className="mt-5 text-2xl font-semibold text-slate-950">{companyName}</h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-slate-600">
            Professional design and print support for businesses, campaigns, and events that need
            polished materials and dependable delivery.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">
            Explore
          </p>
          <div className="mt-5 grid gap-3 text-sm text-slate-700">
            <Link href="/#about" className="transition hover:text-slate-950">
              About
            </Link>
            <Link href="/#services" className="transition hover:text-slate-950">
              Our Services
            </Link>
            <Link href="/portfolio" className="transition hover:text-slate-950">
              {content.navbar_jobs_text || 'Our Jobs'}
            </Link>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">
            Contact
          </p>
          <div className="mt-5 grid gap-3 text-sm leading-7 text-slate-600">
            <p>{contact.phone || 'Phone not added yet.'}</p>
            <p>{contact.email || 'Email not added yet.'}</p>
            <p>{contact.address || 'Address not added yet.'}</p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex w-fit rounded-full bg-emerald-700 px-5 py-2.5 font-semibold text-white transition hover:bg-emerald-800"
            >
              {content.navbar_contact_text || 'Contact Us'}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
