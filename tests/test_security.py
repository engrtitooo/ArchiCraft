"""Offline boundary tests. All credentials, messages and provider results are synthetic."""

import asyncio
import base64
from contextlib import redirect_stdout, nullcontext
from datetime import datetime, timedelta, timezone
import hashlib
import io
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import AsyncMock, patch

import httpx
import jwt
from fastapi import HTTPException
from fastapi.testclient import TestClient

from backend import auth, email_dispatcher, gemini, main, security_config

SIGNING_KEY = "synthetic-test-signing-key-" * 3
PASSWORD = "synthetic-admin-password-only"
API_KEY = "synthetic-provider-credential-only"
TEXT_REQUEST = {
    "model": "gemini-2.5-flash",
    "contents": {"parts": [{"text": "Create a concept plan"}]},
    "config": {
        "systemInstruction": "Architectural planning instructions",
        "temperature": 0.1,
        "responseMimeType": "application/json",
        "responseSchema": {"type": "OBJECT", "properties": {"rooms": {"type": "ARRAY"}}},
    },
}
PROVIDER_RESULT = {"candidates": [{"content": {"parts": [{"text": '{"rooms":[]}'}]}}]}


class BoundaryTests(unittest.TestCase):
    def setUp(self):
        self.environment = patch.dict(os.environ, {
            "JWT_SECRET": SIGNING_KEY, "APP_PASSWORD": PASSWORD,
            "GEMINI_API_KEY": API_KEY,
        }, clear=True)
        self.environment.start()
        self.admin = patch.object(main, "ADMIN_EMAIL", "admin@example.test")
        self.admin.start()
        self.limiter = patch.object(main.limiter, "enabled", False)
        self.limiter.start()
        main.otp_store.clear()
        self.client = TestClient(main.app)
        self.provider = patch("backend.gemini.httpx.AsyncClient")
        self.factory = self.provider.start()
        self.upstream = self.factory.return_value.__aenter__.return_value
        self.upstream.post = AsyncMock(return_value=httpx.Response(200, json=PROVIDER_RESULT))

    def tearDown(self):
        self.client.close()
        self.provider.stop()
        self.limiter.stop()
        self.admin.stop()
        self.environment.stop()

    def authenticate(self):
        self.client.cookies.set(auth.SESSION_COOKIE_NAME, auth.create_session_token({"sub": "admin"}))

    def test_anonymous_generation_cannot_reach_provider(self):
        response = self.client.post("/api/gemini/generate", json=TEXT_REQUEST)
        self.assertEqual(response.status_code, 401)
        self.upstream.post.assert_not_called()

    def test_invalid_expired_unscoped_and_legacy_sessions_are_rejected(self):
        expiry = datetime.now(timezone.utc) + timedelta(minutes=5)
        tokens = [
            "not-a-token",
            jwt.encode({"sub": "admin", "exp": expiry}, "unrelated-signing-key-" * 3, algorithm="HS256"),
            jwt.encode({"sub": "admin", "exp": datetime.now(timezone.utc) - timedelta(minutes=1)}, SIGNING_KEY, algorithm="HS256"),
            jwt.encode({"sub": "other-user", "exp": expiry}, SIGNING_KEY, algorithm="HS256"),
            jwt.encode({"sub": "admin"}, SIGNING_KEY, algorithm="HS256"),
        ]
        for token in tokens:
            with self.subTest(token_kind=tokens.index(token)):
                self.client.cookies.clear()
                self.client.cookies.set(auth.SESSION_COOKIE_NAME, token)
                self.assertEqual(self.client.post("/api/gemini/generate", json=TEXT_REQUEST).status_code, 401)
        self.client.cookies.clear()
        self.client.cookies.set("archicraft_session_v3", auth.create_session_token({"sub": "admin"}))
        self.assertEqual(self.client.post("/api/gemini/generate", json=TEXT_REQUEST).status_code, 401)
        self.upstream.post.assert_not_called()

    def test_missing_and_unsafe_signing_configuration_fails_closed(self):
        self.authenticate()
        for value in ("", "short", "default_secret_key_for_local_dev"):
            with self.subTest(configuration=value), patch.dict(os.environ, {"JWT_SECRET": value}):
                response = self.client.post("/api/gemini/generate", json=TEXT_REQUEST)
                self.assertEqual(response.status_code, 503)
                with self.assertRaises(HTTPException):
                    auth.create_session_token({"sub": "admin"})
        self.upstream.post.assert_not_called()

    def test_disclosed_fingerprints_and_spaced_equivalents_are_rejected(self):
        compromised = "synthetic_compromised_credential"
        digest = hashlib.sha256(compromised.encode()).hexdigest()
        with patch.object(security_config, "COMPROMISED_SECRET_HASHES", {digest}):
            for value in (compromised, "synthetic_ compromised_ credential"):
                with patch.dict(os.environ, {"GEMINI_API_KEY": value, "API_KEY": API_KEY}):
                    with self.assertRaises(security_config.SecretConfigurationError):
                        security_config.read_secret("GEMINI_API_KEY", "API_KEY")

    def test_successful_password_otp_session_and_generation(self):
        with patch.object(main, "send_otp_email", new=AsyncMock(return_value=True)) as delivery:
            response = self.client.post("/api/verify-access", json={"password": PASSWORD})
            self.assertEqual(response.status_code, 200)
            sent_otp = delivery.await_args.args[1]
            self.assertEqual(len(sent_otp), 6)
            self.assertTrue(sent_otp.isdigit())
            self.assertNotIn(sent_otp, response.text)
        response = self.client.post("/api/verify-2fa", json={"otp": sent_otp})
        self.assertEqual(response.status_code, 200)
        self.assertIn("HttpOnly", response.headers["set-cookie"])
        self.assertIn("SameSite=strict", response.headers["set-cookie"])
        response = self.client.post("/api/gemini/generate", json=TEXT_REQUEST)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), PROVIDER_RESULT)
        self.assertEqual(response.headers["cache-control"], "no-store")
        self.assertIn(auth.SESSION_COOKIE_NAME, response.headers["set-cookie"])
        args, kwargs = self.upstream.post.call_args
        self.assertEqual(args[0], "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent")
        self.assertEqual(kwargs["headers"], {"x-goog-api-key": API_KEY})
        self.assertNotIn(API_KEY, args[0])
        self.assertEqual(kwargs["json"]["contents"], [{"role": "user", **TEXT_REQUEST["contents"]}])
        self.assertEqual(kwargs["json"]["systemInstruction"], {"parts": [{"text": TEXT_REQUEST["config"]["systemInstruction"]}]})
        self.assertNotIn("systemInstruction", kwargs["json"]["generationConfig"])
        self.assertFalse(self.factory.call_args.kwargs["follow_redirects"])

    def test_failed_email_does_not_leave_a_usable_otp(self):
        with patch.object(main, "send_otp_email", new=AsyncMock(return_value=False)):
            self.assertEqual(self.client.post("/api/verify-access", json={"password": PASSWORD}).status_code, 503)
        self.assertEqual(main.otp_store, {})
        self.assertEqual(self.client.post("/api/verify-2fa", json={"otp": "123456"}).status_code, 400)

    def test_wrong_password_cannot_send_email(self):
        with patch.object(main, "send_otp_email", new=AsyncMock()) as delivery:
            self.assertEqual(self.client.post("/api/verify-access", json={"password": "wrong"}).status_code, 401)
            delivery.assert_not_awaited()

    def test_provider_alias_works_and_missing_key_is_rejected(self):
        self.authenticate()
        with patch.dict(os.environ, {"GEMINI_API_KEY": "", "API_KEY": API_KEY}):
            self.assertEqual(self.client.post("/api/gemini/generate", json=TEXT_REQUEST).status_code, 200)
        self.upstream.post.reset_mock()
        with patch.dict(os.environ, {"GEMINI_API_KEY": "", "API_KEY": ""}):
            self.assertEqual(self.client.post("/api/gemini/generate", json=TEXT_REQUEST).status_code, 503)
        self.upstream.post.assert_not_called()

    def test_model_configuration_and_content_injection_are_rejected(self):
        self.authenticate()
        malicious = [
            {**TEXT_REQUEST, "model": "../../other-provider"},
            {**TEXT_REQUEST, "apiKey": "must-not-be-echoed"},
            {**TEXT_REQUEST, "url": "https://example.test"},
            {**TEXT_REQUEST, "config": {"httpOptions": {"headers": {"x-key": "must-not-be-echoed"}}}},
            {**TEXT_REQUEST, "config": {"tools": [{"codeExecution": {}}]}},
            {**TEXT_REQUEST, "contents": {"parts": [{"fileData": {"fileUri": "https://example.test"}}]}},
            {**TEXT_REQUEST, "contents": {"parts": [{"text": "x", "inlineData": {"mimeType": "image/png", "data": "invalid"}}]}},
            {**TEXT_REQUEST, "contents": {"parts": [{"inlineData": {"mimeType": "image/png", "data": "invalid"}}]}},
        ]
        for value in malicious:
            with self.subTest(shape=malicious.index(value)):
                response = self.client.post("/api/gemini/generate", json=value)
                self.assertEqual(response.status_code, 422)
                self.assertNotIn("must-not-be-echoed", response.text)
        self.upstream.post.assert_not_called()

    def test_image_operations_preserve_supported_formats_and_response(self):
        self.authenticate()
        image_result = {"candidates": [{"content": {"parts": [{"inlineData": {"mimeType": "image/png", "data": "synthetic-image"}}]}}]}
        self.upstream.post.return_value = httpx.Response(200, json=image_result)
        for content, actual_type in ((b"\x89PNG\r\n\x1a\nfixture", "image/png"), (b"\xff\xd8\xfffixture", "image/jpeg"), (b"RIFF0000WEBPfixture", "image/webp")):
            with self.subTest(format=actual_type):
                data = {"model": "gemini-3-pro-image-preview", "contents": {"parts": [{"inlineData": {"mimeType": "image/png", "data": base64.b64encode(content).decode()}}, {"text": "Render this plan"}]}}
                response = self.client.post("/api/gemini/generate", json=data)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json(), image_result)
                self.assertEqual(self.upstream.post.call_args.kwargs["json"]["contents"][0]["parts"][0]["inlineData"]["mimeType"], actual_type)

    def test_provider_errors_and_redirects_do_not_expose_provider_bodies(self):
        self.authenticate()
        for upstream_status, expected in ((401, 503), (403, 503), (429, 429), (500, 502), (302, 502)):
            with self.subTest(status=upstream_status):
                self.upstream.post.return_value = httpx.Response(upstream_status, text="provider-secret-must-not-leak")
                with self.assertLogs("backend.gemini", level="WARNING") if expected == 502 else nullcontext():
                    response = self.client.post("/api/gemini/generate", json=TEXT_REQUEST)
                self.assertEqual(response.status_code, expected)
                self.assertNotIn("provider-secret", response.text)
                self.assertNotIn(API_KEY, response.text)

    def test_provider_timeouts_are_sanitized(self):
        self.authenticate()
        self.upstream.post.side_effect = httpx.ReadTimeout("sensitive provider context")
        response = self.client.post("/api/gemini/generate", json=TEXT_REQUEST)
        self.assertEqual(response.status_code, 504)
        self.assertNotIn("sensitive", response.text)

    def test_json_only_and_chunked_request_size_limit(self):
        self.authenticate()
        self.assertEqual(self.client.post("/api/gemini/generate", content="{}", headers={"Content-Type": "text/plain"}).status_code, 415)
        with patch.object(gemini, "MAX_REQUEST_BYTES", 32):
            response = self.client.post("/api/gemini/generate", content=iter([b"x" * 20, b"y" * 20]), headers={"Content-Type": "application/json"})
            self.assertEqual(response.status_code, 413)
        self.upstream.post.assert_not_called()

    def test_generation_rate_limit_stops_extra_provider_calls(self):
        self.authenticate()
        with patch.object(main.limiter, "enabled", True):
            main.limiter.reset()
            results = [self.client.post("/api/gemini/generate", json=TEXT_REQUEST).status_code for _ in range(7)]
            self.assertEqual(results, [200] * 6 + [429])
            self.assertEqual(self.upstream.post.call_count, 6)
            main.limiter.reset()

    def test_frontend_cannot_serve_files_outside_build_directory(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary) / "frontend"
            root.mkdir()
            outside = Path(temporary) / "runtime-secret"
            outside.write_text("synthetic-private-value")
            (root / "escape").symlink_to(outside)
            with patch.object(main, "DIST", root):
                self.assertEqual(main.frontend_path("index.html"), root / "index.html")
                for path in ("../runtime-secret", str(outside), "escape"):
                    with self.subTest(path=path), self.assertRaises(HTTPException) as error:
                        main.frontend_path(path)
                    self.assertEqual(error.exception.status_code, 404)


