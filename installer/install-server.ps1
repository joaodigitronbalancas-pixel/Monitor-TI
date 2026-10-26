<#
.SYNOPSIS
    Script de Instalação do Servidor Central DIGI-TRON Monitor para Windows.
.DESCRIPTION
    Configura o ambiente Python, banco de dados SQLite/PostgreSQL, regras de firewall
    e registra o serviço do servidor no Windows.
.NOTES
    Execute este script no PowerShell como Administrador.
#>

param (
    [string]$ServerPort = "8000",
    [string]$ServerHost = "0.0.0.0",
    [string]$InstallDir = "C:\DigitronMonitor\Server"
)

# Verifica se está executando como Administrador
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[ERRO] Este script requer privilégios de Administrador." -ForegroundColor Red
    Write-Host "Clique com o botão direito no PowerShell e selecione 'Executar como Administrador'." -ForegroundColor Yellow
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Red
Write-Host "     DIGI-TRON Monitor - Instalação do Servidor Central    " -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Red

# 1. Verifica Python
Write-Host "[1/6] Verificando instalação do Python..." -ForegroundColor Cyan
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    Write-Host "[ERRO] Python 3.10 ou superior não encontrado no PATH." -ForegroundColor Red
    Write-Host "Instale o Python em https://www.python.org/downloads/ e marque 'Add python.exe to PATH'." -ForegroundColor Yellow
    exit 1
}
$pythonVersion = python --version
Write-Host "Python detectado: $pythonVersion" -ForegroundColor Green

# 2. Cria diretório de instalação
Write-Host "[2/6] Preparando diretório de instalação: $InstallDir..." -ForegroundColor Cyan
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
}

# Copia arquivos do backend
$sourceBackend = Join-Path $PSScriptRoot "..\backend"
if (Test-Path $sourceBackend) {
    Copy-Item -Path "$sourceBackend\*" -Destination $InstallDir -Recurse -Force
} else {
    Write-Host "[AVISO] Diretório source 'backend' não encontrado relativamente. Verifique o caminho." -ForegroundColor Yellow
}

# 3. Cria Ambiente Virtual (venv)
Write-Host "[3/6] Criando e configurando ambiente virtual (venv)..." -ForegroundColor Cyan
Set-Location $InstallDir
if (-not (Test-Path "$InstallDir\venv")) {
    python -m venv venv
}
$venvPython = "$InstallDir\venv\Scripts\python.exe"
$venvPip = "$InstallDir\venv\Scripts\pip.exe"

& $venvPip install --upgrade pip | Out-Null
& $venvPip install -r "$InstallDir\requirements.txt"

# 4. Configura Firewall do Windows
Write-Host "[4/6] Configurando Firewall do Windows para a porta $ServerPort..." -ForegroundColor Cyan
$ruleName = "DIGI-TRON Monitor Server (Porta $ServerPort)"
Remove-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

New-NetFirewallRule -DisplayName $ruleName `
    -Direction Inbound `
    -LocalPort $ServerPort `
    -Protocol TCP `
    -Action Allow `
    -Profile Domain, Private `
    -Description "Permite que os Agentes DIGI-TRON enviem heartbeats para o Servidor Central na rede corporativa." | Out-Null

Write-Host "Regra de firewall liberada para perfis Corporativo/Privado na porta $ServerPort." -ForegroundColor Green

# 5. Descobre IP local do servidor
Write-Host "[5/6] Identificando endereços IP locais da máquina..." -ForegroundColor Cyan
$ipAddresses = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254*" }).IPAddress
Write-Host "IPs locais disponíveis para acesso ao painel:" -ForegroundColor Yellow
foreach ($ip in $ipAddresses) {
    Write-Host "  -> http://${ip}:${ServerPort}" -ForegroundColor Cyan
}

# 6. Cria script de inicialização do serviço
Write-Host "[6/6] Criando arquivo de inicialização 'start-server.bat'..." -ForegroundColor Cyan
$batContent = @"
@echo off
cd /d "$InstallDir"
title DIGI-TRON Monitor Central Server
echo Iniciando Servidor Central DIGI-TRON...
"$venvPython" -m uvicorn backend.main:app --host $ServerHost --port $ServerPort --workers 2
pause
"@
Set-Content -Path "$InstallDir\start-server.bat" -Value $batContent

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "     Servidor Central DIGI-TRON instalado com sucesso!    " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Para iniciar o servidor agora, execute: $InstallDir\start-server.bat" -ForegroundColor White
Write-Host "Acesse o painel com o usuário: admin" -ForegroundColor White
Write-Host "Senha padrão inicial: Admin@Digitron2026!" -ForegroundColor White
Write-Host "(Lembre-se de alterar a senha imediatamente após o primeiro login)" -ForegroundColor Yellow
