import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  {
    auth: {
      storage: AsyncStorage,      // where session is stored
      autoRefreshToken: true,     // refresh token automatically
      persistSession: true,       // keep user logged in
      detectSessionInUrl: false,  // required for React Native
    },
  }
)
