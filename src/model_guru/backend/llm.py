from __future__ import annotations
import json
import os
from openai import OpenAI


def get_llm_client() -> OpenAI:
    """Get OpenAI client configured for Databricks Foundation Model API."""
    host = os.environ.get("DATABRICKS_HOST", "")
    token = os.environ.get("DATABRICKS_TOKEN", "")
    return OpenAI(
        base_url=f"{host}/serving-endpoints",
        api_key=token,
    )


def call_llm(system_prompt: str, user_prompt: str) -> dict:
    """Call Claude Sonnet 4.6 via Foundation Model API and parse JSON response."""
    client = get_llm_client()
    response = client.chat.completions.create(
        model="databricks-claude-sonnet-4-6",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.1,
        max_tokens=4096,
    )
    content = response.choices[0].message.content or "{}"
    # Strip markdown code fences if present
    if content.startswith("```"):
        content = content.split("\n", 1)[1].rsplit("```", 1)[0]
    return json.loads(content)
