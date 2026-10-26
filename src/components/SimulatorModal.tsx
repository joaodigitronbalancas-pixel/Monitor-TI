import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Play, 
  Square, 
  RefreshCw, 
  Terminal, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Laptop, 
  Activity,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';

interface SimulatorModalProps {
  onClose: () => void;
  onRefreshComputers: () => void;
  timeoutSeconds: number;
}

export const SimulatorModal: React.FC<SimulatorModalProps> = ({
  onClose,
  onRefreshComputers,
  timeoutSeconds
}) => {
  const [runningList, setRunningList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Form parameters
  const [hostname, setHostname] = useState('DIGI-BALANCA-01');
  const [sector, setSector] = useState('Produção & Montagem');
  const [user, setUser] = useState('operador.carlos');
  const [ip, setIp] = useState('192.168.1.145');
  const [intervalSec, setIntervalSec] = useState(10);

  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchRunning();
  }, []);

  const fetchRunning = async () => {
    try {
      const res = await api.listSimulators();
      setRunningList(res.running_simulators || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStart = async (targetHostname?: string) => {
    const hostToStart = targetHostname || hostname;
    try {
      setLoading(true);
      const res = await api.startSimulator({
        hostname: hostToStart,
        sector,
        logged_user: user,
        ip_address: ip,
        interval_sec: Number(intervalSec),
      });
      setMessage(res.message);
      await fetchRunning();
      onRefreshComputers();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async (hostToStop: string) => {
    try {
      setLoading(true);
      const res = await api.stopSimulator(hostToStop);
      setMessage(res.message);
      await fetchRunning();
      onRefreshComputers();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-3xl w-full my-6 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/70">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-red-950/50 border border-red-900/60 text-red-500">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Bancada de Testes de Conectividade de Rede</h3>
              <p className="text-xs text-stone-400">
                Validação em tempo real dos Critérios de Aceitação: Heartbeat, Mudança para Offline e Recuperação
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          
          {/* Explanation Box */}
          <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
            <h4 className="font-bold text-stone-200 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-red-500" />
              Como Funciona o Teste em Tempo Real
            </h4>
            <p className="text-stone-400 leading-relaxed">
              1. <strong>Iniciar Agente de Teste:</strong> Envia requisições HTTP reais de telemetria periodicamente.<br />
              2. <strong>Simular Desconexão / Queda de Rede:</strong> Interrompe os heartbeats. Quando o tempo sem comunicação exceder <strong>{timeoutSeconds}s</strong>, o servidor marcará o computador automaticamente como <span className="text-red-400 font-bold">OFFLINE</span> e disparará um alerta.<br />
              3. <strong>Restabelecer Conexão:</strong> O agente volta a transmitir e o status retorna automaticamente para <span className="text-emerald-400 font-bold">ONLINE</span> com registro de auditoria!
            </p>
          </div>

          {message && (
            <div className="p-3 rounded-lg bg-stone-800/80 border border-stone-700 text-stone-200 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {/* Test Controls */}
          <div className="bg-stone-950/60 border border-stone-800 rounded-xl p-4 space-y-4">
            <h4 className="text-xs uppercase tracking-wider font-bold text-stone-300">
              Disparar Novo Agente de Rede para Teste
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-400 mb-1 font-semibold">Nome da Máquina (Hostname)</label>
                <input
                  type="text"
                  value={hostname}
                  onChange={(e) => setHostname(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-red-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-stone-400 mb-1 font-semibold">Setor da Máquina</label>
                <input
                  type="text"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-stone-400 mb-1 font-semibold">Usuário Conectado</label>
                <input
                  type="text"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-stone-400 mb-1 font-semibold">Endereço IP</label>
                <input
                  type="text"
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-red-500 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-stone-400">
                Frequência de envio: <strong>A cada {intervalSec} segundos</strong>
              </span>
              <button
                onClick={() => handleStart()}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg flex items-center gap-2 transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Iniciar Transmissão de Heartbeats</span>
              </button>
            </div>
          </div>

          {/* Active Simulators List */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-wider font-bold text-stone-300">
              Agentes com Transmissão Ativa no Servidor ({runningList.length})
            </h4>

            {runningList.length === 0 ? (
              <div className="p-6 text-center text-stone-500 bg-stone-950/40 border border-stone-800 rounded-xl">
                Nenhum agente de teste com transmissão contínua no momento.
              </div>
            ) : (
              runningList.map((host) => (
                <div
                  key={host}
                  className="p-3.5 rounded-xl bg-stone-950/80 border border-stone-800 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <div>
                      <strong className="text-white font-mono text-sm">{host}</strong>
                      <span className="text-[11px] text-stone-400 block">Transmitindo telemetria em tempo real</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleStop(host)}
                    disabled={loading}
                    className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900/80 border border-red-800/80 text-red-400 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>Simular Queda de Rede (Interromper)</span>
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Real cURL / PowerShell Heartbeat Command */}
          <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
            <div className="flex items-center space-x-2 text-stone-200 font-bold">
              <Terminal className="w-4 h-4 text-stone-400" />
              <span>Como Testar a API Manualmente com curl ou PowerShell Externo</span>
            </div>
            <pre className="p-3 rounded bg-stone-900 text-stone-300 font-mono text-[11px] overflow-x-auto whitespace-pre">
{`# 1. Obter informações de saúde da API:
curl -X GET "${window.location.origin}/health"

# 2. Executar o agente Windows diretamente via linha de comando:
python .\\agent\\agent.py --run-once

# 3. Testar coleta de telemetria local no console:
python .\\agent\\agent.py --telemetry-test`}
            </pre>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-800 bg-stone-950/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Fechar Janela
          </button>
        </div>

      </div>
    </div>
  );
};