class EmailTests(unittest.TestCase):
    def test_no_provider_does_not_log_code_or_report_success(self):
        output = io.StringIO()
        with patch.dict(os.environ, {}, clear=True), redirect_stdout(output), self.assertLogs("backend.email_dispatcher", level="ERROR") as logs:
            result = asyncio.run(email_dispatcher.send_otp_email("admin@example.test", "123456"))
        self.assertFalse(result)
        self.assertEqual(output.getvalue(), "")
        self.assertNotIn("123456", "".join(logs.output))

    def test_smtp_delivery_success(self):
        with patch.dict(os.environ, {"SMTP_HOST": "smtp.example.test", "SMTP_USER": "admin@example.test", "SMTP_PASS": "synthetic-smtp-credential"}, clear=True), patch.object(email_dispatcher.smtplib, "SMTP") as smtp:
            self.assertTrue(asyncio.run(email_dispatcher.send_otp_email("admin@example.test", "123456")))
            smtp.return_value.__enter__.return_value.send_message.assert_called_once()

    def test_failed_smtp_can_fall_back_to_resend_without_logging_secrets(self):
        with patch.dict(os.environ, {"SMTP_HOST": "smtp.example.test", "SMTP_USER": "admin@example.test", "SMTP_PASS": "synthetic-smtp-credential", "RESEND_API_KEY": "synthetic-resend-credential"}, clear=True), patch.object(email_dispatcher.smtplib, "SMTP", side_effect=RuntimeError("sensitive failure 123456")), patch.object(email_dispatcher.httpx, "AsyncClient") as factory, self.assertLogs("backend.email_dispatcher", level="ERROR") as logs:
            response = httpx.Response(200, json={"id": "synthetic"}, request=httpx.Request("POST", "https://api.resend.com/emails"))
            factory.return_value.__aenter__.return_value.post = AsyncMock(return_value=response)
            self.assertTrue(asyncio.run(email_dispatcher.send_otp_email("admin@example.test", "123456")))
        self.assertNotIn("sensitive", "".join(logs.output))
        self.assertNotIn("123456", "".join(logs.output))

    def test_failed_providers_report_failure_without_logging_codes(self):
        with patch.dict(os.environ, {"RESEND_API_KEY": "synthetic-resend-credential"}, clear=True), patch.object(email_dispatcher.httpx, "AsyncClient") as factory, self.assertLogs("backend.email_dispatcher", level="ERROR") as logs:
            factory.return_value.__aenter__.return_value.post = AsyncMock(side_effect=RuntimeError("sensitive failure 123456"))
            self.assertFalse(asyncio.run(email_dispatcher.send_otp_email("admin@example.test", "123456")))
        self.assertNotIn("sensitive", "".join(logs.output))
        self.assertNotIn("123456", "".join(logs.output))


if __name__ == "__main__":
    unittest.main()
