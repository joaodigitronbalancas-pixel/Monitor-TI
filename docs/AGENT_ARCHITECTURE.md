# Arquitetura do Agente e Diretrizes de Privacidade - DIGI-TRON Monitor

## Princípios de Projeto

O **DIGI-TRON Agent** foi desenvolvido seguindo rigorosos padrões de segurança corporativa, transparência e respeito à privacidade do usuário:

1. **Estritamente Não-Invasivo:**
   - **NÃO** captura telas ou atividade visual.
   - **NÃO** intercepta digitação de teclas (sem keylogger).
   - **NÃO** lê mensagens pessoais, e-mails, arquivos ou histórico de navegação.
   - **NÃO** possui capacidades de execução remota de código arbitrário originado do servidor.

2. **Visibilidade do Administrador:**
   - O agente **NÃO se oculta** de ferramentas nativas do Windows.
   - É visível em `services.msc` sob o nome `DigitronMonitorAgent`.
   - É visível no **Gerenciador de Tarefas** (`Task Manager`).
   - Não desativa ou tenta evadir antivírus corporativos (Windows Defender, CrowdStrike, Kaspersky, etc.).

3. **Autenticação Forte e Segredo Único por Máquina:**
   - A matrícula inicial requer um `EnrollmentToken` gerado pelo administrador no painel.
   - Após a validação, o servidor gera uma chave de 256 bits (`machine_secret`) única para aquela instalação.
   - Todas as transmissões subsequentes utilizam o cabeçalho `Authorization: Bearer <machine_secret>` acompanhado de `X-Machine-ID: <machine_id>`.
   - O servidor valida o hash SHA-256 da chave a cada requisição.

4. **Tratamento de Quedas de Rede e Resiliência:**
   - Caso o servidor central fique temporariamente inacessível, o agente registra o erro no log local (`agent.log`) e entra em modo de espera com retentativas progressivas (10s, 20s, até o intervalo normal de 60s).
   - Assim que o link ou o servidor retorna, a comunicação é restabelecida imediatamente, e o painel atualiza a máquina para **ONLINE**.

5. **Consumo de Recursos:**
   - CPU: Pico inferior a 0.5% a cada 60 segundos durante a coleta.
   - RAM: Em torno de 18 MB a 24 MB em repouso.
   - Disco: Arquivo de log com rotação automática limitada a 5 MB (máximo de 3 arquivos).
