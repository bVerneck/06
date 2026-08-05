import { useCallback, useEffect, useRef, useState } from "react";
import type { Task } from "@/lib/taskData";

export type NotifPermission = "default" | "granted" | "denied" | "unsupported";
export type NotificationSound = "system" | "app";

const VIBRATE_PATTERN = [500, 250, 500];

type NotifOpts = NotificationOptions & { vibrate?: number[] };

// --- Shared alarm audio engine (Web Audio API) ---
// Structured so it can be swapped for @capacitor/local-notifications later.

let audioCtx: AudioContext | null = null;
let alarmLoopTimer: number | null = null;
let alarmStopTimer: number | null = null;
let alarmOscNodes: { osc: OscillatorNode; gain: GainNode }[] = [];
let alarmRinging = false;
const ringingListeners = new Set<(v: boolean) => void>();

function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      audioCtx = new Ctor();
    }
    if (audioCtx.state === "suspended") void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

function setRinging(v: boolean) {
  alarmRinging = v;
  ringingListeners.forEach((l) => l(v));
}

/** Starts the continuous alarm loop. Returns a stop function. */
function startAlarmLoop(): () => void {
  stopAlarmLoop();
  const ctx = getAudioCtx();
  if (!ctx) return () => {};

  const tick = () => {
    const now = ctx.currentTime;
    const tones = [880, 660, 880];
    tones.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.28;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  };

  tick();
  alarmLoopTimer = window.setInterval(tick, 900);
  setRinging(true);
  if ("vibrate" in navigator) navigator.vibrate(VIBRATE_PATTERN);

  return stopAlarmLoop;
}

function stopAlarmLoop() {
  if (alarmLoopTimer !== null) {
    window.clearInterval(alarmLoopTimer);
    alarmLoopTimer = null;
  }
  if (alarmStopTimer !== null) {
    window.clearTimeout(alarmStopTimer);
    alarmStopTimer = null;
  }
  alarmOscNodes.forEach(({ osc, gain }) => {
    try {
      osc.stop();
      gain.disconnect();
    } catch {
      /* already stopped */
    }
  });
  alarmOscNodes = [];
  setRinging(false);
}

/** Plays a single short tone (notification mode). */
function playAlarmSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const tones = [880, 660, 880];
  tones.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const start = now + i * 0.28;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.3, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.25);
  });
}

let currentSoundMode: NotificationSound = "app";

/** Updates the global sound preference used by triggerAlarm. */
export function setNotificationSound(mode: NotificationSound) {
  currentSoundMode = mode;
}

/** Builds a silent audio trigger so the OS notification sound is heard on mobile. */
function nudgeAudio() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 1;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.001, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.03);
}

/**
 * Fires an alarm for a task. In "alarm" mode, starts a continuous loop
 * (manual = until stopped, timed = auto-stops after N seconds).
 * In "notification" mode, plays a short tone + system notification.
 * When sound mode is "system", relies on the OS native notification sound
 * instead of the in-app oscillator.
 */
export function triggerAlarm(task: Task, listName?: string) {
  const alertType = task.alertType ?? "notification";
  const body = task.notes || listName || "";
  const useSystemSound = currentSoundMode === "system";

  if (alertType === "alarm") {
    if (useSystemSound) {
      nudgeAudio();
    } else {
      startAlarmLoop();
    }
    if (task.alarmDurationType === "timed" && task.alarmDurationSeconds) {
      alarmStopTimer = window.setTimeout(
        stopAlarmLoop,
        task.alarmDurationSeconds * 1000,
      );
    }
    void showSystemNotification(task.title, {
      body,
      tag: "alarm-" + task.id,
      vibrate: VIBRATE_PATTERN,
      requireInteraction: true,
      renotify: true,
      silent: useSystemSound ? false : true,
      actions: [{ action: "stop", title: "Desligar Alarme" }],
    } as NotifOpts);
  } else {
    if (useSystemSound) {
      nudgeAudio();
    } else {
      playAlarmSound();
    }
    if ("vibrate" in navigator) navigator.vibrate(VIBRATE_PATTERN);
    void showSystemNotification(task.title, {
      body,
      tag: task.id,
      vibrate: VIBRATE_PATTERN,
      requireInteraction: true,
      renotify: true,
      silent: useSystemSound ? false : true,
    } as NotifOpts);
  }
}

/** Stops any currently ringing alarm. */
export function stopAlarm() {
  stopAlarmLoop();
}

