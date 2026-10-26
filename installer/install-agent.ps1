<#
.SYNOPSIS
    Instalador do Agente DIGI-TRON Monitor para Windows 10 e Windows 11.
.DESCRIPTION
    Instala o agente como serviço em segundo plano (sem janelas e sem interromper o usuário).
    Configura permissões restritas (ACLs), valida conectividade com o Servidor Central
    e inicia a transmissão de heartbeats.
.EXAMPLE
    .\install-agent.ps1 -ServerUrl "http://192.168.1.100:3000" -EnrollmentToken "DIGITRON-CORP-2026"
#>

param (
    [Parameter(Mandatory=$false)]
    [string]$ServerUrl = "http://127.0.0.1:3000",

    [Parameter(Mandatory=$false)]
    [string]$EnrollmentToken = "DIGITRON-CORP-2026",

    [Parameter(Mandatory=$false)]
    [string]$InstallDir = "C:\ProgramData\DigitronMonitor"
)

# Verifica privilégios de Administrador
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[ERRO] Este script requer privilégios de Administrador." -ForegroundColor Red
    Write-Host "Execute o PowerShell como Administrador para instalar o serviço do Agente." -ForegroundColor Yellow
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Red
Write-Host "     DIGI-TRON Monitor - Instalação do Agente Windows      " -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Red

# 1. Teste de Conectividade com o Servidor Central
Write-Host "[1/5] Testando conectividade com o Servidor Central ($ServerUrl)..." -ForegroundColor Cyan
try {
    $healthCheck = Invoke-RestMethod -Uri "$ServerUrl/health" -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-Host "Conexão com o servidor estabelecida com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "[AVISO] Não foi possível obter resposta em $ServerUrl/health." -ForegroundColor Yellow
    Write-Host "Detalhe: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "Verifique se o Servidor Central está ligado e se o firewall local liberou a porta." -ForegroundColor Yellow
    $confirm = Read-Host "Deseja continuar a instalação mesmo assim? (S/N)"
    if ($confirm -notlike "S*" -and $confirm -notlike "s*") {
        Write-Host "Instalação cancelada pelo usuário." -ForegroundColor Red
        exit 1
    }
}

# 2. Criação do Diretório Seguro
Write-Host "[2/5] Criando diretório de instalação: $InstallDir..." -ForegroundColor Cyan
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
}

