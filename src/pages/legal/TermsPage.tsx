import React from 'react';
import { Link } from 'react-router-dom';
import { LegalPageLayout, LegalSection } from './LegalPageLayout';
import { SUPPORT_URL } from '../../setup/constants';

const TermsPage: React.FC = () => {
  return (
    <LegalPageLayout
      title="Terms of Service"
      description="Rules for using CINEFLIX — a free, open-source discovery and streaming platform."
      lastUpdated="July 16, 2026"
    >
      <LegalSection title="Agreement">
        <p>
          By accessing or using CINEFLIX (including cineflix.dev and related apps or APIs we
          operate), you agree to these Terms. If you do not agree, do not use the service.
        </p>
      </LegalSection>

      <LegalSection title="What CINEFLIX is">
        <p>
          CINEFLIX is a <strong className="text-type-emphasis">free, open-source</strong> project
          for discovering, tracking, and watching movies and TV shows. It is provided as-is for
          personal, non-commercial use. Features may change, break, or be removed at any time.
        </p>
      </LegalSection>

      <LegalSection title="Accounts">
        <p>
          You are responsible for keeping your credentials secure and for activity under your
          account. Provide accurate information. We may suspend or delete accounts that abuse the
          service, attempt to attack infrastructure, scrape aggressively, or harass others (for
          example in watch parties or community channels).
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Use the service for illegal purposes under applicable law</li>
          <li>Attempt to disrupt, overload, or reverse-engineer systems in a harmful way</li>
          <li>Circumvent rate limits, authentication, or security controls</li>
          <li>Misrepresent affiliation with CINEFLIX or ABID.Dev</li>
          <li>Upload malware or use the platform to distribute spam</li>
        </ul>
      </LegalSection>

      <LegalSection title="Content and third parties">
        <p>
          Movie and TV metadata, artwork, and related descriptive content typically come from
          third-party catalogs (for example TMDB). Trademarks and copyrights in titles, posters,
          and media belong to their respective owners.
        </p>
        <p>
          Playback may involve third-party sources or embeds outside our direct control. You are
          responsible for complying with the laws that apply to you when accessing media. We do not
          claim ownership of third-party media libraries.
        </p>
      </LegalSection>

      <LegalSection title="Support, donations, and ads">
        <p>
          CINEFLIX may invite voluntary support (for example via{' '}
          <a
            href={SUPPORT_URL}
            className="text-type-logo hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Ko-fi
          </a>
          ) and may display optional, non-intrusive support advertising on non-watch pages. Donations
          are generally voluntary and non-refundable unless required by law or the payment
          platform’s rules. Support does not create an employment, partnership, or guaranteed-SLA
          relationship.
        </p>
      </LegalSection>

      <LegalSection title="Intellectual property">
        <p>
          The CINEFLIX name, branding, and original software UI belonging to the project remain the
          property of the project maintainers, subject to any open-source licenses published with
          the source code. You may not use our branding in a way that confuses others about origin
          or endorsement.
        </p>
      </LegalSection>

      <LegalSection title="Disclaimer of warranties">
        <p>
          THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND,
          EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
          NON-INFRINGEMENT. We do not warrant uninterrupted or error-free operation.
        </p>
      </LegalSection>

      <LegalSection title="Limitation of liability">
        <p>
          To the maximum extent permitted by law, the maintainers and operators of CINEFLIX are not
          liable for indirect, incidental, special, consequential, or punitive damages, or any loss
          of data, profits, or goodwill arising from your use of the service.
        </p>
      </LegalSection>

      <LegalSection title="Privacy">
        <p>
          Our{' '}
          <Link className="text-type-logo hover:underline" to="/privacy">
            Privacy Policy
          </Link>{' '}
          describes how we handle personal data. It forms part of how we operate the service
          alongside these Terms.
        </p>
      </LegalSection>

      <LegalSection title="Changes and termination">
        <p>
          We may update these Terms by posting a new version on this page. Continued use after
          changes constitutes acceptance. We may discontinue the service or any feature at any
          time.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions:{' '}
          <a className="text-type-logo hover:underline" href="mailto:contact@cineflix.dev">
            contact@cineflix.dev
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
};

export default TermsPage;
