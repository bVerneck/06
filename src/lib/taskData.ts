export type ListColor = "indigo" | "emerald" | "amber" | "rose" | "sky" | "violet" | "slate";

export type Recurrence = "none" | "hourly" | "daily" | "weekly" | "monthly" | "custom";

export type AlertType = "notification" | "alarm";
export type AlarmDurationType = "manual" | "timed";

export interface Attachment {
  id: string;
  name: string;
  type: "image" | "link" | "file";
  size?: string;
  url?: string;
}

export interface TaskList {
  id: string;
  name: string;
  color: ListColor;
}

export interface Task {
  id: string;
  title: string;
  notes?: string;
  listId: string;
  dueDate?: string; // ISO
  completed: boolean;
  important: boolean;
  recurrence: Recurrence;
  customRecurrence?: string;
  recurrenceInterval?: number;
  recurrenceWeekdays?: number[];
  attachments: Attachment[];
  tags: string[];
  createdAt: string;
  alertType?: AlertType;
  alarmDurationType?: AlarmDurationType;
  alarmDurationSeconds?: number;
}

export const COLOR_MAP: Record<ListColor, { bg: string; ring: string; soft: string; text: string; dot: string }> = {
  indigo:  { bg: "bg-indigo-500",  ring: "ring-indigo-500",  soft: "bg-indigo-50 text-indigo-700",  text: "text-indigo-600",  dot: "bg-indigo-500" },
  emerald: { bg: "bg-emerald-500", ring: "ring-emerald-500", soft: "bg-emerald-50 text-emerald-700", text: "text-emerald-600", dot: "bg-emerald-500" },
  amber:   { bg: "bg-amber-500",   ring: "ring-amber-500",   soft: "bg-amber-50 text-amber-700",    text: "text-amber-600",   dot: "bg-amber-500" },
  rose:    { bg: "bg-rose-500",    ring: "ring-rose-500",    soft: "bg-rose-50 text-rose-700",      text: "text-rose-600",    dot: "bg-rose-500" },
  sky:     { bg: "bg-sky-500",     ring: "ring-sky-500",     soft: "bg-sky-50 text-sky-700",        text: "text-sky-600",     dot: "bg-sky-500" },
  violet:  { bg: "bg-violet-500",  ring: "ring-violet-500",  soft: "bg-violet-50 text-violet-700",  text: "text-violet-600",  dot: "bg-violet-500" },
  slate:   { bg: "bg-slate-500",   ring: "ring-slate-500",   soft: "bg-slate-100 text-slate-700",   text: "text-slate-600",   dot: "bg-slate-500" },
};

export const ALL_COLORS: ListColor[] = ["indigo", "emerald", "amber", "rose", "sky", "violet", "slate"];

/**
 * Computes the next due date for a recurring task based on its recurrence
 * rule. Returns undefined if no next occurrence can be determined.
 *
 * - hourly:  adds `interval` hours
 * - daily:   adds `interval` days
 * - weekly:  adds `interval` weeks; if weekdays are specified, jumps to the
 *            next selected weekday (0=Sun…6=Sat) after advancing
 * - monthly: adds `interval` months
 * - custom:  adds `interval` days as a generic period fallback
 */
export function computeNextOccurrence(task: Task): string | undefined {
  if (!task.dueDate || task.recurrence === "none") return undefined;
  const base = new Date(task.dueDate);
  const interval = Math.max(1, task.recurrenceInterval ?? 1);

  const next = new Date(base);

  switch (task.recurrence) {
    case "hourly":
      next.setHours(next.getHours() + interval);
      break;
    case "daily":
      next.setDate(next.getDate() + interval);
      break;
    case "weekly": {
      next.setDate(next.getDate() + interval * 7);
      const days = task.recurrenceWeekdays;
      if (days && days.length > 0) {
        // Advance to the nearest selected weekday at/after `next`.
        const selected = new Set(days);
        for (let i = 0; i < 7; i++) {
          const candidate = new Date(next);
          candidate.setDate(candidate.getDate() + i);
          if (selected.has(candidate.getDay())) {
            candidate.setHours(base.getHours(), base.getMinutes(), 0, 0);
            return candidate.toISOString();
          }
        }
      }
      break;
    }
    case "monthly":
      next.setMonth(next.getMonth() + interval);
      break;
    case "custom": {
      next.setDate(next.getDate() + interval);
      const days = task.recurrenceWeekdays;
      if (days && days.length > 0) {
        const selected = new Set(days);
        for (let i = 0; i < 7; i++) {
          const candidate = new Date(next);
          candidate.setDate(candidate.getDate() + i);
          if (selected.has(candidate.getDay())) {
            candidate.setHours(base.getHours(), base.getMinutes(), 0, 0);
            return candidate.toISOString();
          }
        }
      }
      break;
    }
    default:
      return undefined;
  }

  return next.toISOString();
}

