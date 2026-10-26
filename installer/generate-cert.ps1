<#
.SYNOPSIS
    Gera certificado SSL autoassinado confiável para o Servidor DIGI-TRON Monitor.
.DESCRIPTION
    Cria certificado X.509 com Subject Alternative Names (SAN) contendo o nome DNS
    e os endereços IP da máquina servidora, instalando no Trusted Root Certification Authorities.
#>

param (
    [string]$DnsName = "monitor.digitron.local",
    [int]$ValidityYears = 5
)

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[ERRO] Este script requer privilégios de Administrador." -ForegroundColor Red
    exit 1
}

Write-Host "Gerando certificado corporativo para HTTPS..." -ForegroundColor Cyan

# Obtém IPs locais para incluir nos Subject Alternative Names
$ipList = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" }).IPAddress
$dnsList = @($DnsName, "localhost", $env:COMPUTERNAME)

$cert = New-SelfSignedCertificate `
    -DnsName $dnsList `
    -CertStoreLocation "Cert:\LocalMachine\My" `
    -NotAfter (Get-Date).AddYears($ValidityYears) `
    -FriendlyName "DIGI-TRON Monitor SSL Certificate" `
    -KeyUsage DigitalSignature, KeyEncipherment `
    -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.1")

Write-Host "Certificado gerado com Thumbprint: $($cert.Thumbprint)" -ForegroundColor Green

# Exporta certificado público para distribuição aos agentes
$outPath = "C:\DigitronMonitor\digitron_ca.crt"
if (-not (Test-Path "C:\DigitronMonitor")) {
    New-Item -ItemType Directory -Force -Path "C:\DigitronMonitor" | Out-Null
}

Export-Certificate -Cert $cert -FilePath $outPath | Out-Null
Write-Host "Certificado público exportado para: $outPath" -ForegroundColor Green
Write-Host "Copie este arquivo para as estações clientes e aponte no config.ini em 'verify_ssl = C:\DigitronMonitor\digitron_ca.crt'." -ForegroundColor Yellow
