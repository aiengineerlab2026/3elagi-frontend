/**
 * reminders/repository.ts
 *
 * Wraps expo-notifications scheduling/cancellation.
 * IMPORTANT: expo-notifications must be installed before this module is used.
 *   Install command: npx expo install expo-notifications
 *
 * This file is the only place in the codebase that imports expo-notifications.
 */
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import type { MedicationReminder } from './types'

const ANDROID_CHANNEL_ID = '3elagi-prescription-reminders'

function remindersSupported(): boolean {
  if (Platform.OS === 'web') return false
  return Platform.OS === 'ios' || Platform.OS === 'android'
}

/** One-time setup: Android channel for prescription reminders. */
export async function initRemindersChannel(): Promise<void> {
  if (!remindersSupported()) return

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Prescription Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  })
}

/** Request notification permissions. Returns true if granted. */
export async function requestRemindersPermission(): Promise<boolean> {
  if (!remindersSupported()) return false

  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

interface ScheduleInput {
  prescriptionId: string
  ownerId: string
  medicationName: string
  dose: string
  intervalHours: number
}

/**
 * Schedule a repeating local notification for one medication.
 * Returns the notification identifier assigned by expo-notifications.
 */
export async function scheduleMedicationReminder(
  input: ScheduleInput,
): Promise<string> {
  if (!remindersSupported()) return ''

  const { prescriptionId, medicationName, dose, intervalHours } = input
  const intervalSeconds = intervalHours * 60 * 60

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `💊 ${medicationName}`,
      body: dose ? `Time to take your dose: ${dose}` : 'Time to take your medication.',
      data: { prescriptionId },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: intervalSeconds,
      repeats: true,
      channelId: ANDROID_CHANNEL_ID,
    },
  })

  return notificationId
}

/** Cancel all scheduled notifications for a given prescription. */
export async function cancelPrescriptionReminders(
  reminders: MedicationReminder[],
): Promise<void> {
  if (!remindersSupported() || reminders.length === 0) return

  await Promise.all(
    reminders.map((r) => Notifications.cancelScheduledNotificationAsync(r.notificationId)),
  )
}

/** Cancel every scheduled notification (used on logout). */
export async function cancelAllReminders(): Promise<void> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return

  try {
    await Notifications.cancelAllScheduledNotificationsAsync()
  } catch {
    // expo-notifications scheduling APIs are not available on web.
  }
}
