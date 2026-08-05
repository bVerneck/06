import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { NotifPermission } from "@/hooks/useTaskAlarms";

interface Props {
  permission: NotifPermission;
  onRequest: () => Promise<NotifPermission>;
}

export function NotificationToggle({ permission, onRequest }: Props) {
  const handleClick = async () => {
    if (permission === "unsupported") {
      toast.error("Seu navegador não suporta notificações");
      return;
    }
    if (permission === "granted") {
      toast.success("Alarmes ativos", { description: "Você será notificado no horário de cada tarefa." });
      return;
    }
    if (permission === "denied") {
      toast.error("Notificações bloqueadas", { description: "Libere as notificações nas configurações do navegador." });
      return;
    }
    const result = await onRequest();
    if (result === "granted") toast.success("Notificações ativadas");
    else if (result === "denied") toast.error("Permissão negada");
  };

  const Icon = permission === "granted" ? BellRing : permission === "denied" || permission === "unsupported" ? BellOff : Bell;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      aria-label="Ativar notificações e alarmes"
      title="Notificações e alarmes"
      className={`h-9 w-9 rounded-full shrink-0 hover:bg-background/60 ${permission === "granted" ? "text-primary" : "text-muted-foreground"}`}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
