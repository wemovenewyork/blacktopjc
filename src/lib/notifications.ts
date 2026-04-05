import { supabase } from './supabase';

export async function registerForPushNotifications(): Promise<string | null> {
  if (typeof window !== 'undefined') return null; // web — not supported
  try {
    const Notifications = require('expo-notifications');
    const Device = require('expo-device');
    if (!Device.isDevice) return null;
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.from('users').update({ expo_push_token: token }).eq('auth_id', session.user.id);
    }
    return token;
  } catch {
    return null;
  }
}

export async function scheduleLocalNotification(
  title: string,
  body: string,
  trigger: unknown
): Promise<void> {
  if (typeof window !== 'undefined') return;
  try {
    const Notifications = require('expo-notifications');
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger,
    });
  } catch {}
}
