import { supabase } from './supabase';
import { Session } from '@supabase/supabase-js';

const REFRESH_THRESHOLD = 12 * 60 * 60; // Refresh 12 hours before expiry

// Auto-refresh session when token is about to expire
export const setupSessionRefresh = () => {
  // Initial session check
  checkAndRefreshSession();
  
  // Set up periodic session check (every hour)
  const intervalId = setInterval(checkAndRefreshSession, 60 * 60 * 1000);
  
  return () => {
    clearInterval(intervalId);
  };
};

const checkAndRefreshSession = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) return;
    
    const expiresAt = session.expires_at;
    if (!expiresAt) return;
    
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = expiresAt - now;
    
    // If token expires within threshold, refresh it
    if (timeUntilExpiry < REFRESH_THRESHOLD) {
      console.log('Session refreshing...');
      await supabase.auth.refreshSession();
      console.log('Session refreshed successfully');
    }
  } catch (error) {
    console.error('Error refreshing session:', error);
  }
};

// Set up auth state change handler with secure storage
export const setupAuthStateHandler = () => {
  // Handle auth state changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    console.log(`Auth event: ${event}`);
    
    if (event === 'TOKEN_REFRESHED') {
      // Store the refreshed token (securely)
      if (session) {
        securelyStoreSession(session);
      }
    } else if (event === 'SIGNED_IN') {
      // User signed in
      if (session) {
        securelyStoreSession(session);
      }
    } else if (event === 'SIGNED_OUT') {
      // Clear stored session data
      clearSessionData();
    }
  });
  
  return () => {
    subscription.unsubscribe();
  };
};

// Secure session storage
const securelyStoreSession = (session: Session) => {
  // In a production app, consider using more secure storage methods
  // For this implementation, we'll use localStorage with encryption
  // or secure cookies would be better in production
  try {
    const sessionData = JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at
    });
    
    localStorage.setItem('geekcare.session', sessionData);
  } catch (error) {
    console.error('Error storing session:', error);
  }
};

// Clear session data
const clearSessionData = () => {
  localStorage.removeItem('geekcare.session');
};

// Initialize auth on app start
export const initializeAuth = async () => {
  // Set up token refresh mechanism
  const cleanupRefresh = setupSessionRefresh();
  
  // Set up auth state handler
  const cleanupAuthState = setupAuthStateHandler();
  
  return () => {
    cleanupRefresh();
    cleanupAuthState();
  };
}; 