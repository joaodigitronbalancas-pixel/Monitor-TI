# DIGI-TRON Monitor - Sistema Corporativo de Monitoramento de Rede Windows

Sistema full-stack profissional desenvolvido para a equipe de Tecnologia da Informação da **DIGI-TRON Balanças**, destinado ao inventário contínuo, monitoramento de saúde de hardware (CPU, RAM, Disco) e status operacional de estações de trabalho e servidores com **Windows 10** e **Windows 11**.

---

## 🏗️ Arquitetura

O sistema opera com dois componentes independentes e desacoplados:

1. **SERVIDOR CENTRAL (TI):**
   - Hospeda a API REST (FastAPI / Node Express), o banco de dados e o Painel Administrativo Web interativo.
   - Acesso pelo navegador via IP local corporativo (`http://<IP_DO_SERVIDOR>:8000` ou `:3000`).
   - Autenticação com proteção contra ataques de força bruta, controle de perfis (Admin, Operador, Auditor) e trilha de auditoria.
   - Cálculo dinâmico do estado Online/Offline com base no último heartbeat recebido e limite configurável.

2. **AGENTE WINDOWS:**
   - Serviço em segundo plano (`DigitronMonitorAgent`) nos computadores clientes.
   - Executa sem janelas ou interrupções para o usuário.
   - Envia telemetria autenticada via token criptográfico e HMAC SHA-256 a cada 60 segundos.
   - Reconexão e retentativa automática com recuo exponencial em caso de instabilidade na rede.
   - **Compromisso de Privacidade:** Monitora apenas a integridade da máquina. **Não coleta senhas, teclas digitadas, tela ou mensagens pessoais**.

---

## 📁 Estrutura do Projeto

```text
DIGI-TRON-Monitor/
├── backend/            # Servidor FastAPI em Python (SQLAlchemy, SQLite/PostgreSQL)
│   ├── main.py         # Ponto de entrada da API e injeção de dependências
│   ├── config.py       # Configurações de ambiente e segurança
│   ├── database.py     # Conexão com banco relacional
│   ├── models.py       # Modelos de dados (Computers, Metrics, Alerts, Tokens, Audit)
│   ├── schemas.py      # Schemas Pydantic v2
│   ├── auth.py         # Hashing bcrypt, JWT e proteção de rotas
│   └── routers/        # Rotas separadas (auth, computers, agent, alerts, audit, settings)
├── agent/              # Agente para estações de trabalho Windows
│   ├── agent.py        # Coleta de métricas de hardware e envio de heartbeats
│   ├── windows_service.py # Invólucro para execução como Serviço do Windows
│   ├── config.ini.template# Modelo de configuração do agente
│   └── build_agent.spec# Arquivo de empacotamento com PyInstaller
├── installer/          # Scripts automatizados em PowerShell
│   ├── install-server.ps1     # Instalação do servidor e ambiente virtual
│   ├── install-agent.ps1      # Instalação do agente como serviço no Windows 10/11
│   ├── uninstall-agent.ps1    # Desinstalação limpa do serviço e arquivos
│   ├── configure-firewall.ps1 # Regras corporativas no Windows Defender Firewall
│   └── generate-cert.ps1      # Criação de certificado SSL autoassinado para HTTPS
├── docs/               # Documentação técnica detalhada
│   ├── INSTALLATION_GUIDE.md  # Guia passo a passo com telas e comandos
│   ├── NETWORK_FIREWALL.md    # Topologia de rede e liberação de portas
│   ├── GPO_DEPLOYMENT.md      # Distribuição em massa via Active Directory
│   ├── AGENT_ARCHITECTURE.md  # Detalhes de conformidade e privacidade
│   └── API_REFERENCE.md       # Especificação completa da API REST
├── tests/              # Testes automatizados
│   ├── test_api.py     # Testes de integração da API e protocolo
│   └── test_agent.py   # Testes unitários da coleta e limites de privacidade
├── src/                # Painel Administrativo React + TypeScript + Tailwind
├── server.ts           # Servidor full-stack unificado para ambiente de execução
└── package.json        # Dependências do frontend e servidor web
```

---

## 🚀 Como Executar

### 1. Servidor Central (Ambiente Web / Dev)
Para rodar o painel administrativo integrado e a API:
```bash
npm install
npm run dev
```
O servidor estará disponível em `http://localhost:3000`.

### 2. Servidor Central em Python (Ambiente Corporativo Dedicado)
No computador ou máquina virtual da equipe de TI:
```powershell
cd installer
.\install-server.ps1 -ServerPort 8000
```
Ou manualmente com Python:
```bash
cd backend
python -m venv venv
venv\Scripts\activate   # No Windows (ou source venv/bin/activate no Linux)
pip install -r requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### 3. Instalação do Agente no Windows 10 e Windows 11
1. Obtenha o token de matrícula no Painel Web (ex: `DIGITRON-CORP-2026`).
2. No PowerShell da máquina cliente (como **Administrador**):
```powershell
.\installer\install-agent.ps1 -ServerUrl "http://192.168.1.50:8000" -EnrollmentToken "DIGITRON-CORP-2026"
```
O agente começará a enviar heartbeats imediatamente.

---

## 🧪 Execução de Testes Automatizados

```bash
# Testes da API e do Protocolo do Agente:
python -m unittest tests/test_api.py

# Testes de Coleta de Telemetria e Privacidade:
python -m unittest tests/test_agent.py
```

---

## 🔒 Credenciais Iniciais de Administrador
- **Usuário:** `admin`
- **Senha Inicial:** `Admin@Digitron2026!`
*(Recomenda-se alterar a senha após o primeiro login através da opção no menu de perfil do painel)*.
