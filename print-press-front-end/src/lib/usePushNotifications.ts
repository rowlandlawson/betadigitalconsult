'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from './api';
import { getValidToken } from './auth';

/**
 * Custom hook for managing Web Push Notification subscriptions.
 * 
 * Usage:
 *   const { isSupported, isSubscribed, subscribe, unsubscribe } = usePushNotifications();
 * 
 * Call subscribe() to request notification permission and register push subscription.
 * Call unsubscribe() to remove it.
 */
export function usePushNotifications() {
    const [isSupported, setIsSupported] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [loading, setLoading] = useState(false);
    const hasChecked = useRef(false);

    // Check browser support and existing subscription on mount
    useEffect(() => {
        if (hasChecked.current) return;
        hasChecked.current = true;

        const checkSupport = async () => {
            // Check if push is supported
            const supported =
                typeof window !== 'undefined' &&
                'serviceWorker' in navigator &&
                'PushManager' in window &&
                'Notification' in window;

            setIsSupported(supported);

            if (!supported) {
                console.log('❌ Push notifications not supported in this browser');
                return;
            }

            // Check current permission
            setPermission(Notification.permission);

            // Check existing subscription
            try {
                const registration = await navigator.serviceWorker.ready;
                const existing = await registration.pushManager.getSubscription();
                setIsSubscribed(!!existing);
                if (existing) {
                    console.log('✅ Already subscribed to push notifications');
                }
            } catch (err) {
                console.error('Error checking push subscription:', err);
            }
        };

        checkSupport();
    }, []);

    /**
     * Convert a base64 VAPID key string to a Uint8Array for use with pushManager.subscribe
     */
    const urlBase64ToUint8Array = useCallback((base64String: string): Uint8Array => {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }, []);

    /**
     * Subscribe to push notifications.
     * Requests permission if not already granted, then creates subscription.
     */
    const subscribe = useCallback(async (): Promise<boolean> => {
        if (!isSupported) {
            console.error('Push notifications not supported');
            return false;
        }

        setLoading(true);

        try {
            // Step 1: Request notification permission
            const perm = await Notification.requestPermission();
            setPermission(perm);

            if (perm !== 'granted') {
                console.log('❌ Notification permission denied');
                setLoading(false);
                return false;
            }

            // Step 2: Get VAPID public key from backend
            const token = await getValidToken();
            const vapidResponse = await api.get('/push/vapid-public-key', {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const vapidPublicKey = vapidResponse.data.publicKey;

            if (!vapidPublicKey) {
                console.error('Failed to get VAPID public key');
                setLoading(false);
                return false;
            }

            // Step 3: Get service worker registration
            const registration = await navigator.serviceWorker.ready;

            // Step 4: Subscribe to push via PushManager
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
            });

            // Step 5: Send subscription to backend
            await api.post('/push/subscribe', { subscription: subscription.toJSON() }, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            setIsSubscribed(true);
            console.log('✅ Push notification subscription successful');
            setLoading(false);
            return true;
        } catch (error) {
            console.error('Push subscription error:', error);
            setLoading(false);
            return false;
        }
    }, [isSupported, urlBase64ToUint8Array]);

    /**
     * Unsubscribe from push notifications.
     */
    const unsubscribe = useCallback(async (): Promise<boolean> => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                // Remove from backend
                const token = await getValidToken();
                await api.delete('/push/unsubscribe', {
                    data: { endpoint: subscription.endpoint },
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });

                // Unsubscribe locally
                await subscription.unsubscribe();
            }

            setIsSubscribed(false);
            console.log('🗑️ Push notification unsubscribed');
            return true;
        } catch (error) {
            console.error('Push unsubscribe error:', error);
            return false;
        }
    }, []);

    return {
        isSupported,
        isSubscribed,
        permission,
        loading,
        subscribe,
        unsubscribe,
    };
}
