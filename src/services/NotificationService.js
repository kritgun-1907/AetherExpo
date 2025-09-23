// src/services/NotificationService.js
import * as Notifications from 'expo-notifications';

export const setupNotifications = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return false;
  
  await Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  
  return true;
};

export const scheduleReminder = async (title, body, hour = 20) => {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: {
      hour,
      minute: 0,
      repeats: true,
    },
  });
};