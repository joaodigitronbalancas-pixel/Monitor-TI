# Implantação em Massa via Active Directory (GPO) - DIGI-TRON Monitor

Para ambientes com mais de 20 computadores ingressados em um domínio Active Directory, recomenda-se a distribuição automatizada do Agente via **Diretiva de Grupo (GPO)** ou via **Microsoft Endpoint Configuration Manager / Intune**.

---

## 1. Preparação do Pacote de Distribuição

1. Crie uma pasta compartilhada em seu servidor de arquivos ou controlador de domínio:
   `\\SEUDOMINIO\NETLOGON\DigitronAgent\` ou `\\SRV-ARQUIVOS\Deploy$\DigitronAgent\`
2. Conceda permissão de **Leitura** para o grupo `Domain Computers` (Computadores do Domínio).
3. Copie para esta pasta:
   - `DigitronAgent.exe` (ou o script `agent.py`)
   - `config.ini.template`
   - O script `gpo-install.bat` (abaixo).

---

## 2. Script de Instalação Silenciosa (`gpo-install.bat`)

Crie o arquivo `gpo-install.bat` no compartilhamento:

```batch
@echo off
set SHARE=\\SEUDOMINIO\NETLOGON\DigitronAgent
set TARGET=C:\ProgramData\DigitronMonitor
set SERVER_URL=http://192.168.1.100:8000
set TOKEN=DIGITRON-CORP-2026

:: Se já estiver instalado e rodando, sai silenciosamente
sc query DigitronMonitorAgent | find "RUNNING" >nul
if %ERRORLEVEL% equ 0 exit /b 0

:: Cria pasta segura
if not exist "%TARGET%" mkdir "%TARGET%"

:: Copia binários
copy /y "%SHARE%\DigitronAgent.exe" "%TARGET%\DigitronAgent.exe" >nul

:: Cria config.ini se não existir
if not exist "%TARGET%\config.ini" (
    (
        echo [SERVER]
        echo server_url = %SERVER_URL%
        echo verify_ssl = True
        echo request_timeout = 10
        echo [AGENT]
        echo heartbeat_interval = 60
        echo log_file = %TARGET%\agent.log
        echo log_level = INFO
        echo [SECURITY]
        echo enrollment_token = %TOKEN%
        echo machine_id = 
        echo machine_secret = 
    ) > "%TARGET%\config.ini"
)

:: Registra o serviço no Windows
sc create DigitronMonitorAgent binPath= "\"%TARGET%\DigitronAgent.exe\"" start= auto DisplayName= "DIGI-TRON Monitor - Agente de Rede Corporativa" >nul
sc failure DigitronMonitorAgent reset= 86400 actions= restart/10000/restart/30000/restart/60000 >nul

:: Inicia o serviço
net start DigitronMonitorAgent >nul
exit /b 0
```

---

## 3. Criação da GPO no Servidor de Domínio

1. No servidor Active Directory, abra o **Group Policy Management Console** (`gpmc.msc`).
2. Clique com o botão direito na Unidade Organizacional (OU) contendo os computadores e selecione **"Create a GPO in this domain, and Link it here..."**.
3. Nomeie a GPO como **"DIGI-TRON Monitor - Instalação de Agente"**.
4. Edite a GPO e navegue até:
   `Computer Configuration` > `Policies` > `Windows Settings` > `Scripts (Startup/Shutdown)` > **`Startup`**.
5. Clique em **Add**, selecione `\\SEUDOMINIO\NETLOGON\DigitronAgent\gpo-install.bat`.
6. Feche o editor.
7. Na próxima reinicialização de qualquer estação de trabalho conectada ao domínio, o agente será instalado automaticamente sem exibir qualquer janela para o usuário.