# Configuração de ACL restrita: Somente SYSTEM e Administradores com controle total
try {
    $acl = Get-Acl $InstallDir
    $acl.SetAccessRuleProtection($true, $false) # Desabilita herança
    $adminRule = New-Object System.Security.AccessControl.FileSystemAccessRule("Administrators", "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
    $systemRule = New-Object System.Security.AccessControl.FileSystemAccessRule("SYSTEM", "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
    $userRule = New-Object System.Security.AccessControl.FileSystemAccessRule("Users", "ReadAndExecute", "ContainerInherit,ObjectInherit", "None", "Allow")
    $acl.AddAccessRule($adminRule)
    $acl.AddAccessRule($systemRule)
    $acl.AddAccessRule($userRule)
    Set-Acl -Path $InstallDir -AclObject $acl
    Write-Host "Permissões de segurança (ACLs) aplicadas com sucesso." -ForegroundColor Green
} catch {
    Write-Host "[AVISO] Falha ao ajustar permissões ACL: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 3. Cópia dos Arquivos do Agente
Write-Host "[3/5] Copiando arquivos do Agente..." -ForegroundColor Cyan
$sourceAgent = Join-Path $PSScriptRoot "..\agent"

if (Test-Path "$sourceAgent\agent.py") {
    Copy-Item -Path "$sourceAgent\agent.py" -Destination "$InstallDir\agent.py" -Force
}
if (Test-Path "$sourceAgent\windows_service.py") {
    Copy-Item -Path "$sourceAgent\windows_service.py" -Destination "$InstallDir\windows_service.py" -Force
}
if (Test-Path "$sourceAgent\DigitronAgent.exe") {
    Copy-Item -Path "$sourceAgent\DigitronAgent.exe" -Destination "$InstallDir\DigitronAgent.exe" -Force
}

# 4. Escrita do Arquivo de Configuração (config.ini)
Write-Host "[4/5] Gerando arquivo de configuração protegido: $InstallDir\config.ini..." -ForegroundColor Cyan
$configContent = @"
[SERVER]
server_url = $ServerUrl
verify_ssl = True
request_timeout = 10

[AGENT]
heartbeat_interval = 60
log_file = $InstallDir\agent.log
log_level = INFO

[SECURITY]
enrollment_token = $EnrollmentToken
machine_id = 
machine_secret = 
"@
Set-Content -Path "$InstallDir\config.ini" -Value $configContent -Encoding UTF8

# 5. Registro do Serviço do Windows
Write-Host "[5/5] Registrando o serviço 'DigitronMonitorAgent' no Windows..." -ForegroundColor Cyan
$serviceName = "DigitronMonitorAgent"

# Para serviço nativo em python ou executável:
$binaryPath = ""
if (Test-Path "$InstallDir\DigitronAgent.exe") {
    $binaryPath = "`"$InstallDir\DigitronAgent.exe`""
} else {
    $pythonExe = (Get-Command python -ErrorAction SilentlyContinue).Source
    if (-not $pythonExe) {
        $pythonExe = "C:\Windows\py.exe"
    }
    # Executa com pythonw (sem janela de terminal)
    $pythonwExe = $pythonExe.Replace("python.exe", "pythonw.exe")
    if (Test-Path $pythonwExe) {
        $binaryPath = "`"$pythonwExe`" `"$InstallDir\agent.py`""
    } else {
        $binaryPath = "`"$pythonExe`" `"$InstallDir\agent.py`""
    }
}

# Remove serviço existente se houver
$existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "Interrompendo serviço existente..." -ForegroundColor Yellow
    Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    sc.exe delete $serviceName | Out-Null
    Start-Sleep -Seconds 2
}

# Cria serviço via sc.exe ou New-Service
# Utiliza PowerShell Task Scheduler ou sc.exe
$scCreate = sc.exe create $serviceName binPath= $binaryPath start= auto DisplayName= "DIGI-TRON Monitor - Agente de Rede Corporativa"
Write-Host "Saída sc.exe: $scCreate" -ForegroundColor DarkGray

# Configura recuperação automática caso o serviço falhe
sc.exe failure $serviceName reset= 86400 actions= restart/10000/restart/30000/restart/60000 | Out-Null
sc.exe description $serviceName "Agente corporativo de inventário e saúde de hardware para DIGI-TRON Balanças." | Out-Null

# Inicia o serviço
Write-Host "Iniciando o serviço $serviceName..." -ForegroundColor Cyan
Start-Service -Name $serviceName -ErrorAction SilentlyContinue

Start-Sleep -Seconds 3
$svcStatus = Get-Service -Name $serviceName -ErrorAction SilentlyContinue

if ($svcStatus -and $svcStatus.Status -eq "Running") {
    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "   Agente DIGI-TRON instalado e EM EXECUÇÃO com sucesso!  " -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "Status: $($svcStatus.Status)" -ForegroundColor Green
    Write-Host "Configuração: $InstallDir\config.ini" -ForegroundColor White
    Write-Host "Log de Operação: $InstallDir\agent.log" -ForegroundColor White
    Write-Host "O computador deve aparecer no Painel Central dentro de 60 segundos." -ForegroundColor Yellow
} else {
    Write-Host "[AVISO] O serviço foi registrado mas precisa ser iniciado manualmente ou executado como script." -ForegroundColor Yellow
    Write-Host "Você pode testar a execução direta com: python `"$InstallDir\agent.py`" --run-once" -ForegroundColor Cyan
}
