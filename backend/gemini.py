"""Authenticated callers use this fixed provider boundary, never browser API keys."""

import base64
import binascii
import json
import logging
from typing import Literal

import httpx
from fastapi import HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

from backend.security_config import read_secret, SecretConfigurationError

logger = logging.getLogger(__name__)
MAX_REQUEST_BYTES = 18 * 1024 * 1024
MAX_IMAGE_CHARACTERS = 16 * 1024 * 1024


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class InlineImage(StrictModel):
    mimeType: Literal["image/png", "image/jpeg", "image/webp"]
    data: str = Field(min_length=1, max_length=MAX_IMAGE_CHARACTERS)

    @model_validator(mode="after")
    def validate_image(self):
        try:
            image = base64.b64decode(self.data, validate=True)
        except (ValueError, binascii.Error):
            raise ValueError("Invalid image") from None
        # Existing canvas callers supply JPEG while labelling it PNG. Detect the
        # actual supported format instead of forwarding the incorrect label.
        if image.startswith(b"\x89PNG\r\n\x1a\n"):
            self.mimeType = "image/png"
        elif image.startswith(b"\xff\xd8\xff"):
            self.mimeType = "image/jpeg"
        elif image.startswith(b"RIFF") and image[8:12] == b"WEBP":
            self.mimeType = "image/webp"
        else:
            raise ValueError("Unsupported image")
        return self


class ContentPart(StrictModel):
    text: str | None = Field(default=None, min_length=1, max_length=32768)
    inlineData: InlineImage | None = None

    @model_validator(mode="after")
    def exactly_one_part(self):
        if (self.text is None) == (self.inlineData is None):
            raise ValueError("Exactly one content part is required")
        return self


class Content(StrictModel):
    parts: list[ContentPart] = Field(min_length=1, max_length=2)


class GenerationConfig(StrictModel):
    systemInstruction: str | None = Field(default=None, min_length=1, max_length=16384)
    temperature: float | None = Field(default=None, ge=0, le=2)
    responseMimeType: Literal["application/json"] | None = None
    responseSchema: dict | None = None

    @model_validator(mode="after")
    def bounded_schema(self):
        if self.responseSchema is not None:
            if self.responseMimeType != "application/json":
                raise ValueError("JSON response type required")
            if len(json.dumps(self.responseSchema).encode()) > 65536:
                raise ValueError("Schema is too large")
        return self


class GenerateRequest(StrictModel):
    model: Literal["gemini-2.5-flash", "gemini-3-pro-image-preview"]
    contents: Content
    config: GenerationConfig = Field(default_factory=GenerationConfig)


async def read_generation_request(request: Request) -> GenerateRequest:
    if request.headers.get("content-type", "").split(";", 1)[0].strip().lower() != "application/json":
        raise HTTPException(status_code=415, detail="JSON content required")
    size = 0
    chunks = []
    async for chunk in request.stream():
        size += len(chunk)
        if size > MAX_REQUEST_BYTES:
            raise HTTPException(status_code=413, detail="Image or request is too large")
        chunks.append(chunk)
    try:
        return GenerateRequest.model_validate_json(b"".join(chunks))
    except (ValidationError, ValueError, RecursionError):
        # Never echo submitted content, possible credentials, or image bytes.
        raise HTTPException(status_code=422, detail="Invalid generation request") from None


async def generate_content(request: Request) -> dict:
    data = await read_generation_request(request)
    try:
        key = read_secret("GEMINI_API_KEY", "API_KEY")
    except SecretConfigurationError:
        raise HTTPException(status_code=503, detail="AI service configuration must be updated") from None

    config = data.config.model_dump(exclude_none=True)
    system_instruction = config.pop("systemInstruction", None)
    body = {"contents": [{"role": "user", **data.contents.model_dump(exclude_none=True)}]}
    if system_instruction:
        body["systemInstruction"] = {"parts": [{"text": system_instruction}]}
    if config:
        body["generationConfig"] = config
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(180, connect=10), follow_redirects=False) as client:
            upstream = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{data.model}:generateContent",
                headers={"x-goog-api-key": key}, json=body,
            )
        if upstream.status_code == 429:
            raise HTTPException(status_code=429, detail="AI service is busy. Please try again shortly.")
        if upstream.status_code in (401, 403):
            raise HTTPException(status_code=503, detail="AI service configuration must be updated")
        if upstream.status_code != 200:
            logger.warning("AI provider returned status %s", upstream.status_code)
            raise HTTPException(status_code=502, detail="AI generation failed. Please try again.")
        result = upstream.json()
        candidates = result.get("candidates")
        if not isinstance(candidates, list) or not candidates:
            raise ValueError("Missing candidates")
        # Return only the response fields used by the four existing callers.
        parts = candidates[0].get("content", {}).get("parts", [])
        if not isinstance(parts, list):
            raise ValueError("Invalid response parts")
        return {"candidates": [{"content": {"parts": parts}}]}
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI generation timed out. Please try again.") from None
    except (httpx.HTTPError, ValueError, TypeError, AttributeError):
        logger.error("AI provider request failed.")
        raise HTTPException(status_code=502, detail="AI generation failed. Please try again.") from None
