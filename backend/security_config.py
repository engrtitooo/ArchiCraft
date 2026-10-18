"""Read runtime secrets without accepting credentials disclosed in the July log."""

import hashlib
import os


class SecretConfigurationError(ValueError):
    pass


# SHA-256 fingerprints only; never retain the disclosed credential values.
# Whitespace is removed for comparison because Gmail accepts spaced app passwords.
COMPROMISED_SECRET_HASHES = frozenset({
    "7343f41c51c065345ef8ce32f261191364c81306e9c11bf3eed527beca4d4623",
    "2d6c463653517bbc33522ed103dfd352eac09070af674534afb6afc4606e71c0",
    "3083cea1f6286353307fda3a19132341541b40198f18070f7a964dff3cdd53eb",
    "9a24635eff80a2a9aba8e55d07f3d3aeba3bb64488af05497919e26db935ff25",
})


def read_secret(*names: str, minimum_length: int = 1) -> str:
    value = next((os.environ[name] for name in names if os.environ.get(name)), "")
    normalized = "".join(value.split())
    digest = hashlib.sha256(normalized.encode()).hexdigest()
    if (
        len(normalized) < minimum_length
        or digest in COMPROMISED_SECRET_HASHES
        or normalized == "default_secret_key_for_local_dev"
    ):
        raise SecretConfigurationError("Missing or unsafe runtime credential")
    return value
