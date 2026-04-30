import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Plant } from '../types';
import { getNextWateringDate } from '../storage/plantStorage';

// Show notifications even when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('watering', {
      name: 'Watering Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleWateringReminder(plant: Plant): Promise<void> {
  // Always cancel any existing notification for this plant first
  await cancelWateringReminder(plant.id);

  const nextDate = getNextWateringDate(plant);

  // Schedule notification for 9 AM on the watering day
  const trigger = new Date(nextDate);
  trigger.setHours(9, 0, 0, 0);

  // Don't schedule if the time has already passed
  if (trigger <= new Date()) return;

  await Notifications.scheduleNotificationAsync({
    identifier: `plant_${plant.id}`,
    content: {
      title: `💧 Time to water ${plant.name}!`,
      body: `Your ${plant.type} is due for watering today.`,
      sound: 'default',
      ...(Platform.OS === 'android' && { channelId: 'watering' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: trigger,
    },
  });
}

export async function cancelWateringReminder(plantId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(`plant_${plantId}`);
  } catch {
    // Notification may not exist — safe to ignore
  }
}

export async function rescheduleAllReminders(plants: Plant[]): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const plant of plants) {
    await scheduleWateringReminder(plant);
  }
}
