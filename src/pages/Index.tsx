import { useEffect, useMemo, useState } from "react";
import { Search, Plus, Calendar, Star, Repeat, Inbox, CircleCheck as CheckCircle2, Circle, ListTodo, ArrowUpDown, Menu, BellRing } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/taskflow/Sidebar";
import { ThemeToggle } from "@/components/taskflow/ThemeToggle";
import { NotificationToggle } from "@/components/taskflow/NotificationToggle";
import { SettingsModal, type NotificationSound } from "@/components/taskflow/SettingsModal";
import { useTaskAlarms } from "@/hooks/useTaskAlarms";
import { TaskModal } from "@/components/taskflow/TaskModal";
import { TaskCard } from "@/components/taskflow/TaskCard";
import { EmptyState } from "@/components/taskflow/EmptyState";
import { toast } from "sonner";
import {
  INITIAL_LISTS, INITIAL_TASKS, type Task, type TaskList, type ListColor, COLOR_MAP, computeNextOccurrence,
} from "@/lib/taskData";

type View =
  | { kind: "list"; listId: string }
  | { kind: "filter"; filter: "today" | "next7" | "important" | "all" | "completed" }
  | { kind: "recurring" };

const LISTS_KEY = "taskflow-lists";
const TASKS_KEY = "taskflow-tasks";
const SOUND_KEY = "taskflow-notification-sound";

function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length >= 0 ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

