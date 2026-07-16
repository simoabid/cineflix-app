import React from 'react';
import { LegalPageLayout, LegalSection } from './LegalPageLayout';
import {
  SUPPORT_CTA_LABEL,
  SUPPORT_MESSAGE,
  SUPPORT_URL,
  DISCORD_LINK,
  GITHUB_LINK,
} from '../../setup/constants';

const SupportPage: React.FC = () => {
  return (
    <LegalPageLayout
      title="Support CINEFLIX"
      description="About the project, how to help, and where to get community help."
      lastUpdated="July 16, 2026"
    >
      <LegalSection title="About">
        <p>
          CINEFLIX is a free, student-built platform for discovering, tracking, and watching movies
          and TV shows. It is maintained in personal time on self-hosted infrastructure.
        </p>
        <p>{SUPPORT_MESSAGE}</p>
      </LegalSection>

      <LegalSection title="Ways to support">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-type-emphasis">Tip or donate</strong> on{' '}
            <a
              href={SUPPORT_URL}
              className="text-type-logo hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ko-fi (ko-fi.com/abiddev)
            </a>{' '}
            — one-time or monthly.
          </li>
          <li>
            <strong className="text-type-emphasis">Keep support ads on</strong> when that option
            ships (default on; you can hide them in settings; supporters stay ad-free).
          </li>
          <li>
            <strong className="text-type-emphasis">Share feedback</strong> and report bugs so the
            product stays usable.
          </li>
        </ul>
        <a
          href={SUPPORT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-buttons-purple px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-buttons-purpleHover"
        >
          {SUPPORT_CTA_LABEL} on Ko-fi
        </a>
      </LegalSection>

      <LegalSection title="Community & contact">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Discord:{' '}
            <a
              href={DISCORD_LINK}
              className="text-type-logo hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Community server
            </a>
          </li>
          <li>
            GitHub:{' '}
            <a
              href={GITHUB_LINK}
              className="text-type-logo hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {GITHUB_LINK.replace('https://', '')}
            </a>
          </li>
          <li>
            Email:{' '}
            <a className="text-type-logo hover:underline" href="mailto:contact@cineflix.dev">
              contact@cineflix.dev
            </a>
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="What your support is not">
        <p>
          Support does not purchase copyrighted media, unlock “better illegal streams,” or create a
          paid SLA. It helps keep hosting, domain, and maintenance sustainable for a free product.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
};

export default SupportPage;
