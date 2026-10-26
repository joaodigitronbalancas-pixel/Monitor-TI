<#
.SYNOPSIS
    Configurador de Firewall Corporativo para DIGI-TRON Monitor.
.DESCRIPTION
    Aplica regras no Windows Defender Firewall com Segurança Avançada
    garantindo que somente conexões de redes corporativas/privadas
    tenham acesso à porta do servidor, bloqueando redes públicas.
#>

param (
    [int]$Port = 8000,
    [string]$ServerRuleName = "DIGI-TRON Monitor - Servidor Central (TCP In)",
    [string]$AgentRuleName = "DIGI-TRON Monitor - Agente Outbound (TCP Out)"
)

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[ERRO] Este script requer privilégios de Administrador." -ForegroundColor Red
    exit 1
}

Write-Host "Configurando regras corporativas do Windows Defender Firewall..." -ForegroundColor Cyan

# 1. Regra Inbound para o Servidor (Somente Domain e Private)
Remove-NetFirewallRule -DisplayName $ServerRuleName -ErrorAction SilentlyContinue

New-NetFirewallRule -DisplayName $ServerRuleName `
    -Direction Inbound `
    -LocalPort $Port `
    -Protocol TCP `
    -Action Allow `
    -Profile Domain, Private `
    -Description "Permite que agentes da rede corporativa transmitam telemetria e heartbeats ao Servidor Central DIGI-TRON." | Out-Null

Write-Host "Regra de Entrada (Inbound) criada: Porta $Port permitida em Domínio e Rede Privada." -ForegroundColor Green

# 2. Regra Outbound para o Agente (Opcional se firewall de saída for restritivo)
Remove-NetFirewallRule -DisplayName $AgentRuleName -ErrorAction SilentlyContinue

New-NetFirewallRule -DisplayName $AgentRuleName `
    -Direction Outbound `
    -RemotePort $Port `
    -Protocol TCP `
    -Action Allow `
    -Profile Domain, Private `
    -Description "Permite que o Agente DIGI-TRON envie telemetria para o Servidor Central." | Out-Null

Write-Host "Regra de Saída (Outbound) criada com sucesso." -ForegroundColor Green
