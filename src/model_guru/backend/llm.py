from __future__ import annotations
import json
from databricks.sdk import WorkspaceClient
from openai import OpenAI


def get_llm_client(ws: WorkspaceClient) -> OpenAI:
    """Get OpenAI client configured for Databricks Foundation Model API."""
    host = ws.config.host
    # Get a fresh OAuth token via the SDK's auth provider
    headers = ws.config.authenticate()
    token = headers.get("Authorization", "").removeprefix("Bearer ")
    return OpenAI(
        base_url=f"{host}/serving-endpoints",
        api_key=token,
    )


def call_llm(system_prompt: str, user_prompt: str, ws: WorkspaceClient) -> dict:
    """Call Claude Sonnet 4.6 via Foundation Model API and parse JSON response."""
    client = get_llm_client(ws)
    response = client.chat.completions.create(
        model="databricks-claude-sonnet-4-6",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.1,
        max_tokens=8192,
    )
    content = response.choices[0].message.content or "{}"
    # Strip markdown code fences if present
    if "```" in content:
        # Find JSON between code fences
        parts = content.split("```")
        for part in parts[1::2]:  # odd-indexed parts are inside fences
            part = part.strip()
            if part.startswith("json"):
                part = part[4:].strip()
            if part.startswith("{"):
                content = part
                break
    # Try to find JSON object in the content
    content = content.strip()
    if not content.startswith("{"):
        start = content.find("{")
        if start >= 0:
            content = content[start:]
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        # Last resort: try to find the last complete JSON object
        depth = 0
        end = -1
        for i, c in enumerate(content):
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
        if end > 0:
            return json.loads(content[:end])
        return {}
