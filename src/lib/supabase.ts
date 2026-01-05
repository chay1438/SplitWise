import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../constants/config';

// Fallback logic incase env vars are missing during dev
const EXPO_PUBLIC_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://freiaiasxgjjbaswyioctn.supabase.co';
const EXPO_PUBLIC_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyZWlhaWFzeGdqamJhc3d5aW9jdG4iLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNTgwMTEyOCwiZXhwIjoyMDUxMzc3MTI4fQ.ABC123_PLACEHOLDER_IF_MISSING'; // Note: Always use env vars in production

if (!EXPO_PUBLIC_SUPABASE_URL || !EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('Supabase URL or Key is missing. Check your .env file or app.config.js');
}

export const supabase = createClient(EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
