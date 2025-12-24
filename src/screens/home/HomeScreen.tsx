import { View, Text, TouchableOpacity } from 'react-native'
import { supabase } from '../../lib/supabase'

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 22, marginBottom: 20 }}>
        🎉 Logged in successfully
      </Text>

      <TouchableOpacity onPress={() => supabase.auth.signOut()}>
        <Text style={{ color: 'red' }}>Logout</Text>
      </TouchableOpacity>
    </View>
  )
}
