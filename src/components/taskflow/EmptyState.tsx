import { Inbox, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  hasSearch, onCreate, onClearSearch,
}: { hasSearch: boolean; onCreate: () => void; onClearSearch: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6 rounded-3xl border border-dashed border-border bg-card/50 animate-fade-in">
      <div className="h-16 w-16 rounded-2xl bg-gradient-primary/10 grid place-items-center mb-5">
        {hasSearch
          ? <Search className="h-7 w-7 text-primary" />
          : <Inbox className="h-7 w-7 text-primary" />}
      </div>
      <h3 className="text-xl font-bold mb-1.5">
        {hasSearch ? "Nada encontrado" : "Tudo limpo por aqui"}
      </h3>
      <p className="text-muted-foreground text-sm max-w-sm mb-6">
        {hasSearch
          ? "Tente outras palavras-chave, ou limpe a busca para ver suas tarefas."
          : "Comece criando sua primeira tarefa para esta visão. Tudo fica organizado e acessível em segundos."}
      </p>
      <div className="flex gap-2">
        {hasSearch && (
          <Button variant="outline" onClick={onClearSearch}>Limpar busca</Button>
        )}
        <Button onClick={onCreate} className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow">
          <Plus className="h-4 w-4" />
          Criar Nova Tarefa
        </Button>
      </div>
    </div>
  );
}
