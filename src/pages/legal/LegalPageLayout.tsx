import React from 'react';
import { Link } from 'react-router-dom';
import { SEOHead } from '../../components/layout/SEOHead';
import { Container } from '../../components/layout';
import { SUPPORT_CTA_LABEL, SUPPORT_MESSAGE, SUPPORT_URL } from '../../setup/constants';

type LegalPageLayoutProps = {
  readonly title: string;
  readonly description: string;
  readonly lastUpdated: string;
  readonly children: React.ReactNode;
};

/**
 * Shared chrome for Privacy, Terms, and Support static pages.
 */
export function LegalPageLayout({
  title,
  description,
  lastUpdated,
  children,
}: LegalPageLayoutProps): JSX.Element {
  return (
    <div className="min-h-screen bg-background-main text-type-emphasis">
      <SEOHead title={title} description={description} />
      <Container size="narrow" className="py-24 md:py-28">
        <header className="mb-10 border-b border-white/10 pb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-type-dimmed">
            CINEFLIX
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-type-emphasis md:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm text-type-secondary">{description}</p>
          <p className="mt-2 text-xs text-type-dimmed">Last updated: {lastUpdated}</p>
        </header>

        <article className="prose-legal space-y-8 text-base leading-relaxed text-type-secondary">
          {children}
        </article>

        <aside className="mt-12 rounded-xl border border-white/10 bg-background-secondary p-6">
          <p className="text-sm text-type-secondary">{SUPPORT_MESSAGE}</p>
          <a
            href={SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-buttons-purple px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-buttons-purpleHover"
          >
            {SUPPORT_CTA_LABEL}
          </a>
        </aside>

        <nav
          className="mt-10 flex flex-wrap gap-4 border-t border-white/10 pt-8 text-sm"
          aria-label="Legal pages"
        >
          <Link className="text-type-logo hover:underline" to="/privacy">
            Privacy Policy
          </Link>
          <Link className="text-type-logo hover:underline" to="/terms">
            Terms of Service
          </Link>
          <Link className="text-type-logo hover:underline" to="/support">
            Support
          </Link>
          <Link className="text-type-secondary hover:text-type-emphasis hover:underline" to="/">
            ← Back home
          </Link>
        </nav>
      </Container>
    </div>
  );
}

type LegalSectionProps = {
  readonly id?: string;
  readonly title: string;
  readonly children: React.ReactNode;
};

export function LegalSection({ id, title, children }: LegalSectionProps): JSX.Element {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="mb-3 text-xl font-semibold text-type-emphasis">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