const Index = () => {
  const [lists, setLists] = useState<TaskList[]>(() => loadStored(LISTS_KEY, INITIAL_LISTS));
  const [tasks, setTasks] = useState<Task[]>(() => loadStored(TASKS_KEY, INITIAL_TASKS));
  const [view, setView] = useState<View>({ kind: "filter", filter: "all" });
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"due" | "created" | "important">("due");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationSound, setNotificationSound] = useState<NotificationSound>(() =>
    (localStorage.getItem(SOUND_KEY) as NotificationSound) || "app",
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const listNameById = useMemo(() => Object.fromEntries(lists.map((l) => [l.id, l.name])), [lists]);
  const { permission: notifPermission, requestPermission: requestNotifPermission, ringing: alarmRinging, stopActiveAlarm } = useTaskAlarms(tasks, listNameById, notificationSound);

  useEffect(() => {
    localStorage.setItem(SOUND_KEY, notificationSound);
  }, [notificationSound]);

  // ---- Android back-button: close topmost modal/sheet instead of exiting ----
  useEffect(() => {
    const openOverlays: Array<{ open: boolean; close: () => void }> = [
      { open: alarmRinging, close: stopActiveAlarm },
      { open: modalOpen, close: () => { setModalOpen(false); setEditingTask(null); } },
      { open: settingsOpen, close: () => setSettingsOpen(false) },
      { open: mobileNavOpen, close: () => setMobileNavOpen(false) },
    ];
    const topmost = openOverlays.find((o) => o.open);
    if (!topmost) return;
    window.history.pushState({ overlay: true }, "");
    const onPopState = () => topmost.close();
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [alarmRinging, modalOpen, settingsOpen, mobileNavOpen, stopActiveAlarm]);

  // ---- Auto-prompt notification permission on first app open ----
  useEffect(() => {
    const PROMPTED_KEY = "taskflow-notif-prompted";
    if (localStorage.getItem(PROMPTED_KEY)) return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    localStorage.setItem(PROMPTED_KEY, "1");
    const timer = window.setTimeout(() => {
      Notification.requestPermission().catch(() => {});
    }, 2500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(LISTS_KEY, JSON.stringify(lists));
  }, [lists]);

  useEffect(() => {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }, [tasks]);

  // ---- View resolution ----
  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    const now = new Date();
    const startToday = new Date(now); startToday.setHours(0,0,0,0);
    const endToday = new Date(now); endToday.setHours(23,59,59,999);
    const end7 = new Date(now); end7.setDate(end7.getDate() + 7); end7.setHours(23,59,59,999);

    if (view.kind === "list") {
      result = result.filter(t => t.listId === view.listId);
    } else if (view.kind === "recurring") {
      result = result.filter(t => t.recurrence !== "none");
    } else if (view.kind === "filter") {
      if (view.filter === "today") {
        result = result.filter(t => t.dueDate && new Date(t.dueDate) >= startToday && new Date(t.dueDate) <= endToday);
      } else if (view.filter === "next7") {
        result = result.filter(t => t.dueDate && new Date(t.dueDate) >= startToday && new Date(t.dueDate) <= end7);
      } else if (view.filter === "important") {
        result = result.filter(t => t.important);
      } else if (view.filter === "completed") {
        result = result.filter(t => t.completed);
      }
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      if (sortBy === "important") {
        if (a.important !== b.important) return a.important ? -1 : 1;
      }
      if (sortBy === "due") {
        const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return ad - bd;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [tasks, view, search, sortBy]);

  const pendingTasks = filteredTasks.filter(t => !t.completed);
  const doneTasks = filteredTasks.filter(t => t.completed);

  // ---- Stats for header ----
  const stats = useMemo(() => {
    const now = new Date();
    const startToday = new Date(now); startToday.setHours(0,0,0,0);
    const endToday = new Date(now); endToday.setHours(23,59,59,999);
    return {
      total: tasks.length,
      today: tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) >= startToday && new Date(t.dueDate) <= endToday).length,
      important: tasks.filter(t => !t.completed && t.important).length,
      completed: tasks.filter(t => t.completed).length,
    };
  }, [tasks]);

  // ---- Title for current view ----
  const viewMeta = useMemo(() => {
    if (view.kind === "list") {
      const l = lists.find(x => x.id === view.listId);
      return { title: l?.name ?? "Lista", subtitle: "Tarefas desta lista", icon: ListTodo, color: l?.color as ListColor };
    }
    if (view.kind === "recurring") return { title: "Tarefas Recorrentes", subtitle: "Rotinas que se repetem automaticamente", icon: Repeat };
    const f = view.filter;
    if (f === "today") return { title: "Hoje", subtitle: "O que precisa acontecer hoje", icon: Calendar };
    if (f === "next7") return { title: "Próximos 7 dias", subtitle: "Sua semana em foco", icon: Calendar };
    if (f === "important") return { title: "Importantes", subtitle: "Tarefas marcadas como prioridade", icon: Star };
    if (f === "completed") return { title: "Concluídas", subtitle: "Tudo que você já entregou", icon: CheckCircle2 };
    return { title: "Todas as tarefas", subtitle: "Visão geral do seu fluxo", icon: Inbox };
  }, [view, lists]);

  // ---- Mutations ----
  const upsertTask = (task: Task) => {
    setTasks(prev => {
      const exists = prev.some(t => t.id === task.id);
      return exists ? prev.map(t => t.id === task.id ? task : t) : [task, ...prev];
    });
  };

  const handleSaveTask = (task: Task) => {
    const isNew = !tasks.some(t => t.id === task.id);
    upsertTask(task);
    setModalOpen(false);
    setEditingTask(null);
    toast.success(isNew ? "Tarefa criada" : "Tarefa atualizada", {
      description: task.title,
    });
  };

  const toggleComplete = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const willComplete = !t.completed;
      if (!willComplete) return { ...t, completed: false };
      // When completing a recurring task, generate the next occurrence.
      if (t.recurrence !== "none" && t.dueDate) {
        const nextDue = computeNextOccurrence(t);
        if (nextDue) {
          const nextTask: Task = {
            ...t,
            id: `task-${Date.now()}`,
            completed: false,
            dueDate: nextDue,
            createdAt: new Date().toISOString(),
          };
          // Insert the new occurrence alongside the completed original.
          setTimeout(() => setTasks(p => [nextTask, ...p]), 0);
        }
      }
      return { ...t, completed: true };
    }));
  };

  const toggleImportant = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, important: !t.important } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    toast("Tarefa removida");
  };

  const openCreate = () => {
    setEditingTask(null);
    setModalOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const addList = (name: string, color: ListColor) => {
    const id = `list-${Date.now()}`;
    setLists(prev => [...prev, { id, name, color }]);
    toast.success("Lista criada", { description: name });
  };

  const updateListColor = (id: string, color: ListColor) => {
    setLists(prev => prev.map(l => l.id === id ? { ...l, color } : l));
  };

  const renameList = (id: string, name: string) => {
    setLists(prev => prev.map(l => l.id === id ? { ...l, name } : l));
    toast.success("Lista renomeada", { description: name });
  };

  const deleteList = (id: string) => {
    const remaining = lists.filter(l => l.id !== id);
    if (remaining.length === 0) {
      toast.error("Mantenha ao menos uma lista");
      return;
    }
    const fallback = remaining[0].id;
    setTasks(prev => prev.map(t => t.listId === id ? { ...t, listId: fallback } : t));
    setLists(remaining);
    if (view.kind === "list" && view.listId === id) {
      setView({ kind: "filter", filter: "all" });
    }
    toast("Lista excluída");
  };


  const Icon = viewMeta.icon;
  const accentSoft = viewMeta.color ? COLOR_MAP[viewMeta.color].soft : "bg-accent text-accent-foreground";
  const accentText = viewMeta.color ? COLOR_MAP[viewMeta.color].text : "text-primary";

  return (
    <div className="flex min-h-screen bg-background font-sans text-foreground">
      <Sidebar
        lists={lists}
        tasks={tasks}
        view={view}
        onChangeView={setView}
        onAddList={addList}
        onUpdateListColor={updateListColor}
        onRenameList={renameList}
        onDeleteList={deleteList}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top bar — Google Keep style pill */}
        <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl">
          <div className="px-3 sm:px-6 lg:px-10 pt-3 sm:pt-4 pb-3">
            <div className="flex items-center gap-2 sm:gap-3 h-12 sm:h-14 px-2 sm:px-3 rounded-full bg-secondary/70 border border-border/60 shadow-sm">
              {/* Mobile menu */}
              <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9 rounded-full shrink-0 hover:bg-background/60" aria-label="Abrir menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72 max-w-[85vw] border-r-0 bg-sidebar [&>button]:text-white [&>button]:z-10">
                  <Sidebar
                    embedded
                    lists={lists}
                    tasks={tasks}
                    view={view}
                    onChangeView={(v) => { setView(v); setMobileNavOpen(false); }}
                    onAddList={addList}
                    onUpdateListColor={updateListColor}
                    onRenameList={renameList}
                    onDeleteList={deleteList}
                    onOpenSettings={() => { setSettingsOpen(true); setMobileNavOpen(false); }}
                  />
                </SheetContent>
              </Sheet>

              <Search className="h-4 w-4 text-muted-foreground shrink-0 ml-1 lg:ml-2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar tarefas"
                className="flex-1 min-w-0 h-full bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              />

              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full shrink-0 hover:bg-background/60 text-muted-foreground"
                onClick={() => setSortBy(s => s === "due" ? "created" : s === "created" ? "important" : "due")}
                aria-label="Ordenar"
                title={sortBy === "due" ? "Por data" : sortBy === "created" ? "Recentes" : "Importância"}
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>

              <NotificationToggle permission={notifPermission} onRequest={requestNotifPermission} />

              <ThemeToggle />

              <Avatar className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 ring-2 ring-background/60">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">B</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>


        <div className="px-3 sm:px-6 lg:px-10 pb-28 pt-2 flex-1 animate-fade-in max-w-3xl w-full mx-auto">
          {/* View header */}
          <div className="flex items-start justify-between gap-3 mb-4 px-1">
            <div className="flex items-center gap-3 min-w-0">
              <span className={`h-10 w-10 shrink-0 grid place-items-center rounded-xl ${accentSoft}`}>
                <Icon className={`h-5 w-5 ${accentText}`} />
              </span>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">{viewMeta.title}</h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{viewMeta.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs shrink-0 pt-1">
              <span className="px-2 py-1 rounded-md bg-secondary/70 text-muted-foreground">
                {stats.today} hoje
              </span>
              <span className="px-2 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                {stats.important} ★
              </span>
            </div>
          </div>


          {/* Tasks */}
          {filteredTasks.length === 0 ? (
            <EmptyState
              hasSearch={!!search}
              onCreate={openCreate}
              onClearSearch={() => setSearch("")}
            />
          ) : (
            <div className="space-y-6">
              {pendingTasks.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-2.5 px-1">
                    <Circle className="h-3 w-3 text-muted-foreground" />
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Pendentes · {pendingTasks.length}
                    </h2>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {pendingTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        list={lists.find(l => l.id === task.listId)}
                        onToggleComplete={() => toggleComplete(task.id)}
                        onToggleImportant={() => toggleImportant(task.id)}
                        onEdit={() => openEdit(task)}
                        onDelete={() => deleteTask(task.id)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {doneTasks.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-2.5 px-1">
                    <CheckCircle2 className="h-3 w-3 text-success" />
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Concluídas · {doneTasks.length}
                    </h2>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {doneTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        list={lists.find(l => l.id === task.listId)}
                        onToggleComplete={() => toggleComplete(task.id)}
                        onToggleImportant={() => toggleImportant(task.id)}
                        onEdit={() => openEdit(task)}
                        onDelete={() => deleteTask(task.id)}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        {/* Floating Action Button — Keep style */}
        <button
          onClick={openCreate}
          aria-label="Criar nova tarefa"
          className="fixed bottom-6 right-5 sm:bottom-8 sm:right-8 z-30 h-14 w-14 rounded-2xl bg-primary text-primary-foreground shadow-lg hover:shadow-glow hover:scale-105 active:scale-95 transition-all grid place-items-center"
        >
          <Plus className="h-6 w-6" />
        </button>
      </main>

      {/* Alarm ringing overlay */}
      {alarmRinging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col items-center gap-5 p-8 rounded-2xl bg-card border border-border shadow-xl max-w-sm w-[90%]">
            <div className="h-16 w-16 rounded-full bg-destructive/15 grid place-items-center animate-pulse">
              <BellRing className="h-8 w-8 text-destructive" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">Alarme tocando</p>
              <p className="text-sm text-muted-foreground">Toque para desligar o alarme</p>
            </div>
            <Button
              size="lg"
              variant="destructive"
              className="w-full rounded-xl"
              onClick={stopActiveAlarm}
            >
              Desligar Alarme
            </Button>
          </div>
        </div>
      )}

      <TaskModal
        open={modalOpen}
        onOpenChange={(o) => { setModalOpen(o); if (!o) setEditingTask(null); }}
        task={editingTask}
        lists={lists}
        onSave={handleSaveTask}
        onDelete={(id) => { deleteTask(id); setModalOpen(false); setEditingTask(null); }}
      />

      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        notificationSound={notificationSound}
        onChangeSound={setNotificationSound}
        notifPermission={notifPermission}
        onRequestNotifPermission={requestNotifPermission}
      />
    </div>
  );
};

export default Index;
