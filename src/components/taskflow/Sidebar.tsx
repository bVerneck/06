import { useState } from "react";
import { Calendar, Star, Repeat, Inbox, Plus, ChevronDown, ChevronRight, Settings, LogOut, CircleCheck as CheckCircle2, Sparkles, Layers, MoveHorizontal as MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { ALL_COLORS, COLOR_MAP, type ListColor, type Task, type TaskList } from "@/lib/taskData";

type View =
  | { kind: "list"; listId: string }
  | { kind: "filter"; filter: "today" | "next7" | "important" | "all" | "completed" }
  | { kind: "recurring" };

interface Props {
  lists: TaskList[];
  tasks: Task[];
  view: View;
  onChangeView: (v: View) => void;
  onAddList: (name: string, color: ListColor) => void;
  onUpdateListColor: (id: string, color: ListColor) => void;
  onRenameList: (id: string, name: string) => void;
  onDeleteList: (id: string) => void;
  onOpenSettings: () => void;
}

export function Sidebar({
  lists, tasks, view, onChangeView, onAddList, onUpdateListColor, onRenameList, onDeleteList,
  onOpenSettings, embedded = false,
}: Props & { embedded?: boolean }) {

  const [listsOpen, setListsOpen] = useState(true);
  const [newListName, setNewListName] = useState("");
  const [newListColor, setNewListColor] = useState<ListColor>("indigo");
  const [adding, setAdding] = useState(false);

  const isActive = (test: (v: View) => boolean) => test(view);

  const countByList = (id: string) => tasks.filter(t => t.listId === id && !t.completed).length;
  const countToday = tasks.filter(t => {
    if (t.completed || !t.dueDate) return false;
    const d = new Date(t.dueDate); const n = new Date();
    return d.toDateString() === n.toDateString();
  }).length;
  const count7 = tasks.filter(t => {
    if (t.completed || !t.dueDate) return false;
    const d = new Date(t.dueDate); const n = new Date(); const end = new Date(); end.setDate(end.getDate()+7);
    return d >= n && d <= end;
  }).length;
  const countImportant = tasks.filter(t => !t.completed && t.important).length;
  const countRecurring = tasks.filter(t => t.recurrence !== "none").length;

  const handleAddList = () => {
    if (!newListName.trim()) return;
    onAddList(newListName.trim(), newListColor);
    setNewListName("");
    setNewListColor("indigo");
    setAdding(false);
  };

  return (
    <aside className={cn(
      "flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
      embedded
        ? "flex w-full h-full"
        : "hidden lg:flex w-72 shrink-0 h-screen sticky top-0"
    )}>

      {/* Brand */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
            <Sparkles className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-white font-bold text-lg tracking-tight leading-none">TaskFlow</div>
            <div className="text-[11px] text-sidebar-muted mt-0.5">Mais que tarefas</div>
          </div>
        </div>
      </div>

      {/* Profile */}
      <div className="px-5 pb-4">
        <div className="rounded-xl bg-sidebar-border/40 border border-sidebar-border p-3 flex items-center gap-3">
          <Avatar className="h-9 w-9 ring-2 ring-sidebar-active/40">
            <AvatarFallback className="bg-gradient-primary text-white text-xs font-semibold">MA</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-white font-medium truncate">Marina Alves</div>
            <div className="text-[11px] text-sidebar-muted truncate">Conta local</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-6">
        {/* Quick filters */}
        <SectionLabel>Filtros rápidos</SectionLabel>
        <NavItem
          icon={<Inbox className="h-4 w-4" />}
          label="Todas as tarefas"
          count={tasks.filter(t => !t.completed).length}
          active={isActive(v => v.kind === "filter" && v.filter === "all")}
          onClick={() => onChangeView({ kind: "filter", filter: "all" })}
        />
        <NavItem
          icon={<Calendar className="h-4 w-4" />}
          label="Hoje"
          count={countToday}
          active={isActive(v => v.kind === "filter" && v.filter === "today")}
          onClick={() => onChangeView({ kind: "filter", filter: "today" })}
        />
        <NavItem
          icon={<Layers className="h-4 w-4" />}
          label="Próximos 7 dias"
          count={count7}
          active={isActive(v => v.kind === "filter" && v.filter === "next7")}
          onClick={() => onChangeView({ kind: "filter", filter: "next7" })}
        />
        <NavItem
          icon={<Star className="h-4 w-4" />}
          label="Importantes"
          count={countImportant}
          active={isActive(v => v.kind === "filter" && v.filter === "important")}
          onClick={() => onChangeView({ kind: "filter", filter: "important" })}
        />

        {/* Lists */}
        <div className="mt-5 mb-1 flex items-center justify-between pr-1">
          <button
            onClick={() => setListsOpen(o => !o)}
            className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted hover:text-white transition-colors px-2 py-1"
          >
            {listsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Minhas Listas
          </button>
          <button
            onClick={() => setAdding(a => !a)}
            className="h-6 w-6 grid place-items-center rounded-md text-sidebar-muted hover:text-white hover:bg-sidebar-border/60 transition-colors"
            aria-label="Adicionar lista"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {listsOpen && (
          <div className="space-y-0.5 animate-fade-in">
            {lists.map(list => (
              <ListNavItem
                key={list.id}
                list={list}
                count={countByList(list.id)}
                active={isActive(v => v.kind === "list" && v.listId === list.id)}
                onClick={() => onChangeView({ kind: "list", listId: list.id })}
                onColorChange={(c) => onUpdateListColor(list.id, c)}
                onRename={(n) => onRenameList(list.id, n)}
                onDelete={() => onDeleteList(list.id)}
              />

            ))}

            {adding && (
              <div className="mt-2 mx-1 p-3 rounded-lg bg-sidebar-border/40 border border-sidebar-border space-y-2 animate-scale-in">
                <Input
                  autoFocus
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddList()}
                  placeholder="Nome da lista"
                  className="h-8 bg-sidebar text-white border-sidebar-border placeholder:text-sidebar-muted text-sm"
                />
                <div className="flex flex-wrap gap-1.5">
                  {ALL_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewListColor(c)}
                      className={cn(
                        "h-5 w-5 rounded-full transition-all",
                        COLOR_MAP[c].bg,
                        newListColor === c ? "ring-2 ring-white ring-offset-2 ring-offset-sidebar scale-110" : "opacity-80 hover:opacity-100"
                      )}
                      aria-label={c}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddList} className="flex-1 h-7 text-xs bg-gradient-primary">Criar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setAdding(false)} className="h-7 text-xs text-sidebar-muted hover:text-white hover:bg-sidebar-border">
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recurring */}
        <SectionLabel className="mt-5">Automação</SectionLabel>
        <NavItem
          icon={<Repeat className="h-4 w-4" />}
          label="Tarefas Recorrentes"
          count={countRecurring}
          active={isActive(v => v.kind === "recurring")}
          onClick={() => onChangeView({ kind: "recurring" })}
          highlight
        />
        <NavItem
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Concluídas"
          count={tasks.filter(t => t.completed).length}
          active={isActive(v => v.kind === "filter" && v.filter === "completed")}
          onClick={() => onChangeView({ kind: "filter", filter: "completed" })}
        />
      </nav>

      <div className="px-5 py-4 border-t border-sidebar-border flex items-center justify-between">
        <button className="flex items-center gap-2 text-xs text-sidebar-muted hover:text-white transition-colors">
          <LogOut className="h-3.5 w-3.5" />
          Sair
        </button>
        <button
          onClick={onOpenSettings}
          aria-label="Configurações"
          className="h-8 w-8 grid place-items-center rounded-lg text-sidebar-muted hover:text-white hover:bg-sidebar-border/60 transition-colors"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted px-2 py-1 mb-1", className)}>
      {children}
    </div>
  );
}

function NavItem({
  icon, label, count, active, onClick, highlight,
}: { icon: React.ReactNode; label: string; count?: number; active?: boolean; onClick: () => void; highlight?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group",
        active
          ? "bg-gradient-primary text-white shadow-glow"
          : "text-sidebar-foreground hover:bg-sidebar-border/50 hover:text-white",
        highlight && !active && "text-violet-300 hover:text-violet-200"
      )}
    >
      <span className={cn("shrink-0", active ? "text-white" : "")}>{icon}</span>
      <span className="flex-1 text-left truncate font-medium">{label}</span>
      {typeof count === "number" && count > 0 && (
        <span className={cn(
          "text-[11px] font-semibold px-1.5 py-0.5 rounded-md tabular-nums min-w-[20px] text-center",
          active ? "bg-white/20 text-white" : "bg-sidebar-border/60 text-sidebar-muted group-hover:text-white"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

function ListNavItem({
  list, count, active, onClick, onColorChange, onRename, onDelete,
}: {
  list: TaskList; count: number; active: boolean;
  onClick: () => void; onColorChange: (c: ListColor) => void;
  onRename: (name: string) => void; onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(list.name);

  const commit = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== list.name) onRename(trimmed);
    else setName(list.name);
    setEditing(false);
  };

  return (
    <div className={cn(
      "group flex items-center rounded-lg transition-all",
      active ? "bg-sidebar-border/70" : "hover:bg-sidebar-border/40"
    )}>
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="pl-3 pr-1.5 py-2 grid place-items-center"
            aria-label="Mudar cor"
            onClick={(e) => e.stopPropagation()}
          >
            <span className={cn("h-2.5 w-2.5 rounded-full transition-transform group-hover:scale-110", COLOR_MAP[list.color].bg)} />
          </button>
        </PopoverTrigger>
        <PopoverContent side="right" className="w-auto p-2">
          <div className="flex gap-1.5">
            {ALL_COLORS.map(c => (
              <button
                key={c}
                onClick={() => onColorChange(c)}
                className={cn(
                  "h-5 w-5 rounded-full transition-all",
                  COLOR_MAP[c].bg,
                  list.color === c ? "ring-2 ring-offset-2 ring-foreground/60 scale-110" : "hover:scale-110"
                )}
                aria-label={c}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {editing ? (
        <div className="flex-1 flex items-center gap-1 pr-1.5 py-1 min-w-0">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") { setName(list.name); setEditing(false); }
            }}
            onBlur={commit}
            className="h-7 px-2 bg-sidebar text-white border-sidebar-border text-sm"
          />
        </div>
      ) : (
        <>
          <button
            onClick={onClick}
            className={cn(
              "flex-1 flex items-center gap-2 pl-1 pr-2 py-2 text-sm transition-colors min-w-0",
              active ? "text-white font-medium" : "text-sidebar-foreground hover:text-white"
            )}
          >
            <span className="truncate flex-1 text-left">{list.name}</span>
            {count > 0 && (
              <span className={cn(
                "text-[11px] font-semibold tabular-nums",
                active ? "text-white" : "text-sidebar-muted"
              )}>{count}</span>
            )}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "h-7 w-7 mr-1.5 grid place-items-center rounded-md text-sidebar-muted hover:text-white hover:bg-sidebar-border/80 transition-all",
                  "opacity-0 group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100"
                )}
                aria-label="Opções da lista"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
                <Pencil className="h-4 w-4 mr-2" /> Renomear
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Excluir lista
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  );
}