const today = new Date();
const iso = (daysOffset: number, hour = 9, minute = 0) => {
  const d = new Date(today);
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

export const INITIAL_LISTS: TaskList[] = [
  { id: "trabalho", name: "Trabalho", color: "indigo" },
  { id: "pessoal", name: "Pessoal", color: "emerald" },
  { id: "estudos", name: "Estudos", color: "amber" },
];

export const INITIAL_TASKS: Task[] = [
  {
    id: "t1",
    title: "Revisar proposta do cliente Acme",
    notes: "Conferir cláusulas 3 e 7. Validar valores com o financeiro antes de enviar.",
    listId: "trabalho",
    dueDate: iso(0, 14, 30),
    completed: false,
    important: true,
    recurrence: "none",
    attachments: [
      { id: "a1", name: "proposta-acme-v3.pdf", type: "file", size: "1.2 MB" },
      { id: "a2", name: "figma.com/acme-mock", type: "link", url: "https://figma.com" },
    ],
    tags: ["cliente", "urgente"],
    createdAt: iso(-2),
  },
  {
    id: "t2",
    title: "Reunião semanal de produto",
    notes: "Apresentar roadmap Q3 e métricas de retenção.",
    listId: "trabalho",
    dueDate: iso(1, 10, 0),
    completed: false,
    important: false,
    recurrence: "weekly",
    attachments: [],
    tags: ["reunião"],
    createdAt: iso(-7),
  },
  {
    id: "t3",
    title: "Comprar mantimentos da semana",
    notes: "Não esquecer café e frutas.",
    listId: "pessoal",
    dueDate: iso(0, 19, 0),
    completed: false,
    important: false,
    recurrence: "weekly",
    attachments: [],
    tags: ["casa"],
    createdAt: iso(-1),
  },
  {
    id: "t4",
    title: "Estudar capítulo 8 — Sistemas Distribuídos",
    notes: "Foco em consenso e Raft. Fazer exercícios 1 a 5.",
    listId: "estudos",
    dueDate: iso(2, 20, 0),
    completed: false,
    important: true,
    recurrence: "daily",
    attachments: [
      { id: "a3", name: "diagrama-raft.png", type: "image", size: "340 KB" },
    ],
    tags: ["faculdade"],
    createdAt: iso(-3),
  },
  {
    id: "t5",
    title: "Treino de corrida 5km",
    listId: "pessoal",
    dueDate: iso(0, 7, 0),
    completed: true,
    important: false,
    recurrence: "daily",
    attachments: [],
    tags: ["saúde"],
    createdAt: iso(-5),
  },
  {
    id: "t6",
    title: "Enviar relatório mensal de vendas",
    notes: "Anexar planilha consolidada e gráfico de funil.",
    listId: "trabalho",
    dueDate: iso(4, 17, 0),
    completed: false,
    important: true,
    recurrence: "none",
    attachments: [],
    tags: ["relatório"],
    createdAt: iso(-1),
  },
  {
    id: "t7",
    title: "Ler artigo: Deep Work — Cal Newport",
    listId: "estudos",
    dueDate: iso(3, 21, 0),
    completed: false,
    important: false,
    recurrence: "none",
    attachments: [
      { id: "a4", name: "calnewport.com/deep-work", type: "link", url: "https://calnewport.com" },
    ],
    tags: ["leitura"],
    createdAt: iso(-4),
  },
  {
    id: "t8",
    title: "Pagar fatura do cartão",
    listId: "pessoal",
    dueDate: iso(6, 12, 0),
    completed: false,
    important: true,
    recurrence: "custom",
    customRecurrence: "Todo dia 15 do mês",
    attachments: [],
    tags: ["finanças"],
    createdAt: iso(-10),
  },
  {
    id: "t9",
    title: "Check-in diário do time",
    listId: "trabalho",
    dueDate: iso(0, 9, 30),
    completed: true,
    important: false,
    recurrence: "daily",
    attachments: [],
    tags: ["rotina"],
    createdAt: iso(-30),
  },
  {
    id: "t10",
    title: "Backup automático do projeto",
    listId: "trabalho",
    dueDate: iso(0, 23, 0),
    completed: false,
    important: false,
    recurrence: "hourly",
    attachments: [],
    tags: ["devops"],
    createdAt: iso(-15),
  },
];
