<#
.SYNOPSIS
    Desinstalador do Agente DIGI-TRON Monitor para Windows.
.DESCRIPTION
    Interrompe e remove o serviço do Windows, remove as chaves de registro e limpa os arquivos.
#>

param (
    [string]$InstallDir = "C:\ProgramData\DigitronMonitor",
    [switch]$KeepLogs = $false
)

# Verifica privilégios de Administrador
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[ERRO] Este script requer privilégios de Administrador." -ForegroundColor Red
    exit 1
}

$serviceName = "DigitronMonitorAgent"

Write-Host "==========================================================" -ForegroundColor Red
Write-Host "    DIGI-TRON Monitor - Desinstalação do Agente Windows    " -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Red

# 1. Interrompe o Serviço
Write-Host "[1/3] Parando serviço '$serviceName'..." -ForegroundColor Cyan
Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# 2. Remove o Serviço do Windows
Write-Host "[2/3] Removendo registro do serviço no Windows..." -ForegroundColor Cyan
sc.exe delete $serviceName | Out-Null
Start-Sleep -Seconds 2

# 3. Limpeza de Arquivos
Write-Host "[3/3] Limpando diretório de instalação..." -ForegroundColor Cyan
if (Test-Path $InstallDir) {
    if ($KeepLogs) {
        Get-ChildItem -Path $InstallDir -Exclude "agent.log*" | Remove-Item -Recurse -Force
        Write-Host "Arquivos de log mantidos em $InstallDir para auditoria." -ForegroundColor Yellow
    } else {
        Remove-Item -Path $InstallDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "   Agente DIGI-TRON desinstalado com sucesso da máquina.  " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
