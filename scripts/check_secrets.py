"""Reject provider keys and deployment environment dumps without printing values."""

from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
PATTERNS = {
    "Google API key": re.compile(rb"AIza[0-9A-Za-z_-]{35}"),
    "deployment credential value": re.compile(
        rb'"name"\s*:\s*"(?:API_KEY|GEMINI_API_KEY|APP_PASSWORD|SMTP_PASS|JWT_SECRET(?:_KEY)?|RESEND_API_KEY)"'
        rb'\s*,\s*"value"\s*:\s*"[^"\s][^"]*"'
    ),
}


def main() -> int:
    files = subprocess.check_output(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"], cwd=ROOT,
    ).decode().split("\0")
    failures = []
    for name in files:
        path = ROOT / name
        if not name or not path.is_file():
            continue
        data = path.read_bytes()
        for label, pattern in PATTERNS.items():
            for match in pattern.finditer(data):
                line = data[:match.start()].count(b"\n") + 1
                failures.append(f"{name}:{line}: {label} (value redacted)")
    if failures:
        print("\n".join(failures), file=sys.stderr)
        return 1
    print("Credential checks passed; no provider keys or deployment credential dumps found.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
