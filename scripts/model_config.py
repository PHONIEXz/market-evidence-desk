"""Select a configured model provider without exposing API keys in errors."""

from collections.abc import Mapping


def configured_value(environment: Mapping[str, str], name: str) -> str:
    value = environment.get(name, "").strip()
    return "" if value.upper().startswith("YOUR_") else value


def model_credentials(environment: Mapping[str, str]) -> tuple[str, str, str] | None:
    """Return (provider, key, model), preferring Gemini if both keys are set."""
    gemini_key = configured_value(environment, "GEMINI_API_KEY") or configured_value(
        environment, "GEMINIAPIKEY"
    )
    if gemini_key:
        return ("gemini", gemini_key, configured_value(environment, "GEMINI_MODEL") or "gemini-3.8-flash")
    openai_key = configured_value(environment, "OPENAI_API_KEY")
    if openai_key:
        return ("openai", openai_key, "")
    return None


def missing_settings(environment: Mapping[str, str]) -> list[str]:
    missing = [
        name for name in ("SANITY_CONTEXT_MCP_URL", "SANITY_ORGANIZATION_TOKEN")
        if not configured_value(environment, name)
    ]
    if model_credentials(environment) is None:
        missing.append("GEMINI_API_KEY (or GEMINIAPIKEY or OPENAI_API_KEY)")
    return missing


def fallback_model(environment: Mapping[str, str], primary_model: str, status_code: int) -> str:
    """Use a smaller tool-capable Gemini model only for temporary overloads."""
    if status_code != 503:
        return ""
    alternative = configured_value(environment, "GEMINI_FALLBACK_MODEL") or "gemini-3.5-flash-lite"
    return alternative if alternative != primary_model else ""
