import { LocalNotifications } from "@capacitor/local-notifications";

export type NotificationPermissionState = "prompt" | "granted" | "denied";

const CHANNEL_ID = "taskflow-alarms";

let initialized = false;

/**
 * Initializes the local notifications service. Safe to call multiple times.
 * On Android it creates the required notification channel.
 */
export async function initNotifications(): Promise<void> {
  if (initialized) return;
  initialized = true;
  try {
    await createChannel();
  } catch {
    /* web or unsupported context */
  }
}

/**
 * Creates the mandatory Android notification channel for alarms and reminders.
 * Idempotent: recreating an existing channel is a no-op.
 */
export async function createChannel(): Promise<void> {
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: "Alarmes e Lembretes",
      description: "Notificações e alarmes das tarefas do TaskFlow",
      importance: 5,
      visibility: 1,
      vibration: true,
      sound: undefined,
    });
  } catch {
    /* not running on native platform */
  }
}

/**
 * Checks the current notification permission state.
 */
export async function checkPermissions(): Promise<NotificationPermissionState> {
  try {
    const { display } = await LocalNotifications.checkPermissions();
    return display as NotificationPermissionState;
  } catch {
    return "granted";
  }
}

/**
 * Requests notification permission from the user.
 * Returns the resulting permission state.
 */
export async function requestPermissions(): Promise<NotificationPermissionState> {
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display as NotificationPermissionState;
  } catch {
    return "granted";
  }
}

/**
 * Ensures permission is granted, requesting it if currently in the prompt state.
 */
export async function ensurePermission(): Promise<NotificationPermissionState> {
  const current = await checkPermissions();
  if (current === "prompt") {
    return requestPermissions();
  }
  return current;
}

export interface ScheduleOptions {
  id: number;
  title: string;
  body?: string;
  /** ISO date string or Date instance for the fire time. */
  at: string | Date;
  smallIcon?: string;
  largeIcon?: string;
  channelId?: string;
  sound?: string;
  extra?: Record<string, unknown>;
}

/**
 * Schedules a single local notification at the given date/time.
 * Returns true when the notification was scheduled successfully.
 */
export async function scheduleNotification(opts: ScheduleOptions): Promise<boolean> {
  try {
    const at = opts.at instanceof Date ? opts.at : new Date(opts.at);
    if (Number.isNaN(at.getTime())) return false;

    await LocalNotifications.schedule({
      notifications: [
        {
          id: opts.id,
          title: opts.title,
          body: opts.body ?? "",
          schedule: { at },
          smallIcon: opts.smallIcon,
          largeIcon: opts.largeIcon,
          channelId: opts.channelId ?? CHANNEL_ID,
          sound: opts.sound,
          extra: opts.extra,
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Schedules multiple local notifications at once.
 */
export async function scheduleNotifications(
  notifications: ScheduleOptions[],
): Promise<boolean> {
  try {
    await LocalNotifications.schedule({
      notifications: notifications.map((opts) => {
        const at = opts.at instanceof Date ? opts.at : new Date(opts.at);
        return {
          id: opts.id,
          title: opts.title,
          body: opts.body ?? "",
          schedule: { at },
          smallIcon: opts.smallIcon,
          largeIcon: opts.largeIcon,
          channelId: opts.channelId ?? CHANNEL_ID,
          sound: opts.sound,
          extra: opts.extra,
        };
      }),
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Cancels a single pending notification by id.
 */
export async function cancelNotification(id: number): Promise<void> {
  try {
    await LocalNotifications.cancel({ notifications: [{ id }] });
  } catch {
    /* ignore */
  }
}

/**
 * Cancels multiple pending notifications by id.
 */
export async function cancelNotifications(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    await LocalNotifications.cancel({
      notifications: ids.map((id) => ({ id })),
    });
  } catch {
    /* ignore */
  }
}

/**
 * Cancels all pending notifications.
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id })),
      });
    }
  } catch {
    /* ignore */
  }
}

/**
 * Lists all currently pending notifications.
 */
export async function getPendingNotifications() {
  try {
    const { notifications } = await LocalNotifications.getPending();
    return notifications;
  } catch {
    return [];
  }
}
