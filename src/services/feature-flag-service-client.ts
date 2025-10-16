
"use client";

// This client-side module manages the Split.io SDK for use in React components.
// It ensures the SDK is initialized only once in the browser.

import { SplitFactory } from '@splitsoftware/splitio-browserjs/esm';
import type { ISDK } from '@splitsoftware/splitio-browserjs/types/splitio';

let factory: ISDK | null = null;

// A simple pub/sub subject to notify subscribers of SDK updates.
type Subscriber = () => void;
class UpdateSubject {
    private subscribers = new Set<Subscriber>();

    subscribe(callback: Subscriber) {
        this.subscribers.add(callback);
    }
    unsubscribe(callback: Subscriber) {
        this.subscribers.delete(callback);
    }
    notify() {
        this.subscribers.forEach(cb => cb());
    }
}
export const subject = new UpdateSubject();


/**
 * Initializes the Split.io browser client.
 * This should be called once when the application loads on the client side.
 * @param authorizationKey The client-side SDK key for Split.io.
 * @param key The key to identify the user or tenant (e.g., user ID, tenant ID).
 */
export function initializeFeatureFlagClient(authorizationKey: string, key: string) {
    if (factory) {
        return; // Already initialized
    }

    if (!authorizationKey || !key) {
        console.warn('[Split.io Client] Authorization key or user key is missing. SDK not initialized.');
        return;
    }

    factory = SplitFactory({
        core: {
            authorizationKey,
            key,
        },
        // In development, it's useful to see debug logs.
        debug: process.env.NODE_ENV === 'development' ? 'DEBUG' : 'WARN',
    });

    const client = factory.client();

    client.on(client.Event.SDK_READY, () => {
        console.log('[Split.io Client] Browser SDK is ready.');
        subject.notify();
    });

    client.on(client.Event.SDK_UPDATE, () => {
        console.log('[Split.io Client] Browser SDK has updated feature flag definitions.');
        subject.notify();
    });
}

/**
 * Retrieves the Split.io client instance.
 * @returns The client instance or null if not initialized.
 */
export function getSplitClient() {
    return factory?.client() ?? null;
}
