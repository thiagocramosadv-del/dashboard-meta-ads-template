import { useState } from "react";
import { CheckCircle2, Bell, Plug, Settings2, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const Section = ({
  icon: Icon,
  title,
  desc,
  children,
}: {
  icon: typeof Plug;
  title: string;
  desc: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-xl border border-border bg-card p-6 shadow-card">
    <header className="flex items-start gap-3 mb-5">
      <div className="h-9 w-9 rounded-md bg-primary/15 grid place-items-center shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </header>
    <div className="space-y-4">{children}</div>
  </section>
);

const Configuracoes = () => {
  // Preferências
  const [periodo, setPeriodo] = useState("30d");
  const [refresh, setRefresh] = useState("300");
  const [tema, setTema] = useState("dark");

  // Alertas
  const [alertCpl, setAlertCpl] = useState(true);
  const [cplLimite, setCplLimite] = useState("200");
  const [alertFreq, setAlertFreq] = useState(true);
  const [freqLimite, setFreqLimite] = useState("4,0");
  const [alertSaldo, setAlertSaldo] = useState(true);
  const [saldoLimite, setSaldoLimite] = useState("500");
  const [alertNovaCamp, setAlertNovaCamp] = useState(false);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-5xl">
      {/* Conexão */}
      <Section
        icon={Plug}
        title="Conexão com Meta Ads"
        desc="Status da integração com a sua conta de anúncios"
      >
        <div className="rounded-lg border border-success/30 bg-success/5 p-4 flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-success animate-pulse shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Conectado</p>
            <p className="text-xs text-muted-foreground truncate">
              Santos Advocacia · BM #1827xxxx
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Tipo de token
            </dt>
            <dd className="mt-1 font-medium">System User · não expira</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Última sincronização
            </dt>
            <dd className="mt-1 font-medium">há 30 segundos</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
              Uso da API
            </dt>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: "18%" }}
                />
              </div>
              <span className="text-xs font-medium num">18% do limite</span>
            </div>
          </div>
        </dl>

        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            className="flex-1 border-border bg-background/40"
            onClick={() =>
              toast({ title: "Conexão OK", description: "Resposta em 142ms." })
            }
          >
            <RefreshCw className="h-3.5 w-3.5 mr-2" />
            Testar conexão
          </Button>
          <Button variant="outline" className="flex-1 border-border bg-background/40">
            Reconectar
          </Button>
        </div>
      </Section>

      {/* Preferências */}
      <Section
        icon={Settings2}
        title="Preferências padrão"
        desc="Como o painel abre por padrão"
      >
        <div className="space-y-2">
          <Label className="text-xs">Período padrão</Label>
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="bg-background border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="14d">Últimos 14 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="este_mes">Este mês</SelectItem>
              <SelectItem value="mes_passado">Mês passado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Atualização automática</Label>
          <Select value={refresh} onValueChange={setRefresh}>
            <SelectTrigger className="bg-background border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="60">A cada 60 segundos</SelectItem>
              <SelectItem value="300">A cada 5 minutos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Tema</Label>
          <Select value={tema} onValueChange={setTema}>
            <SelectTrigger className="bg-background border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dark">Escuro</SelectItem>
              <SelectItem value="light" disabled>
                Claro (em breve)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Section>

      {/* Alertas */}
      <Section
        icon={Bell}
        title="Alertas"
        desc="Avise quando algo sair do esperado"
      >
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <Checkbox
              checked={alertCpl}
              onCheckedChange={(v) => setAlertCpl(Boolean(v))}
            />
            <span className="text-sm flex-1">
              CPL acima de
            </span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">R$</span>
              <Input
                value={cplLimite}
                onChange={(e) => setCplLimite(e.target.value)}
                disabled={!alertCpl}
                inputMode="numeric"
                className="bg-background border-border num h-8 w-20 text-right"
              />
            </div>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              em qualquer campanha
            </span>
          </label>

          <label className="flex items-center gap-3">
            <Checkbox
              checked={alertFreq}
              onCheckedChange={(v) => setAlertFreq(Boolean(v))}
            />
            <span className="text-sm flex-1">Frequência acima de</span>
            <Input
              value={freqLimite}
              onChange={(e) => setFreqLimite(e.target.value)}
              disabled={!alertFreq}
              inputMode="decimal"
              className="bg-background border-border num h-8 w-20 text-right"
            />
            <span className="text-xs text-muted-foreground hidden sm:inline">
              em qualquer criativo
            </span>
          </label>

          <label className="flex items-center gap-3">
            <Checkbox
              checked={alertSaldo}
              onCheckedChange={(v) => setAlertSaldo(Boolean(v))}
            />
            <span className="text-sm flex-1">Saldo da conta abaixo de</span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">R$</span>
              <Input
                value={saldoLimite}
                onChange={(e) => setSaldoLimite(e.target.value)}
                disabled={!alertSaldo}
                inputMode="numeric"
                className="bg-background border-border num h-8 w-20 text-right"
              />
            </div>
          </label>

          <label className="flex items-center gap-3">
            <Checkbox
              checked={alertNovaCamp}
              onCheckedChange={(v) => setAlertNovaCamp(Boolean(v))}
            />
            <span className="text-sm flex-1">Nova campanha criada</span>
          </label>
        </div>

        <div className="pt-2">
          <Button
            className="w-full"
            onClick={() =>
              toast({
                title: "Alertas salvos",
                description: "Suas preferências foram atualizadas.",
              })
            }
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Salvar alertas
          </Button>
        </div>
      </Section>
    </div>
  );
};

export default Configuracoes;
