/**
 * Structural security checks for the public Settings surface.
 * Reads shipped source so route/protect regressions fail the suite.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../../..');

function readSrc(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

describe('settings security surface (shipped source)', () => {
  it('exposes /settings publicly without ProtectedRoute wrapper', () => {
    const app = readSrc('src/App.tsx');
    // Public settings route must not be nested in ProtectedRoute
    expect(app).toMatch(/path=["']\/settings["']\s+element=\{<\s*SettingsPage/);
    expect(app).not.toMatch(
      /path=["']\/settings["']\s+element=\{\s*\n?\s*<ProtectedRoute>[\s\S]*SettingsPage/,
    );
    // Legacy account still redirects (not a protected shell)
    expect(app).toMatch(/path=["']\/account["']/);
    expect(app).toMatch(/AccountToSettingsRedirect|pathname:\s*['"]\/settings['"]/);
  });

  it('keeps backend preferences routes behind protect middleware', () => {
    const routes = readSrc('backend/src/routes/preferencesRoutes.ts');
    expect(routes).toMatch(/import\s*\{\s*protect\s*\}/);
    // Global gate before any preference handlers
    const protectIdx = routes.indexOf('router.use(protect)');
    const getIdx = routes.indexOf("router.get('/'");
    const putIdx = routes.indexOf("router.put('/'");
    expect(protectIdx).toBeGreaterThan(-1);
    expect(getIdx).toBeGreaterThan(protectIdx);
    expect(putIdx).toBeGreaterThan(protectIdx);
  });

  it('guest merge allowlist excludes account-bound and supporter elevation keys', () => {
    const hook = readSrc('src/hooks/useAccountSettings.ts');
    // isSupporter must not appear inside GLOBAL_MERGE_KEYS array
    const mergeBlock = hook.match(
      /export const GLOBAL_MERGE_KEYS[\s\S]*?\] as const/,
    )?.[0];
    expect(mergeBlock).toBeTruthy();
    expect(mergeBlock).not.toMatch(/['"]isSupporter['"]/);
    expect(mergeBlock).not.toMatch(/['"]emailNotifications['"]/);
    expect(mergeBlock).not.toMatch(/['"]profileVisible['"]/);
    expect(mergeBlock).not.toMatch(/['"]newsletterSubscription['"]/);
  });

  it('SettingsPage gates profile password handlers and auth tabs', () => {
    const page = readSrc('src/pages/SettingsPage.tsx');
    expect(page).toMatch(/authRequired:\s*true/);
    expect(page).toMatch(/if\s*\(\s*!isAuthenticated\s*\|\|\s*!user\s*\)\s*return/);
    expect(page).toMatch(/handlePasswordChange/);
    expect(page).toMatch(/SignInRequiredCard/);
    // Profile/password mutations require auth guard before API
    expect(page).toMatch(
      /const handlePasswordChange[\s\S]*?if\s*\(\s*!isAuthenticated\s*\|\|\s*!user\s*\)\s*return/,
    );
    expect(page).toMatch(
      /const handleProfileUpdate[\s\S]*?if\s*\(\s*!isAuthenticated\s*\|\|\s*!user\s*\)\s*return/,
    );
  });
});
