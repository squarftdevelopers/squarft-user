import { useEffect, useRef, useState } from 'react';
import { usePathname, useRootNavigationState } from 'expo-router';
import { useSelector } from 'react-redux';
import * as Notifications from 'expo-notifications';

// Keep taps pending until auth restoration and the index redirect finish.
// Both the listener and the initial response can report the same tap.
export function useNotificationResponse(onOpen) {
    const pathname = usePathname();
    const navigation = useRootNavigationState();
    const loggedIn = useSelector((state) => state.auth.isLoggedIn);
    const [pending, setPending] = useState(null);
    const lastHandled = useRef(null);
    const open = useRef(onOpen);
    open.current = onOpen;

    useEffect(() => {
        let active = true;
        const receive = (response) => {
            if (active && response) setPending(response);
        };
        const subscription = Notifications.addNotificationResponseReceivedListener(receive);
        Notifications.getLastNotificationResponseAsync().then(receive)
            .catch((error) => console.warn('Initial notification unavailable:', error.message));
        return () => { active = false; subscription.remove(); };
    }, []);

    useEffect(() => {
        // Waiting for an authenticated route also preserves branch/onboarding gates.
        if (!pending || !loggedIn || !navigation?.key || !pathname || pathname === '/') return;
        // Expo Router can wrap the app navigator in a synthetic __root stack.
        // Follow the active branch instead of assuming the first route is an app group.
        const activeNames = [];
        let state = navigation;
        while (state?.routes?.length) {
            const route = state.routes[state.index ?? 0];
            activeNames.push(route.name);
            state = route.state;
        }
        const onPrivateScreen = !activeNames.includes('(auth)') && activeNames.some((name) =>
            ['(tabs)', '(screens)', 'projects/[id]', 'projects/navigate', 'new-acquisition'].includes(name));
        if (!onPrivateScreen) return;
        const id = `${pending.notification.request.identifier}:${pending.actionIdentifier}`;
        if (lastHandled.current === id) return;
        try {
            open.current(pending);
            lastHandled.current = id;
            setPending(null);
            Notifications.clearLastNotificationResponseAsync().catch(() => {});
        } catch (error) {
            console.warn('Unable to open notification:', error.message);
        }
    }, [pending, loggedIn, navigation, pathname]);
}
