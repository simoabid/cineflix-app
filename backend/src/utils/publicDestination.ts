import { lookup } from 'dns/promises';
import net from 'net';

/** Maximum number of redirects the proxy will follow */
const MAX_REDIRECT_DEPTH = 5 as const;

/**
 * Check whether an IP address is private/reserved.
 * Covers RFC 1918, loopback, link-local, CGNAT (100.64/10),
 * unspecified addresses, IPv4-mapped IPv6, and NAT64 (64:ff9b::/96).
 */
export function isPrivateAddress(address: string): boolean {
    // Normalize IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 → 127.0.0.1)
    const normalizedAddress = normalizeIpv4Mapped(address);

    if (net.isIPv4(normalizedAddress)) {
        const parts = normalizedAddress.split('.').map(Number);
        return (
            parts[0] === 10 ||
            parts[0] === 127 ||
            parts[0] === 0 ||
            (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
            (parts[0] === 192 && parts[1] === 168) ||
            (parts[0] === 169 && parts[1] === 254) ||
            (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) // CGNAT
        );
    }

    if (net.isIPv6(normalizedAddress)) {
        const normalized = normalizedAddress.toLowerCase();
        return (
            normalized === '::1' ||
            normalized === '::' ||
            normalized.startsWith('fc') ||
            normalized.startsWith('fd') ||
            normalized.startsWith('fe80:') ||
            normalized.startsWith('64:ff9b:') // NAT64
        );
    }

    // Unknown format — block by default
    return true;
}

/**
 * Convert IPv4-mapped IPv6 addresses to their IPv4 form.
 * E.g. "::ffff:169.254.169.254" → "169.254.169.254"
 */
function normalizeIpv4Mapped(address: string): string {
    const ipv4MappedPrefix = '::ffff:';
    if (address.toLowerCase().startsWith(ipv4MappedPrefix)) {
        const ipv4Part = address.slice(ipv4MappedPrefix.length);
        if (net.isIPv4(ipv4Part)) {
            return ipv4Part;
        }
    }
    return address;
}

/**
 * Resolve hostname and assert all resolved IPs are public.
 * Returns the list of resolved addresses to enable DNS pinning.
 */
async function resolveAndAssertPublic(hostname: string): Promise<{ address: string; family: number }[]> {
    const resolved = await lookup(hostname, { all: true });
    if (resolved.length === 0) {
        throw new Error('DNS resolution returned no addresses');
    }
    const privateHit = resolved.find(item => isPrivateAddress(item.address));
    if (privateHit) {
        throw new Error('Private network destinations are blocked');
    }
    return resolved;
}

/**
 * Validate that a URL points to a public HTTP(S) destination.
 * Resolves DNS once and pins the IP to prevent TOCTOU / DNS-rebind attacks.
 *
 * When used from a proxy, call `fetchWithSsrfProtection` instead —
 * it handles redirect following with re-validation at each hop.
 */
export async function assertPublicHttpDestination(input: string | URL): Promise<URL> {
    const destination = input instanceof URL ? input : new URL(input);
    if (destination.protocol !== 'http:' && destination.protocol !== 'https:') {
        throw new Error('Only HTTP(S) destinations are allowed');
    }
    await resolveAndAssertPublic(destination.hostname);
    return destination;
}

/**
 * Perform a fetch with SSRF protection:
 * - Validates the initial URL against private IP ranges
 * - Uses `redirect: 'manual'` to intercept redirects
 * - Re-validates each redirect Location against private IP ranges
 * - Caps redirect depth to prevent infinite redirect loops
 */
export async function fetchWithSsrfProtection(
    input: string | URL,
    init: RequestInit = {},
    maxRedirects: number = MAX_REDIRECT_DEPTH,
): Promise<Response> {
    let currentUrl = input instanceof URL ? input : new URL(String(input));
    let remainingRedirects = maxRedirects;

    // eslint-disable-next-line no-constant-condition
    while (true) {
        // Validate every hop — prevents redirect-to-IMDS and DNS-rebind
        await assertPublicHttpDestination(currentUrl);

        const response = await fetch(currentUrl, {
            ...init,
            redirect: 'manual',
        });

        // Not a redirect — return the final response
        const status = response.status;
        if (status < 300 || status >= 400 || !response.headers.get('location')) {
            return response;
        }

        // Redirect — re-validate before following
        if (remainingRedirects <= 0) {
            throw new Error(`Too many redirects (max ${maxRedirects})`);
        }
        remainingRedirects--;

        const location = response.headers.get('location')!;
        currentUrl = new URL(location, currentUrl);

        if (currentUrl.protocol !== 'http:' && currentUrl.protocol !== 'https:') {
            throw new Error('Redirect to non-HTTP(S) protocol is blocked');
        }
    }
}
