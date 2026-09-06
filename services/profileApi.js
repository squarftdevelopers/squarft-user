import { BASE_URL } from './config';

export const profileApi = {
  getUserProfile: async (token) => {
    try {
      const response = await fetch(`${BASE_URL}/api/v1/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to load your profile');
      if (!data.data?.user) throw new Error('Profile data is unavailable');
      return data.data;
    } catch (error) {
      throw new Error(error.message === 'Network request failed' ? 'Unable to connect. Please try again.' : error.message);
    }
  },

  updateProfilePicture: async (token, picture) => {
    try {
      console.log('Updating profile picture...');

      const formData = new FormData();
      formData.append('profilePicture', {
        uri: picture.uri,
        name: picture.name || 'profile-picture.jpg',
        type: picture.type || 'image/jpeg',
      });

      const response = await fetch(`${BASE_URL}/api/v1/profile/me/profile-picture`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      console.log('Profile Picture API Response Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Profile Picture API Error:', errorText);

        let errorMessage = 'Failed to update profile picture';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (_e) { }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Profile picture updated successfully');

      return data.data;
    } catch (error) {
      console.error('Error updating profile picture:', error);
      throw error;
    }
  },

  updatePhoneNumber: async (token, verifiedToken, newPhone) => {
    try {
      console.log('📱 Updating phone number...');
      
      const response = await fetch(`${BASE_URL}/api/v1/profile/update-phone`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          verified_token: verifiedToken,
          new_phone: newPhone 
        }),
      });

      console.log('📡 Update Phone API Response Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ Update Phone API Error:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || 'Failed to update phone number');
        } catch (_e) {
          throw new Error('Failed to update phone number');
        }
      }

      const data = await response.json();
      console.log('✅ Phone number updated successfully');
      
      return data;
    } catch (error) {
      console.error('❌ Error updating phone number:', error);
      throw error;
    }
  },

  changePassword: async (token, currentPassword, newPassword) => {
    try {
      console.log('🔐 Changing password...');
      
      const response = await fetch(`${BASE_URL}/api/v1/profile/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          current_password: currentPassword,
          new_password: newPassword 
        }),
      });

      console.log('📡 Change Password API Response Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ Change Password API Error:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || 'Failed to change password');
        } catch (_e) {
          throw new Error('Failed to change password');
        }
      }

      const data = await response.json();
      console.log('✅ Password changed successfully');
      
      return data;
    } catch (error) {
      console.error('❌ Error changing password:', error);
      throw error;
    }
  },
};
