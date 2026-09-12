import { BASE_URL } from './config';
import { loadAuthSession } from '../utils/authStorage';

const getApiBaseUrl = () => {
  const url = BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001';
  return url.replace(/\/+$/, '');
};

export const supportApi = {
  createTicket: async ({
    category,
    subject,
    message,
    referenceId,
    priority = 'normal',
    customerName,
    customerPhone,
  }) => {
    try {
      const session = await loadAuthSession().catch(() => null);
      const token = session?.token;
      const user = session?.user;

      const finalCustomerName =
        customerName ||
        (user
          ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.name
          : null);
      const finalCustomerPhone = customerPhone || user?.phone || null;

      const headers = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${getApiBaseUrl()}/api/support/tickets`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          appKey: 'squarft-user',
          category,
          subject,
          message,
          referenceId: referenceId ? String(referenceId).trim() : undefined,
          priority,
          customerName: finalCustomerName || undefined,
          customerPhone: finalCustomerPhone || undefined,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg =
          data?.message ||
          (data?.errors && data.errors.map((e) => e.message).join(', ')) ||
          'Failed to submit support ticket';
        throw new Error(errorMsg);
      }

      return data;
    } catch (error) {
      if (error.message === 'Network request failed') {
        throw new Error(
          'Cannot connect to server. Please check your network connection and try again.'
        );
      }
      throw error;
    }
  },
};
