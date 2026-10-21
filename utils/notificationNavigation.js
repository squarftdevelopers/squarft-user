/**
 * Notification Deep Link Navigation Handler
 * Maps notification events to app routes
 */

import { router } from 'expo-router';
import { NOTIFICATION_EVENTS } from '../constants/notificationTypes';

/**
 * Parse deep link path and navigate
 * @param {string} deepLink - Deep link path (e.g., "/profile/security", "/properties/123")
 * @param {object} data - Additional notification data
 */
export const handleNotificationNavigation = (deepLink, data = {}) => {
  if (typeof deepLink !== 'string' || deepLink.includes('{{') || deepLink.startsWith('//')) {
    console.warn('[NotificationNavigation] No deep link provided');
    return;
  }

  console.log('[NotificationNavigation] Navigating:', { deepLink, data });

  try {
    // Handle relative paths
    if (deepLink.startsWith('/')) {
      // Map deep link paths to actual app routes
      const routeMap = {
        // Profile & Auth
        '/profile/security': '/(tabs)/settings',
        '/profile': '/(tabs)/settings',
        '/profile/preferences': '/(tabs)/settings',

        // Home
        '/home': '/(tabs)/home',
        '/id-verification': '/(screens)/id-verification',
        '/(screens)/id-verification': '/(screens)/id-verification',
        '/(screens)/notifications': '/(screens)/notifications',
        '/(tabs)/home': '/(tabs)/home',
        '/(tabs)/visit': '/(tabs)/visit',
        '/(tabs)/settings': '/(tabs)/settings',
        '/(tabs)/myDeals': '/(tabs)/myDeals',

        // Properties
        '/shortlist': '/(screens)/saved-properties',
        '/saved-properties': '/(screens)/saved-properties',
        '/recommendations': '/(tabs)/home',

        // Searches
        '/saved-searches': '/(screens)/recent-searches',

        // Support
        '/support': '/(tabs)/settings',
      };

      // Check for parameterized routes
      if (deepLink.startsWith('/properties/')) {
        const propertyId = deepLink.split('/')[2];
        router.push({
          pathname: '/(screens)/project-detail',
          params: { id: data.project_id || data.projectId || propertyId }
        });
        return;
      }

      if (deepLink.startsWith('/projects/')) {
        const projectId = deepLink.split('/')[2];
        router.push({
          pathname: '/(screens)/project-detail',
          params: { id: projectId }
        });
        return;
      }

      if (deepLink.startsWith('/visits/book/')) {
        router.push(data.project_id || data.projectId
          ? { pathname: '/(screens)/project-detail', params: { id: data.project_id || data.projectId } }
          : { pathname: '/(screens)/book-site-visit', params: { propertyId: deepLink.split('/')[3] } });
        return;
      }

      if (deepLink.startsWith('/visits/')) {
        const segments = deepLink.split('/');
        const visitId = segments[2];
        
        if (deepLink.includes('/feedback')) {
          router.push({
            pathname: '/(screens)/review',
            params: { visitId, tab: /completed|cancelled/i.test(data.eventKey || data.event || '') ? 'Past' : 'Upcoming' }
          });
          return;
        }

        if (deepLink.includes('/route')) {
          router.push({
            pathname: '/(tabs)/visit',
            params: { visitId, tab: 'Upcoming', ...data }
          });
          return;
        }

        router.push({
          pathname: '/(tabs)/visit',
          params: { visitId, tab: /completed|cancelled/i.test(data.eventKey || data.event || '') ? 'Past' : 'Upcoming' }
        });
        return;
      }

      if (deepLink.startsWith('/deals/')) {
        const segments = deepLink.split('/');
        const dealId = segments[2];
        
        // Open the existing deal workspace and its relevant section.
        router.push({
          pathname: '/(tabs)/myDeals/[id]',
          params: { id: dealId, tab: deepLink.includes('/payments') ? 'Payment Schedule' : /documents|agreement|quotation/.test(deepLink) ? 'Documents' : 'Timeline' }
        });
        return;
      }

      if (deepLink.startsWith('/support/')) {
        const ticketId = deepLink.split('/')[2];
        // Navigate to settings (support section)
        router.push({
          pathname: '/(tabs)/settings',
          params: { ticketId, ...data }
        });
        return;
      }

      if (deepLink.startsWith('/saved-searches/')) {
        const searchId = deepLink.split('/')[2];
        router.push({
          pathname: '/(screens)/recent-searches',
          params: { searchId, ...data }
        });
        return;
      }

      // Use route map for direct paths
      const mappedRoute = routeMap[deepLink];
      if (mappedRoute) {
        router.push(mappedRoute);
        return;
      }

      // Try to navigate directly if route exists
      router.push('/(screens)/notifications');
    } else {
      console.warn('[NotificationNavigation] Invalid deep link format:', deepLink);
    }
  } catch (error) {
    console.error('[NotificationNavigation] Navigation failed:', error);
  }
};

