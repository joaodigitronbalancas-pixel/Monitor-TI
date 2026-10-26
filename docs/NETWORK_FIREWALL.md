# Arquitetura e Configurações de Rede e Firewall - DIGI-TRON Monitor

## Topologia de Rede

O **DIGI-TRON Monitor** adota uma arquitetura em estrela (Hub-and-Spoke), onde todas as requisições partem exclusivamente dos **Agentes em direção ao Servidor Central** (comunicação estritamente *outbound* a partir das estações de trabalho).

Isso elimina a necessidade de abrir qualquer porta de escuta nos computadores monitorados, elevando a segurança da infraestrutura corporativa.

```
       [ Computador TI - Servidor Central ]
           (Porta 8000/3000 Inbound)
                     ^
                     | (HTTP / HTTPS Heartbeat a cada 60s)
      +--------------+--------------+
      |                             |
[ Máquina Prod-01 ]          [ Máquina Vendas-03 ]
(Sem portas abertas)         (Sem portas abertas)
```

## Requisitos de Portas

| Origem | Destino | Porta / Protocolo | Finalidade |
| :--- | :--- | :--- | :--- |
| Agentes (Estações de Trabalho) | Servidor Central | 8000 (ou 3000) / TCP | Envio de telemetria e heartbeats |
| Navegadores dos Administradores | Servidor Central | 8000 (ou 3000) / TCP | Acesso ao Painel Web |

## Configuração do Firewall do Windows

Para garantir que o painel e os serviços não fiquem expostos a redes desprotegidas:

1. **Perfil de Rede:**
   Configure a interface de rede do servidor como **Rede Privada** ou **Rede de Domínio (Active Directory)**.
   *Nunca utilize o perfil de Rede Pública no servidor corporativo*.

2. **Regra de Entrada (Inbound Rule):**
   ```powershell
   New-NetFirewallRule -DisplayName "DIGI-TRON Monitor Server" `
       -Direction Inbound `
       -LocalPort 8000 `
       -Protocol TCP `
       -Action Allow `
       -Profile Domain, Private
   ```

3. **Sub-redes e VLANs:**
   Se sua empresa utiliza VLANs separadas (ex: VLAN 10 para Administração, VLAN 20 para Chão de Fábrica), certifique-se de que o roteador/switch L3 permita tráfego originado na VLAN dos agentes com destino à porta TCP 8000 na VLAN do servidor.
