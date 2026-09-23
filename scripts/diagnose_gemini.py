"""Compare tiny native and OpenAI-compatible Gemini calls without printing secrets."""

import asyncio
import os
from pathlib import Path
import sys

import httpx
from dotenv import load_dotenv


async def probe(client, label, method, url, headers, payload=None):
    try:
        response = await client.request(method, url, headers=headers, json=payload)
    except httpx.RequestError as error:
        print(f"{label}: network error ({type(error).__name__})")
        return None
    try:
        error_status = response.json().get("error", {}).get("status", "")
    except (ValueError, AttributeError):
        error_status = ""
    print(f"{label}: HTTP {response.status_code}" + (f" ({error_status})" if error_status else ""))
    return response.status_code


async def main():
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
    key = os.environ.get("GEMINI_API_KEY", "").strip() or os.environ.get("GEMINIAPIKEY", "").strip()
    if not key or key.upper().startswith("YOUR_"):
        raise SystemExit("Set GEMINI_API_KEY in .env; do not paste the key into chat.")
    catalog_only = "--catalog-only" in sys.argv[1:]
    model_args = [arg for arg in sys.argv[1:] if arg != "--catalog-only"]
    if len(model_args) > 1:
        raise SystemExit("Usage: python scripts/diagnose_gemini.py [--catalog-only] [model]")
    model = model_args[0] if model_args else "gemini-3.5-flash-lite"
    if not model.startswith("gemini-") or "/" in model or "?" in model:
        raise SystemExit("Use a Gemini model ID, for example gemini-3.5-flash-lite.")

    print("Checking Gemini model access without generating text." if catalog_only else
          f"Checking {model} with one catalog request and two short generations (no Sanity content is sent).")
    async with httpx.AsyncClient(timeout=30) as client:
        catalog = await probe(
            client, "Gemini model catalog", "GET", "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1",
            {"x-goog-api-key": key},
        )
        if catalog_only:
            print("Model listing works; generation is the failing operation." if catalog == 200 else
                  "Model listing also failed. Review the key's status in Google AI Studio.")
            return
        native = await probe(
            client, "Native Gemini", "POST", f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            {"x-goog-api-key": key},
            {"contents": [{"parts": [{"text": "Reply OK."}]}], "generationConfig": {"maxOutputTokens": 32}},
        )
        compatible = await probe(
            client, "OpenAI-compatible Gemini", "POST", "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
            {"Authorization": f"Bearer {key}"},
            {"model": model, "messages": [{"role": "user", "content": "Reply OK."}], "max_tokens": 32},
        )
    if native == 503 and compatible == 503:
        if catalog == 200:
            print("The key can read Gemini model metadata, but generation fails on both routes.")
        else:
            print("Even tiny requests get 503 on both routes; the Sanity agent prompt is not the only cause.")
    elif native == 200 and compatible == 503:
        print("The native API responds, but the compatibility route used by agent.py returns 503.")
    elif native == 200 and compatible == 200:
        print("Both basic routes work; the 503 may depend on the larger agent request or current load.")
    else:
        print("Share only the two status lines above for the next diagnosis. Keep .env private.")


if __name__ == "__main__":
    asyncio.run(main())
