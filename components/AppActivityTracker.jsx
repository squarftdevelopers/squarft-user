import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useGlobalSearchParams, usePathname } from 'expo-router';
import { useSelector } from 'react-redux';
import { postAppActivity } from '../services/appActivityApi';

export default function AppActivityTracker() {
  const token = useSelector(state => state.auth.token);
  const pathname = usePathname();
  const { id } = useGlobalSearchParams();
  const route = useRef({});
  const queue = useRef(Promise.resolve());
  const isProjectDetail = pathname === '/project-detail' || pathname === '/(screens)/project-detail';
  const projectId = isProjectDetail && typeof id === 'string' ? id : undefined;
  route.current = { screen: pathname, ...(projectId ? { projectId } : {}) };

  useEffect(() => {
    if (!token) return undefined;
    let state = AppState.currentState;
    const send = endpoint => {
      queue.current = queue.current.then(() => postAppActivity(token, endpoint));
    };
    if (state === 'active') send('heartbeat');
    const timer = setInterval(() => {
      if (state === 'active') send('heartbeat');
    }, 60000);
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active' && state !== 'active') {
        send('heartbeat');
        postAppActivity(token, 'screen-event', route.current);
      } else if (state === 'active' && next !== 'active') {
        send('session-end');
      }
      state = next;
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
      if (state === 'active') send('session-end');
    };
  }, [token]);

  useEffect(() => {
    if (!token || AppState.currentState !== 'active' || !pathname) return;
    postAppActivity(token, 'screen-event', { screen: pathname, ...(projectId ? { projectId } : {}) });
  }, [token, pathname, projectId]);

  return null;
}
