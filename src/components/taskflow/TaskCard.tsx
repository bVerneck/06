import { useState } from "react";
import { Calendar, Star, Paperclip, Repeat, MoveHorizontal as MoreHorizontal, Pencil, Trash2, Clock, Tag, Image as ImageIcon, Link as LinkIcon, FileText, File, FileArchive, FileSpreadsheet, ExternalLink } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { COLOR_MAP, type Attachment, type Task, type TaskList } from "@/lib/taskData";
import { AttachmentLightbox, openAttachmentExternal } from "@/components/taskflow/AttachmentLightbox";

function fileIcon(name: string, type: Attachment["type"]) {
  if (type === "link") return { Icon: LinkIcon, color: "text-sky-600" };
  if (type === "image") return { Icon: ImageIcon, color: "text-violet-600" };
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["pdf"].includes(ext)) return { Icon: FileText, color: "text-rose-600" };
  if (["xls", "xlsx", "csv"].includes(ext)) return { Icon: FileSpreadsheet, color: "text-emerald-600" };
  if (["zip", "rar", "7z", "gz"].includes(ext)) return { Icon: FileArchive, color: "text-amber-600" };
  if (["doc", "docx", "txt", "md"].includes(ext)) return { Icon: FileText, color: "text-blue-600" };
  return { Icon: File, color: "text-muted-foreground" };
}

interface Props {
  task: Task;
  list?: TaskList;
  onToggleComplete: () => void;
  onToggleImportant: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function TaskCard({ task, list, onToggleComplete, onToggleImportant, onEdit, onDelete }: Props) {
  const [hovered, setHovered] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  const openAttachment = (att: Attachment) => {
    if (att.type === "image" && att.url) {
      setLightbox({ src: att.url, alt: att.name });
    } else {
      openAttachmentExternal(att);
    }
  };

  const color = list ? COLOR_MAP[list.color] : COLOR_MAP.slate;

  const due = task.dueDate ? new Date(task.dueDate) : null;
  const now = new Date();
  const isToday = due && due.toDateString() === now.toDateString();
  const isOverdue = due && !task.completed && due.getTime() < now.getTime();
  const isTomorrow = due && (() => {
    const t = new Date(); t.setDate(t.getDate() + 1); return due.toDateString() === t.toDateString();
  })();

  const dueLabel = due ? formatDue(due, isToday, isTomorrow!) : null;

  const recurrenceLabel = (() => {
    switch (task.recurrence) {
      case "hourly": return "A cada hora";
      case "daily": return "Diariamente";
      case "weekly": return "Semanalmente";
      case "monthly": return "Mensalmente";
      case "custom": return task.customRecurrence ?? "Personalizado";
      default: return null;
    }
  })();

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onEdit}
      className={cn(
        "group relative bg-card border border-border rounded-xl p-3.5 pl-4 transition-all duration-150 cursor-pointer",
        "hover:border-foreground/30 hover:shadow-md",
        task.completed && "opacity-60"
      )}
    >
      {/* color stripe */}
      <div className={cn("absolute left-0 top-3 bottom-3 w-1 rounded-r-full", color.bg)} />


      <div className="flex items-start gap-4">
        <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
          <Checkbox
            checked={task.completed}
            onCheckedChange={onToggleComplete}
            className={cn(
              "h-5 w-5 rounded-full border-2 transition-all",
              task.completed
                ? "bg-success border-success text-success-foreground data-[state=checked]:bg-success data-[state=checked]:border-success"
                : "border-muted-foreground/40 hover:border-primary"
            )}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h3 className={cn(
              "font-semibold text-[15px] leading-snug text-foreground",
              task.completed && "line-through text-muted-foreground"
            )}>
              {task.title}
            </h3>

            <div className="flex items-center gap-0.5 -mr-1 -mt-1 shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); onToggleImportant(); }}
                className={cn(
                  "h-8 w-8 grid place-items-center rounded-lg transition-all",
                  task.important
                    ? "text-amber-500 hover:bg-amber-50"
                    : "text-muted-foreground/40 opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-amber-500"
                )}
                aria-label="Marcar importante"
              >
                <Star className={cn("h-4 w-4", task.important && "fill-amber-500")} />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <button className={cn(
                    "h-8 w-8 grid place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all",
                    !hovered && "opacity-0"
                  )}>
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                    <Pencil className="h-4 w-4 mr-2" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleImportant(); }}>
                    <Star className="h-4 w-4 mr-2" /> {task.important ? "Remover destaque" : "Destacar"}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                    <Trash2 className="h-4 w-4 mr-2" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {task.notes && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {task.notes}
            </p>
          )}

          {/* Attachment previews */}
          {task.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2.5">
              {task.attachments.map(att => {
                const { Icon, color } = fileIcon(att.name, att.type);
                if (att.type === "image" && att.url) {
                  return (
                    <button
                      key={att.id}
                      onClick={(e) => { e.stopPropagation(); openAttachment(att); }}
                      className="relative h-16 w-16 rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-primary/40 transition-all shrink-0"
                      aria-label={`Abrir ${att.name}`}
                    >
                      <img src={att.url} alt={att.name} loading="lazy" className="h-full w-full object-cover" />
                    </button>
                  );
                }
                return (
                  <button
                    key={att.id}
                    onClick={(e) => { e.stopPropagation(); openAttachment(att); }}
                    className="flex items-center gap-2 h-16 px-2.5 rounded-lg border border-border bg-card hover:ring-2 hover:ring-primary/40 transition-all max-w-[200px]"
                    aria-label={`Abrir ${att.name}`}
                  >
                    <Icon className={cn("h-5 w-5 shrink-0", color)} />
                    <div className="min-w-0 flex-1 text-left">
                      <div className="text-xs font-medium truncate flex items-center gap-1">
                        {att.name}
                        <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                      </div>
                      {att.size && <div className="text-[10px] text-muted-foreground truncate">{att.size}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}


          {/* Meta */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {list && (
              <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md", color.soft)}>
                <span className={cn("h-1.5 w-1.5 rounded-full", color.bg)} />
                {list.name}
              </span>
            )}

            {dueLabel && (
              <span className={cn(
                "inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md",
                isOverdue ? "bg-destructive/10 text-destructive" :
                isToday ? "bg-indigo-50 text-indigo-700" :
                "bg-secondary text-muted-foreground"
              )}>
                <Calendar className="h-3 w-3" />
                {dueLabel}
              </span>
            )}

            {recurrenceLabel && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-violet-50 text-violet-700">
                <Repeat className="h-3 w-3" />
                {recurrenceLabel}
              </span>
            )}

            {task.attachments.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-secondary text-muted-foreground">
                <Paperclip className="h-3 w-3" />
                {task.attachments.length}
              </span>
            )}

            {task.tags.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 text-xs text-muted-foreground px-2 py-1 rounded-md bg-secondary/50">
                <Tag className="h-3 w-3" />
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {lightbox && (
        <AttachmentLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}

function formatDue(d: Date, isToday: boolean, isTomorrow: boolean): string {
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Hoje, ${time}`;
  if (isTomorrow) return `Amanhã, ${time}`;
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  const datePart = d.toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", ...(sameYear ? {} : { year: "numeric" }),
  });
  return `${datePart}, ${time}`;
}
