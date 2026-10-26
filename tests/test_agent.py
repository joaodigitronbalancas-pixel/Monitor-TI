"""
Testes unitários da lógica interna do Agente Windows DIGI-TRON.
Valida coleta não-invasiva, serialização de telemetria e integridade de configuração.
"""

import unittest
import os
import sys

# Add agent path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "agent")))
from agent import DigitronAgent

class TestDigitronAgentUnit(unittest.TestCase):
    def setUp(self):
        self.agent = DigitronAgent()

    def test_collect_telemetry_fields(self):
        """Verifica se todos os campos de saúde exigidos são coletados."""
        data = self.agent.collect_telemetry()

        self.assertIn("hostname", data)
        self.assertIn("logged_user", data)
        self.assertIn("ip_address", data)
        self.assertIn("os_name", data)
        self.assertIn("cpu_usage_pct", data)
        self.assertIn("ram_total_gb", data)
        self.assertIn("ram_usage_pct", data)
        self.assertIn("disk_total_gb", data)
        self.assertIn("disk_usage_pct", data)
        self.assertIn("uptime_seconds", data)
        self.assertIn("agent_version", data)

        # Sanity checks on hardware ranges
        self.assertGreaterEqual(data["cpu_usage_pct"], 0.0)
        self.assertLessEqual(data["cpu_usage_pct"], 100.0)
        self.assertGreaterEqual(data["ram_usage_pct"], 0.0)
        self.assertLessEqual(data["ram_usage_pct"], 100.0)
        self.assertGreater(data["ram_total_gb"], 0.0)
        self.assertGreaterEqual(data["uptime_seconds"], 0)

    def test_privacy_boundary(self):
        """Assegura estritamente que nenhum dado invasivo é incluído no dicionário."""
        data = self.agent.collect_telemetry()

        forbidden_keys = [
            "password", "senha", "keystroke", "teclas", "screen",
            "screenshot", "tela", "browser_history", "email", "messages"
        ]
        for key in forbidden_keys:
            self.assertNotIn(key, data, f"Chave proibida de privacidade detectada: {key}")

if __name__ == "__main__":
    unittest.main()