/**
 * Get navigation target for a notification event
 * @param {string} eventKey - Notification event key
 * @param {object} payload - Notification payload data
 * @returns {object} Navigation config with pathname and params
 */
export const getNavigationConfig = (eventKey, payload = {}) => {
  const {
    property_id = payload.propertyId,
    project_id = payload.projectId,
    visit_id = payload.visitId,
    deal_id = payload.dealId,
    search_id,
    ticket_id,
  } = payload;

  switch (eventKey) {
    // Auth & Profile
    case NOTIFICATION_EVENTS.AUTH_PHONE_UPDATED:
      return { pathname: '/(tabs)/settings' };

    case NOTIFICATION_EVENTS.USER_WELCOME:
      return { pathname: '/(tabs)/home' };

    case NOTIFICATION_EVENTS.USER_PROFILE_INCOMPLETE:
    case NOTIFICATION_EVENTS.USER_PROFILE_COMPLETED:
    case NOTIFICATION_EVENTS.USER_LOCATION_UPDATED:
      return { pathname: '/(tabs)/settings' };

    // Property
    case NOTIFICATION_EVENTS.PROPERTY_MATCH_FOUND:
    case NOTIFICATION_EVENTS.PROPERTY_PRICE_DROPPED:
    case NOTIFICATION_EVENTS.PROPERTY_AVAILABILITY_LOW:
      if (property_id || project_id) {
        return {
          pathname: '/(screens)/project-detail',
          params: { id: project_id || property_id }
        };
      }
      return { pathname: '/(tabs)/home' };

    case NOTIFICATION_EVENTS.PROPERTY_SAVED:
      return { pathname: '/(screens)/saved-properties' };

    case NOTIFICATION_EVENTS.PROPERTY_SOLD_OUT:
    case NOTIFICATION_EVENTS.SIMILAR_PROPERTY_RECOMMENDATION:
      return { pathname: '/(tabs)/home' };

    case NOTIFICATION_EVENTS.SAVED_SEARCH_ALERT:
      if (search_id) {
        return {
          pathname: '/(screens)/recent-searches',
          params: { searchId: search_id }
        };
      }
      return { pathname: '/(screens)/recent-searches' };

    // Visit
    case NOTIFICATION_EVENTS.VISIT_REQUEST_SUBMITTED:
    case NOTIFICATION_EVENTS.VISIT_CONFIRMED:
    case NOTIFICATION_EVENTS.VISIT_REMINDER_24H:
    case NOTIFICATION_EVENTS.VISIT_REMINDER_2H:
    case NOTIFICATION_EVENTS.VISIT_RESCHEDULED:
    case NOTIFICATION_EVENTS.VISIT_ROUTE_SHARED:
    case NOTIFICATION_EVENTS.VISIT_OTP_SENT:
    case NOTIFICATION_EVENTS.VISIT_CANCELLED:
      return {
        pathname: '/(tabs)/visit',
        params: { ...(visit_id ? { visitId: visit_id } : {}), tab: eventKey === 'VISIT_CANCELLED' ? 'Past' : 'Upcoming' }
      };

    case NOTIFICATION_EVENTS.VISIT_COMPLETED:
    case NOTIFICATION_EVENTS.VISIT_FEEDBACK_REQUEST:
      if (visit_id) {
        return {
          pathname: '/(screens)/review',
          params: { visitId: visit_id }
        };
      }
      return { pathname: '/(tabs)/visit' };

    case NOTIFICATION_EVENTS.INCOMPLETE_VISIT_BOOKING:
      if (property_id || project_id) {
        return {
          pathname: '/(screens)/book-site-visit',
          params: { propertyId: property_id || project_id }
        };
      }
      return { pathname: '/(tabs)/visit' };

    // Deal
    case NOTIFICATION_EVENTS.DEAL_INTEREST_RECORDED:
    case NOTIFICATION_EVENTS.DEAL_CREATED:
    case NOTIFICATION_EVENTS.QUOTATION_SHARED:
    case NOTIFICATION_EVENTS.OFFER_SUBMITTED:
    case NOTIFICATION_EVENTS.UNIT_ON_HOLD:
    case NOTIFICATION_EVENTS.BOOKING_INITIATED:
    case NOTIFICATION_EVENTS.BOOKING_CONFIRMED:
    case NOTIFICATION_EVENTS.DEAL_STAGE_UPDATED:
    case NOTIFICATION_EVENTS.DEAL_CLOSED_SUCCESSFULLY:
    case NOTIFICATION_EVENTS.TOKEN_PAYMENT_DUE:
    case NOTIFICATION_EVENTS.TOKEN_PAYMENT_RECEIVED:
    case NOTIFICATION_EVENTS.MILESTONE_CREATED:
    case NOTIFICATION_EVENTS.MILESTONE_DUE_TODAY:
    case NOTIFICATION_EVENTS.MILESTONE_PAID:
    case NOTIFICATION_EVENTS.DOCUMENT_REQUIRED:
    case NOTIFICATION_EVENTS.DOCUMENT_UPLOAD_SUCCESS:
    case NOTIFICATION_EVENTS.DOCUMENT_APPROVED:
    case NOTIFICATION_EVENTS.AGREEMENT_READY:
      return {
        pathname: deal_id ? '/(tabs)/myDeals/[id]' : '/(tabs)/myDeals',
        params: deal_id ? { id: deal_id, tab: /PAYMENT|MILESTONE/.test(eventKey) ? 'Payment Schedule' : /DOCUMENT|AGREEMENT|QUOTATION/.test(eventKey) ? 'Documents' : 'Timeline' } : {}
      };

    // Support
    case NOTIFICATION_EVENTS.SUPPORT_TICKET_CREATED:
      return {
        pathname: '/(tabs)/settings',
        params: ticket_id ? { ticketId: ticket_id } : {}
      };

    // Marketing
    case NOTIFICATION_EVENTS.NEW_PROJECT_LAUNCHED:
      if (project_id) {
        return {
          pathname: '/(screens)/project-detail',
          params: { id: project_id }
        };
      }
      return { pathname: '/(tabs)/home' };

    case NOTIFICATION_EVENTS.PRICE_DROP_CAMPAIGN:
      return { pathname: '/(tabs)/home' };

    default:
      console.warn('[NotificationNavigation] Unknown event key:', eventKey);
      return { pathname: '/(tabs)/home' };
  }
};

/**
 * Navigate based on notification
 * @param {object} notification - Notification object with eventKey and data
 */
export const navigateToNotification = (notification) => {
  if (!notification) return;

  const data = notification.data || notification.metadata || notification;
  const eventKey = notification.eventKey || data.eventKey || data.event_key || data.event;
  const deepLink = notification.deepLink || data.deepLink || data.route;

  // Prefer deep link if provided
  if (deepLink) {
    handleNotificationNavigation(deepLink, data);
    return;
  }

  // Fall back to event key mapping
  if (eventKey) {
    const config = getNavigationConfig(eventKey, data);
    if (config.params) {
      router.push({ pathname: config.pathname, params: config.params });
    } else {
      router.push(config.pathname);
    }
  }
};
