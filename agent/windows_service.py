"""
DIGI-TRON Monitor - Windows Service Wrapper
-------------------------------------------
Permite registrar e executar o agente nativamente como Serviço do Windows.
Nome do Serviço: DigitronMonitorAgent
Nome de Exibição: DIGI-TRON Monitor - Agente de Rede Corporativa
"""

import sys
import os
import time

try:
    import win32serviceutil
    import win32service
    import win32event
    import servicemanager
    import socket
except ImportError:
    win32serviceutil = None

# Import core agent logic
from agent import DigitronAgent

class DigitronWindowsService(win32serviceutil.ServiceFramework if win32serviceutil else object):
    _svc_name_ = "DigitronMonitorAgent"
    _svc_display_name_ = "DIGI-TRON Monitor - Agente de Rede Corporativa"
    _svc_description_ = (
        "Monitora parâmetros de integridade de hardware e sistema operacional da máquina corporativa "
        "e reporta ao Servidor Central DIGI-TRON Balanças."
    )

    def __init__(self, args):
        if win32serviceutil:
            win32serviceutil.ServiceFramework.__init__(self, args)
            self.hWaitStop = win32event.CreateEvent(None, 0, 0, None)
            socket.setdefaulttimeout(30)
            self.is_alive = True

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        win32event.SetEvent(self.hWaitStop)
        self.is_alive = False

    def SvcDoRun(self):
        servicemanager.LogMsg(
            servicemanager.EVENTLOG_INFORMATION_TYPE,
            servicemanager.PYS_SERVICE_STARTED,
            (self._svc_name_, "")
        )
        self.main()

    def main(self):
        # Locate config from standard ProgramData directory
        program_data = os.path.join(os.environ.get("ProgramData", "C:\\ProgramData"), "DigitronMonitor")
        config_path = os.path.join(program_data, "config.ini")
        agent = DigitronAgent(config_path=config_path)

        while self.is_alive:
            try:
                agent.send_heartbeat()
            except Exception as e:
                agent.logger.error(f"Erro no ciclo do serviço: {e}")

            # Wait for heartbeat_interval or service stop event
            wait_result = win32event.WaitForSingleObject(
                self.hWaitStop,
                agent.heartbeat_interval * 1000
            )
            if wait_result == win32event.WAIT_OBJECT_0:
                break

if __name__ == "__main__":
    if win32serviceutil:
        win32serviceutil.HandleCommandLine(DigitronWindowsService)
    else:
        print("Módulo pywin32 não disponível. Use o script com Python padrão ou utilize o instalador com NSSM.")
        sys.exit(1)
