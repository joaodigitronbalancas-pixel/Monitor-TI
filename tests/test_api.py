import unittest
import json
import time

try:
    import requests
except ImportError:
    requests = None

import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:3000/api/v1"

def api_call(path, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    if data is not None:
        headers["Content-Type"] = "application/json"
    
    url = f"{BASE_URL}{path}"
    data_bytes = json.dumps(data).encode("utf-8") if data is not None else None

    req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode("utf-8")
            return resp.getcode(), json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            parsed = json.loads(body)
        except Exception:
            parsed = {}
        return e.code, parsed
    except Exception as e:
        return 0, {"error": str(e)}

class TestDigitronMonitorAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        status, data = api_call("/auth/login", method="POST", data={
            "username": "admin",
            "password": "Admin@Digitron2026!"
        })
        if status == 200:
            cls.token = data.get("token")
            cls.headers = {"Authorization": f"Bearer {cls.token}"}
        else:
            cls.token = None
            cls.headers = {}

    def test_01_health_check(self):
        """Verifica se a API ou servidor responde normalmente."""
        status, data = api_call("/computers", headers=self.headers)
        self.assertEqual(status, 200)
        self.assertIn("computers", data)
        self.assertIn("stats", data)

    def test_02_login_invalid_password(self):
        """Valida que senhas incorretas são rejeitadas com HTTP 401."""
        status, data = api_call("/auth/login", method="POST", data={
            "username": "admin",
            "password": "SenhaCompletamenteIncorreta!"
        })
        self.assertEqual(status, 401)

    def test_03_agent_registration_and_heartbeat_flow(self):
        """
        Testa o fluxo completo do protocolo:
        1. Criação de token de matrícula
        2. Registro do agente com o token
        3. Envio de telemetria autenticada via heartbeat
        4. Verificação no inventário de computadores
        """
        # 1. Cria token
        status, token_data = api_call(
            "/tokens",
            method="POST",
            data={"sector": "Calibração & Qualidade", "description": "Teste Unitário Automatizado"},
            headers=self.headers
        )
        self.assertEqual(status, 201)
        enrollment_token = token_data["token"]["token"]

        # 2. Registra agente
        test_hostname = f"TEST-PC-{int(time.time())}"
        reg_status, reg_data = api_call(
            "/agent/register",
            method="POST",
            data={
                "enrollment_token": enrollment_token,
                "hostname": test_hostname,
                "mac_address": "AA:BB:CC:11:22:33",
                "os_name": "Windows 11 Pro",
                "cpu_cores": 8,
                "ram_total_gb": 16.0,
                "disk_total_gb": 500.0
            }
        )
        self.assertEqual(reg_status, 201)
        machine_id = reg_data["machine_id"]
        machine_secret = reg_data["machine_secret"]

        # 3. Envia Heartbeat autenticado
        hb_headers = {
            "Authorization": f"Bearer {machine_secret}",
            "X-Machine-ID": machine_id
        }
        hb_status, hb_res = api_call(
            "/agent/heartbeat",
            method="POST",
            data={
                "machine_id": machine_id,
                "hostname": test_hostname,
                "logged_user": "operador.teste",
                "ip_address": "192.168.1.99",
                "cpu_usage_pct": 25.5,
                "ram_total_gb": 16.0,
                "ram_used_gb": 6.4,
                "ram_usage_pct": 40.0,
                "disk_total_gb": 500.0,
                "disk_used_gb": 120.0,
                "disk_usage_pct": 24.0,
                "uptime_seconds": 3600,
                "agent_version": "1.2.0",
                "agent_status": "running"
            },
            headers=hb_headers
        )
        self.assertEqual(hb_status, 200)

        # 4. Verifica se a máquina aparece na lista com status online
        list_status, list_data = api_call(f"/computers?search={test_hostname}", headers=self.headers)
        self.assertEqual(list_status, 200)
        comps = list_data["computers"]
        self.assertTrue(len(comps) >= 1)
        self.assertEqual(comps[0]["hostname"], test_hostname)
        self.assertEqual(comps[0]["status"], "online")
        self.assertEqual(comps[0]["logged_user"], "operador.teste")

if __name__ == "__main__":
    unittest.main()
