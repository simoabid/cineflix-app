import { lookup } from 'dns/promises';
import net from 'net';

export function isPrivateAddress(address: string): boolean {
    if (net.isIPv4(address)) {
        const parts = address.split('.').map(Number);
        return (
            parts[0] === 10 ||
            parts[0] === 127 ||
            (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
            (parts[0] === 192 && parts[1] === 168) ||
            (parts[0] === 169 && parts[1] === 254)
        );
    }

    if (net.isIPv6(address)) {
        const normalized = address.toLowerCase();
        return (
            normalized === '::1' ||
            normalized.startsWith('fc') ||
            normalized.startsWith('fd') ||
            normalized.startsWith('fe80:')
        );
    }

    return true;
}

export async function assertPublicHttpDestination(input: string | URL): Promise<URL> {
    const destination = input instanceof URL ? input : new URL(input);
    if (destination.protocol !== 'http:' && destination.protocol !== 'https:') {
        throw new Error('Only HTTP(S) destinations are allowed');
    }

    const resolved = await lookup(destination.hostname, { all: true });
    if (resolved.some((item) => isPrivateAddress(item.address))) {
        throw new Error('Private network destinations are blocked');
    }

    return destination;
}
