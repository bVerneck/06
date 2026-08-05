import { Bell, Volume2, Smartphone } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

export type { NotificationSound } from "@/hooks/useTaskAlarms";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notificationSound: NotificationSound;
  onChangeSound: (value: NotificationSound) => void;
  notifPermission: "default" | "granted" | "denied" | "unsupported";
  onRequestNotifPermission: () => void;
}

export function SettingsModal({
  open, onOpenChange, notificationSound, onChangeSound,
  notifPermission, onRequestNotifPermission,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurações do App</DialogTitle>
          <DialogDescription>
            Ajuste notificações, alarmes e preferências de som.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Notificações e Alarmes */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Notificações e Alarmes</h3>
            </div>

            {/* Permissão de notificação */}
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="space-y-0.5 pr-3">
                <Label className="text-sm font-medium">Permitir notificações</Label>
                <p className="text-xs text-muted-foreground">
                  {notifPermission === "granted"
                    ? "Notificações ativadas no dispositivo."
                    : notifPermission === "denied"
                      ? "Bloqueadas — ajuste nas configurações do navegador."
                      : notifPermission === "unsupported"
                        ? "Seu navegador não suporta notificações."
                        : "Toque para liberar alertas do sistema."}
                </p>
              </div>
              <Switch
                checked={notifPermission === "granted"}
                disabled={notifPermission === "unsupported" || notifPermission === "denied"}
                onCheckedChange={() => {
                  if (notifPermission !== "granted") onRequestNotifPermission();
                }}
              />
            </div>

            {/* Som de Notificação */}
            <div className="rounded-lg border border-border p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-primary" />
                <Label className="text-sm font-medium">Som de Notificação</Label>
              </div>
              <RadioGroup
                value={notificationSound}
                onValueChange={(v) => onChangeSound(v as NotificationSound)}
                className="space-y-2"
              >
                <label
                  htmlFor="sound-system"
                  className={cn(
                    "flex items-start gap-3 rounded-md border p-2.5 cursor-pointer transition-colors",
                    notificationSound === "system"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <RadioGroupItem value="system" id="sound-system" className="mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <Smartphone className="h-3.5 w-3.5" />
                      Som Padrão do Sistema do Celular
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Usa o som nativo do Android/iOS para alertas e alarmes.
                    </p>
                  </div>
                </label>
                <label
                  htmlFor="sound-app"
                  className={cn(
                    "flex items-start gap-3 rounded-md border p-2.5 cursor-pointer transition-colors",
                    notificationSound === "app"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <RadioGroupItem value="app" id="sound-app" className="mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <Volume2 className="h-3.5 w-3.5" />
                      Som do App
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Toca o tom gerado pelo próprio TaskFlow.
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
