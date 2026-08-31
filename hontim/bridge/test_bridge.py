import json
import os
import unittest
from unittest.mock import AsyncMock, patch

os.environ.setdefault("HONTIM_BRIDGE_TOKEN", "test-token")

from bridge import hontim_bridge as bridge


class BridgeTests(unittest.IsolatedAsyncioTestCase):
    def test_request_rejects_duplicate_auxiliaries(self):
        row = bridge.OrchestrationRequest(task="충분히 긴 테스트", auxiliaries=["gemini", "gemini", "zai"])
        self.assertEqual(row.auxiliaries, ["gemini", "zai"])

    async def test_status_redacts_account_identity(self):
        async def fake_run(args, cwd, timeout=300, combine_output=False):
            if args[0] == "codex":
                return "Logged in using ChatGPT"
            return json.dumps({"loggedIn": True, "subscriptionType": "pro", "email": "secret@example.com"})
        with patch.object(bridge, "_run", side_effect=fake_run), patch.object(bridge.shutil, "which", return_value="/bin/tool"):
            status = await bridge.provider_status()
        self.assertTrue(status["codex"]["connected"])
        self.assertTrue(status["claude"]["connected"])
        self.assertNotIn("secret@example.com", json.dumps(status))

    async def test_main_and_secondary_are_symmetric(self):
        calls = []
        async def fake_cli(provider, prompt, workspace, mode="plan"):
            calls.append((provider, mode))
            return f"{provider}-{mode}-result"
        with patch.object(bridge, "invoke_cli", side_effect=fake_cli):
            result = await bridge.orchestrate(bridge.OrchestrationRequest(task="대칭 역할을 검증하라", main="claude"))
        self.assertEqual(result["main"], "claude")
        self.assertEqual(result["secondary"], "codex")
        self.assertEqual(calls, [("claude", "plan"), ("codex", "plan"), ("claude", "plan")])

    async def test_execute_only_applies_to_first_main_call(self):
        calls = []
        async def fake_cli(provider, prompt, workspace, mode="plan"):
            calls.append((provider, mode))
            return "ok"
        with patch.object(bridge, "invoke_cli", side_effect=fake_cli):
            await bridge.orchestrate(bridge.OrchestrationRequest(task="파일을 수정하고 검증하라", mode="execute"))
        self.assertEqual(calls, [("codex", "execute"), ("claude", "plan"), ("codex", "plan")])


if __name__ == "__main__":
    unittest.main()
