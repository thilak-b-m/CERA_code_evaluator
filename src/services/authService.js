import { api } from './api.js';

export const authService = {
  signIn({ email, password }, remember = true) {
    return api.request('/api/auth/login', {
      method: 'POST',
      body: { email, password, remember },
    });
  },

  updateProfile(profile, token) {
    return api.request('/api/auth/me', {
      method: 'PATCH',
      token,
      body: profile,
    });
  },

  getThemePreference(token) {
    return api.request('/api/auth/preferences/theme', { token });
  },

  updateThemePreference(theme, token) {
    return api.request('/api/auth/preferences/theme', {
      method: 'PUT',
      token,
      body: { theme },
    });
  },

  signOut: async () => true,
};
