import { useEffect, useRef, useState } from "react";
import { Calendar as CalendarIcon, Clock, Paperclip, Repeat, Star, Tag, X, Image as ImageIcon, Link as LinkIcon, FileText, File, FileArchive, FileSpreadsheet, Trash2, CloudUpload as UploadCloud, Bell, BellRing, ExternalLink } from "lucide-react";
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  COLOR_MAP, type Attachment, type Recurrence, type Task, type TaskList,
  type AlertType, type AlarmDurationType,
} from "@/lib/taskData";
import { Check } from "lucide-react";

const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: "none", label: "Sem repetição" },
  { value: "hourly", label: "A cada hora" },
  { value: "daily", label: "Diária" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
  { value: "custom", label: "Personalizada" },
];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const REC_LABEL: Record<Recurrence, string> = {
  none: "Sem repetição",
  hourly: "A cada hora",
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal",
  custom: "Personalizada",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  lists: TaskList[];
  onSave: (task: Task) => void;
  onDelete: (id: string) => void;
}

export function TaskModal({ open, onOpenChange, task, lists, onSave, onDelete }: Props) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [listId, setListId] = useState(lists[0]?.id ?? "");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [important, setImportant] = useState(false);
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [customRec, setCustomRec] = useState("");
  const [recInterval, setRecInterval] = useState<number>(1);
  const [recWeekdays, setRecWeekdays] = useState<number[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [alertType, setAlertType] = useState<AlertType>("notification");
  const [alarmDurationType, setAlarmDurationType] = useState<AlarmDurationType>("manual");
  const [alarmDurationSeconds, setAlarmDurationSeconds] = useState<number>(30);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (task) {
      setTitle(task.title);
      setNotes(task.notes ?? "");
      setListId(task.listId);
      if (task.dueDate) {
        const d = new Date(task.dueDate);
        setDueDate(d.toISOString().slice(0, 10));
        setDueTime(d.toTimeString().slice(0, 5));
      } else { setDueDate(""); setDueTime(""); }
      setImportant(task.important);
      setRecurrence(task.recurrence);
      setCustomRec(task.customRecurrence ?? "");
      setRecInterval(task.recurrenceInterval ?? 1);
      setRecWeekdays(task.recurrenceWeekdays ?? []);
      setAttachments(task.attachments);
      setTags(task.tags);
      setAlertType(task.alertType ?? "notification");
      setAlarmDurationType(task.alarmDurationType ?? "manual");
      setAlarmDurationSeconds(task.alarmDurationSeconds ?? 30);
    } else {
      setTitle(""); setNotes(""); setListId(lists[0]?.id ?? "");
      setDueDate(""); setDueTime(""); setImportant(false);
      setRecurrence("none"); setCustomRec(""); setRecInterval(1); setRecWeekdays([]);
      setAttachments([]); setTags([]); setTagInput("");
      setAlertType("notification"); setAlarmDurationType("manual"); setAlarmDurationSeconds(30);
    }
  }, [task, open, lists]);

  const handleSave = () => {
    if (!title.trim()) return;
    let isoDue: string | undefined;
    if (dueDate) {
      const time = dueTime || "09:00";
      isoDue = new Date(`${dueDate}T${time}:00`).toISOString();
    }
    const saved: Task = {
      id: task?.id ?? `t-${Date.now()}`,
      title: title.trim(),
      notes: notes.trim() || undefined,
      listId,
      dueDate: isoDue,
      completed: task?.completed ?? false,
      important,
      recurrence,
      customRecurrence: recurrence === "custom" ? customRec.trim() || undefined : undefined,
      recurrenceInterval: recurrence !== "none" ? recInterval || undefined : undefined,
      recurrenceWeekdays: (recurrence === "weekly" || recurrence === "custom") ? recWeekdays : undefined,
      attachments,
      tags,
      createdAt: task?.createdAt ?? new Date().toISOString(),
      alertType,
      alarmDurationType: alertType === "alarm" ? alarmDurationType : undefined,
      alarmDurationSeconds: alertType === "alarm" && alarmDurationType === "timed" ? alarmDurationSeconds : undefined,
    };
    onSave(saved);
  };

  const addFiles = (files: File[]) => {
    files.forEach(f => {
      const isImg = f.type.startsWith("image/");
      const id = `att-${Date.now()}-${Math.random()}`;
      const base: Attachment = {
        id,
        name: f.name,
        type: isImg ? "image" : "file",
        size: `${(f.size / 1024).toFixed(0)} KB`,
      };
      setAttachments(prev => [...prev, base]);
      if (isImg) {
        const reader = new FileReader();
        reader.onload = () => {
          setAttachments(prev => prev.map(a => a.id === id ? { ...a, url: String(reader.result) } : a));
        };
        reader.readAsDataURL(f);
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const openAttachment = (att: Attachment) => {
    if (att.type === "image" && att.url) {
      setLightbox({ src: att.url, alt: att.name });
    } else {
      openAttachmentExternal(att);
    }
  };

  const addLink = () => {
    const url = prompt("Cole a URL do link:");
    if (!url) return;
    setAttachments(prev => [...prev, {
      id: `att-${Date.now()}`, name: url, type: "link", url,
    }]);
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl font-bold tracking-tight">
            {task ? "Editar tarefa" : "Criar nova tarefa"}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto scrollbar-thin px-6 py-5 space-y-5 flex-1">
          {/* Title */}
          <div>
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="O que você precisa fazer?"
              className="text-lg font-semibold h-12 border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
            />
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notas</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione detalhes, links de referência ou contexto..."
              rows={3}
              className="mt-1.5 resize-none"
            />
          </div>

          {/* List + Date + Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lista</Label>
              <Select value={listId} onValueChange={setListId}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {lists.map(l => (
                    <SelectItem key={l.id} value={l.id}>
                      <span className="flex items-center gap-2">
                        <span className={cn("h-2 w-2 rounded-full", COLOR_MAP[l.color].bg)} />
                        {l.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" /> Data
              </Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Clock className="h-3 w-3" /> Hora
              </Label>
              <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className="mt-1.5" />
            </div>
          </div>

          {/* Alert type */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Bell className="h-3 w-3" /> Tipo de alerta
            </Label>
            <div className="mt-1.5 flex gap-2">
              {([
                ["notification", "Notificação", Bell],
                ["alarm", "Alarme", BellRing],
              ] as [AlertType, string, typeof Bell][]).map(([val, label, Icon]) => (
                <button
                  key={val}
                  onClick={() => setAlertType(val)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5",
                    alertType === val
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
            {alertType === "alarm" && (
              <div className="mt-3 rounded-xl border border-border bg-secondary/40 p-3 space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Parada do alarme
                  </Label>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {([
                      ["manual", "Até eu desligar"],
                      ["timed", "Tempo limite"],
                    ] as [AlarmDurationType, string][]).map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => setAlarmDurationType(val)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                          alarmDurationType === val
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {alarmDurationType === "timed" && (
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Tempo (segundos)
                    </Label>
                    <div className="mt-1.5 flex gap-2">
                      {([15, 30, 60] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setAlarmDurationSeconds(s)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                            alarmDurationSeconds === s
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                          )}
                        >
                          {s}s
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recurrence */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Repeat className="h-3 w-3" /> Recorrência
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="mt-1.5 w-full h-9 px-3 rounded-md border border-input bg-card text-sm text-left flex items-center justify-between hover:border-primary/40 transition-colors">
                  <span className={cn(recurrence === "none" ? "text-muted-foreground" : "text-foreground")}>
                    {REC_LABEL[recurrence]}
                  </span>
                  <Repeat className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width] min-w-56">
                {RECURRENCE_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => setRecurrence(opt.value)}
                    className="flex items-center justify-between"
                  >
                    <span>{opt.label}</span>
                    {recurrence === opt.value && <Check className="h-4 w-4 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {(recurrence === "hourly" || recurrence === "daily" || recurrence === "weekly" || recurrence === "monthly" || recurrence === "custom") && (
              <div className="mt-2.5 rounded-xl border border-border bg-secondary/40 p-3 space-y-3">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <span>Repetir a cada</span>
                  <Input
                    type="number"
                    min={1}
                    value={recInterval}
                    onChange={(e) => setRecInterval(Math.max(1, Number(e.target.value) || 1))}
                    className="w-16 h-8 text-center"
                  />
                  <span>
                    {recurrence === "hourly" && (recInterval > 1 ? "horas" : "hora")}
                    {recurrence === "daily" && (recInterval > 1 ? "dias" : "dia")}
                    {recurrence === "weekly" && (recInterval > 1 ? "semanas" : "semana")}
                    {recurrence === "monthly" && (recInterval > 1 ? "meses" : "mês")}
                    {recurrence === "custom" && "períodos"}
                  </span>
                </div>

                {recurrence === "weekly" && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Repetir nos dias
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {WEEKDAYS.map((day, idx) => {
                        const active = recWeekdays.includes(idx);
                        return (
                          <button
                            key={day}
                            onClick={() => setRecWeekdays(prev => active ? prev.filter(d => d !== idx) : [...prev, idx].sort())}
                            className={cn(
                              "h-9 w-9 rounded-full text-xs font-semibold border transition-all",
                              active
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                            )}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {recurrence === "custom" && (
                  <>
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Repetir nos dias
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {WEEKDAYS.map((day, idx) => {
                          const active = recWeekdays.includes(idx);
                          return (
                            <button
                              key={day}
                              onClick={() => setRecWeekdays(prev => active ? prev.filter(d => d !== idx) : [...prev, idx].sort())}
                              className={cn(
                                "h-9 w-9 rounded-full text-xs font-semibold border transition-all",
                                active
                                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                  : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                              )}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Descrição da recorrência
                      </div>
                      <Input
                        value={customRec}
                        onChange={(e) => setCustomRec(e.target.value)}
                        placeholder='Ex.: "Toda segunda às 9h" ou "Todo dia 15 do mês"'
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Attachments dropzone */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Paperclip className="h-3 w-3" /> Anexos
            </Label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={cn(
                "mt-1.5 border-2 border-dashed rounded-xl p-5 text-center transition-all",
                dragOver ? "border-primary bg-accent" : "border-border bg-secondary/30 hover:bg-secondary/50"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }}
              />
              <UploadCloud className={cn("h-7 w-7 mx-auto mb-2", dragOver ? "text-primary" : "text-muted-foreground")} />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <UploadCloud className="h-4 w-4" />
                Escolha arquivos
              </button>
              <p className="text-xs text-muted-foreground mt-2">Imagens, PDFs ou outros formatos</p>
              <p className="text-xs text-muted-foreground mt-1">
                ou
                <button onClick={addLink} className="text-primary font-medium hover:underline ml-1">
                  adicione um link
                </button>
              </p>
            </div>

            {attachments.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {attachments.map(att => {
                  const { Icon, color } = fileIcon(att.name, att.type);
                  return (
                    <div key={att.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-secondary/60 group">
                      <button
                        onClick={() => openAttachment(att)}
                        className="h-12 w-12 grid place-items-center rounded-md bg-card overflow-hidden shrink-0 relative hover:ring-2 hover:ring-primary/40 transition-all"
                        aria-label={`Abrir ${att.name}`}
                      >
                        {att.type === "image" && att.url ? (
                          <img src={att.url} alt={att.name} className="h-full w-full object-cover" />
                        ) : (
                          <Icon className={cn("h-5 w-5", color)} />
                        )}
                      </button>
                      <button
                        onClick={() => openAttachment(att)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="text-sm font-medium truncate flex items-center gap-1.5">
                          {att.name}
                          {att.type !== "image" && <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />}
                        </div>
                        {att.size && <div className="text-[11px] text-muted-foreground">{att.size}</div>}
                      </button>
                      <button
                        onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))}
                        className="h-7 w-7 grid place-items-center text-muted-foreground hover:text-destructive rounded-md hover:bg-card transition-all"
                        aria-label="Remover anexo"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

          </div>

          {/* Tags + Important */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Tag className="h-3 w-3" /> Tags
              </Label>
              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap p-2 border border-input rounded-md min-h-[40px]">
                {tags.map(t => (
                  <Badge key={t} variant="secondary" className="gap-1 pr-1">
                    {t}
                    <button onClick={() => setTags(prev => prev.filter(x => x !== t))} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  onBlur={addTag}
                  placeholder={tags.length === 0 ? "Adicione tags..." : ""}
                  className="bg-transparent outline-none text-sm flex-1 min-w-[80px]"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prioridade</Label>
              <button
                onClick={() => setImportant(i => !i)}
                className={cn(
                  "mt-1.5 w-full h-10 px-3 rounded-md border flex items-center justify-between transition-all",
                  important
                    ? "bg-amber-50 border-amber-300 text-amber-700"
                    : "bg-card border-input text-muted-foreground hover:border-amber-300"
                )}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Star className={cn("h-4 w-4", important && "fill-amber-500 text-amber-500")} />
                  Marcar como importante
                </span>
                <Switch checked={important} />
              </button>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-secondary/30 sm:justify-between">
          <div>
            {task && (
              <Button
                variant="ghost"
                onClick={() => onDelete(task.id)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
              >
                <Trash2 className="h-4 w-4" /> Excluir
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={!title.trim()}
              className="bg-gradient-primary text-primary-foreground shadow-glow min-w-[120px]"
            >
              {task ? "Salvar" : "Criar tarefa"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {lightbox && (
        <AttachmentLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      )}
    </Dialog>
  );
}
