# Guia de Instalação e Implantação - DIGI-TRON Monitor

Este documento contém o procedimento passo a passo para implantar o **DIGI-TRON Monitor** em redes corporativas com estações de trabalho **Windows 10** e **Windows 11**.

---

## 1. Requisitos do Sistema

### Servidor Central (TI):
- **Sistema Operacional:** Windows 10/11 Pro/Enterprise ou Windows Server 2016/2019/2022.
- **Python:** 3.10 ou superior (marcar a opção "Add Python to PATH" durante a instalação).
- **Rede:** Endereço IP estático ou reserva DHCP na rede local corporativa.
- **Porta:** 8000 (ou 3000) liberada no firewall para a rede local (Domain/Private).
- **Banco de Dados:** SQLite (padrão, sem dependências adicionais) ou PostgreSQL 14+ para ambientes acima de 200 máquinas.

### Computadores Clientes (Agente):
- **Sistema Operacional:** Windows 10 (todas as edições a partir de 1809) ou Windows 11 (21H2, 22H2, 23H2 ou superiores).
- **Permissões:** Privilégios de Administrador local apenas durante a instalação do serviço.
- **Recursos:** Menos de 25 MB de RAM e < 0.5% de CPU durante os picos de heartbeat.

---

## 2. Instalação do Servidor Central

1. Abra o **PowerShell** como **Administrador** no computador do servidor.
2. Navegue até a pasta do projeto:
   ```powershell
   cd C:\Caminho\Para\DIGI-TRON-Monitor\installer
   ```
3. Execute o script de instalação automatizada:
   ```powershell
   .\install-server.ps1 -ServerPort 8000
   ```
4. O script irá:
   - Validar a versão do Python.
   - Instalar dependências em um ambiente virtual isolado (`venv`).
   - Criar as tabelas no banco de dados.
   - Configurar o Windows Defender Firewall permitindo tráfego de entrada na porta selecionada.
   - Exibir os endereços IP locais da máquina servidora.
5. Inicie o servidor executando o arquivo gerado:
   ```cmd
   C:\DigitronMonitor\Server\start-server.bat
   ```
6. Acesse o painel pelo navegador em qualquer computador da rede:
   ```
   http://<IP_DO_SERVIDOR>:8000
   ```
   - **Usuário Padrão:** `admin`
   - **Senha Inicial:** `Admin@Digitron2026!`
   *(Altere a senha imediatamente no primeiro acesso através do menu superior > Perfil)*.

---

## 3. Instalação do Agente nas Estações de Trabalho

### Método Rápido (Via PowerShell):

1. No painel web do DIGI-TRON Monitor, vá na aba **"Instalação & Agente"** e copie o **Token de Matrícula** ativo (ou gere um novo para o setor desejado).
2. Na máquina cliente com Windows 10 ou 11, abra o **PowerShell como Administrador**.
3. Execute o instalador passando o IP do servidor e o token:
   ```powershell
   .\install-agent.ps1 -ServerUrl "http://192.168.1.100:8000" -EnrollmentToken "DIGITRON-CORP-2026"
   ```
4. O instalador realiza:
   - Teste de conectividade com o servidor (`GET /health`).
   - Criação da pasta segura `C:\ProgramData\DigitronMonitor` com permissões restritas (somente Administradores e SYSTEM podem alterar).
   - Registro do serviço do Windows **DigitronMonitorAgent** com inicialização automática (`Automatic`).
   - Configuração de recuperação contra falhas (o Windows reinicia o serviço automaticamente em caso de parada acidental).
   - Primeiro envio de heartbeat.

5. Verifique no Painel Administrativo se o novo computador apareceu na lista com status **ONLINE** (ícone verde).

---

## 4. Como Descobrir o IP Local do Servidor

No computador onde o servidor foi instalado:
1. Abra o prompt de comando (`cmd`) ou PowerShell.
2. Digite:
   ```cmd
   ipconfig
   ```
3. Localize o adaptador de rede ativo (Ethernet ou Wi-Fi) e verifique a linha:
   ```
   Endereço IPv4. . . . . . . . . . . . . . : 192.168.1.50
   ```
4. Este é o IP que deve ser inserido no arquivo `config.ini` das máquinas clientes.

---

## 5. Como Testar a Conectividade Manualmente

No computador cliente, teste se há rota até a porta do servidor:

```powershell
# Teste de rota TCP via PowerShell
Test-NetConnection -ComputerName 192.168.1.50 -Port 8000

# Teste HTTP direto
Invoke-RestMethod -Uri "http://192.168.1.50:8000/health" -Method Get
```

Se o resultado retornar `TcpTestSucceeded : True` e `status: healthy`, a comunicação está 100% liberada.

---

## 6. Desinstalação do Agente

Para remover completamente o agente de uma máquina:
```powershell
# Executar no PowerShell como Administrador
.\uninstall-agent.ps1
```
Isso irá parar o serviço, remover o registro no Windows e excluir os arquivos do diretório `C:\ProgramData\DigitronMonitor`.
