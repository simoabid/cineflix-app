import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { LegalPageLayout, LegalSection } from './LegalPageLayout';
import { SUPPORT_URL } from '../../setup/constants';

const PrivacyPage: React.FC = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    const targetId = hash.replace('#', '') || (pathname === '/cookies' ? 'cookies' : '');
    if (!targetId) return;
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [pathname, hash]);

  return (
    <LegalPageLayout
      title="Privacy Policy"
      description="How CINEFLIX handles account data, cookies, and third-party services."
      lastUpdated="July 16, 2026"
    >
      <LegalSection title="Overview">
        <p>
          CINEFLIX is a free, open-source movie and TV discovery, tracking, and streaming platform.
          This policy explains what information we process when you use{' '}
          <strong className="text-type-emphasis">cineflix.dev</strong> and related services.
        </p>
      </LegalSection>

      <LegalSection title="Information we collect">
        <p>
          <strong className="text-type-emphasis">Account data.</strong> If you register, we store
          information you provide such as email address, display name, password hash (we never
          store plain-text passwords), and optional profile details (for example avatar).
        </p>
        <p>
          <strong className="text-type-emphasis">Usage data you create.</strong> Features like My
          List, continue watching, preferences, collections, and watched-episode state are stored
          so the product can work across sessions and devices when you are signed in.
        </p>
        <p>
          <strong className="text-type-emphasis">Technical data.</strong> Our hosts and CDN
          (including Cloudflare) may process IP address, browser/user-agent, request paths, and
          basic performance metrics for security, reliability, and traffic analytics.
        </p>
        <p>
          <strong className="text-type-emphasis">Local storage.</strong> The app may keep
          preferences (theme, player settings, support-ad preference, banner dismissals) in your
          browser so the experience stays consistent without always requiring a server round-trip.
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="Cookies and similar technologies">
        <p>
          We use essential cookies for authentication (for example an httpOnly session cookie) so
          you can stay signed in securely. We may use analytics tooling to understand traffic at a
          high level. Optional advertising scripts (when enabled in a later product phase) may set
          their own cookies or identifiers; you will be able to hide support ads in settings when
          that feature ships.
        </p>
        <p>
          You can control cookies through your browser settings. Blocking essential cookies may
          break sign-in and account features.
        </p>
      </LegalSection>

      <LegalSection title="Third-party services">
        <p>Depending on configuration, CINEFLIX may communicate with:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Metadata providers such as TMDB / OMDb (titles, posters, descriptions)</li>
          <li>Infrastructure providers (hosting, CDN, DNS — e.g. AWS, Cloudflare)</li>
          <li>Authentication helpers such as Google OAuth when you choose that sign-in method</li>
          <li>
            Support platforms such as{' '}
            <a
              href={SUPPORT_URL}
              className="text-type-logo hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ko-fi
            </a>{' '}
            if you open our support page (their privacy policy applies on their site)
          </li>
        </ul>
        <p>
          Stream sources and embeds, when used, are third-party destinations outside our full
          control. Their privacy practices are their own.
        </p>
      </LegalSection>

      <LegalSection title="How we use information">
        <p>We use data to operate the product, secure accounts, remember your preferences and
          lists, improve reliability, measure traffic, and—only when you engage with them—process
          optional support or advertising experiences.
        </p>
        <p>We do not sell your personal information.</p>
      </LegalSection>

      <LegalSection title="Retention and security">
        <p>
          Account and list data is retained while your account is active. You may request account
          deletion by contacting us. We apply reasonable technical measures (including hashed
          passwords and cookie-based auth), but no online service is perfectly secure.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          CINEFLIX is not directed at children under 13 (or the minimum digital-consent age in your
          region). If you believe a child provided personal data, contact us so we can delete it.
        </p>
      </LegalSection>

      <LegalSection title="Your choices">
        <p>
          You can update profile details when signed in, clear local browser data, and (when
          available) disable support ads or support the project via Ko-fi. For access or deletion
          requests, email{' '}
          <a className="text-type-logo hover:underline" href="mailto:contact@cineflix.dev">
            contact@cineflix.dev
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          We may update this policy as the product evolves. Material changes will be reflected by
          revising the “Last updated” date on this page.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about privacy:{' '}
          <a className="text-type-logo hover:underline" href="mailto:contact@cineflix.dev">
            contact@cineflix.dev
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
};

export default PrivacyPage;