/** Subscribes to alarm ringing state. Returns unsubscribe. */
export function onAlarmRinging(cb: (ringing: boolean) => void): () => void {
  ringingListeners.add(cb);
  cb(alarmRinging);
  return () => {
    ringingListeners.delete(cb);
  };
}

export async function showSystemNotification(
  title: string,
  options: NotifOpts,
) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const opts: NotifOpts = {
    icon: "./icons/icon-192.png",
    badge: "./icons/icon-192.png",
    vibrate: VIBRATE_PATTERN,
    ...options,
  };

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, opts);
      return;
    }
  } catch {
    /* fallback below */
  }

  try {
    new Notification(title, opts);
  } catch {
    /* ignore */
  }
}

const FIRED_KEY = "taskflow-fired-alarms";

function loadFired(): Set<string> {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(FIRED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

type SWTask = {
  id: string;
  title: string;
  notes?: string;
  listName?: string;
  dueDate: string;
  completed: boolean;
  alertType?: string;
  alarmDurationType?: string;
  alarmDurationSeconds?: number;
};

function scheduleViaSW(tasks: SWTask[]) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator))
    return;
  navigator.serviceWorker.ready
    .then((reg) =>
      reg.active
        ? reg.active.postMessage({ type: "SCHEDULE_ALARMS", tasks })
        : null,
    )
    .catch(() => {});
}

export function useTaskAlarms(
  tasks: Task[],
  listNameById?: Record<string, string>,
  soundMode: NotificationSound = "app",
) {
  useEffect(() => {
    setNotificationSound(soundMode);
  }, [soundMode]);
  const [permission, setPermission] = useState<NotifPermission>(() =>
    typeof window === "undefined" || !("Notification" in window)
      ? "unsupported"
      : (Notification.permission as NotifPermission),
  );
  const [ringing, setRinging] = useState(false);
  const firedRef = useRef<Set<string>>(loadFired());
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  const stopActiveAlarm = useCallback(() => stopAlarm(), []);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return "unsupported" as const;
    const result = (await Notification.requestPermission()) as NotifPermission;
    setPermission(result);
    if (result === "granted") {
      await showSystemNotification("TaskFlow", {
        body: "Alarmes ativados! Você será avisado no horário das tarefas.",
        tag: "taskflow-alarms-enabled",
      });
      scheduleViaSW(
        tasksRef.current.map((t) => ({
          id: t.id,
          title: t.title,
          notes: t.notes,
          listName: t.listId ? listNameById?.[t.listId] : undefined,
          dueDate: t.dueDate,
          completed: t.completed,
          alertType: t.alertType,
          alarmDurationType: t.alarmDurationType,
          alarmDurationSeconds: t.alarmDurationSeconds,
        })),
      );
    }
    return result;
  }, [listNameById]);

  useEffect(() => {
    scheduleViaSW(
      tasks.map((t) => ({
        id: t.id,
        title: t.title,
        notes: t.notes,
        listName: t.listId ? listNameById?.[t.listId] : undefined,
        dueDate: t.dueDate,
        completed: t.completed,
        alertType: t.alertType,
        alarmDurationType: t.alarmDurationType,
        alarmDurationSeconds: t.alarmDurationSeconds,
      })),
    );
  }, [tasks, listNameById]);

  useEffect(() => {
    const unsub = onAlarmRinging(setRinging);
    return unsub;
  }, []);

  useEffect(() => {
    const check = () => {
      const now = Date.now();
      let changed = false;
      tasksRef.current.forEach((t) => {
        if (t.completed || !t.dueDate) return;
        const due = new Date(t.dueDate).getTime();
        const key = `${t.id}:${t.dueDate}`;
        if (
          due <= now &&
          now - due < 5 * 60 * 1000 &&
          !firedRef.current.has(key)
        ) {
          firedRef.current.add(key);
          changed = true;
          const listName = t.listId ? listNameById?.[t.listId] : undefined;
          triggerAlarm(t, listName);
        }
      });
      if (changed) {
        localStorage.setItem(
          FIRED_KEY,
          JSON.stringify([...firedRef.current].slice(-200)),
        );
      }
    };

    check();
    const id = window.setInterval(check, 15000);
    const onPerm = () => {
      if ("Notification" in window)
        setPermission(Notification.permission as NotifPermission);
    };
    if ("permissions" in navigator) {
      navigator.permissions
        .query({ name: "notifications" as PermissionName })
        .then((p) => {
          p.addEventListener("change", onPerm);
        });
    }
    return () => {
      window.clearInterval(id);
    };
  }, [listNameById]);

  return { permission, requestPermission, ringing, stopActiveAlarm };
}
