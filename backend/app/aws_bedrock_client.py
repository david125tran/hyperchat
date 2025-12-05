# app/aws_bedrock_client.py

import asyncio
import boto3
from dotenv import load_dotenv
import os
from typing import Optional, List, Dict, Any

# ------------------ Load Environment Variables ------------------
load_dotenv()


class BedrockClient:
  """
  Thin async wrapper around the Amazon Bedrock Runtime `converse` API
  for different LLM models.
  """

  def __init__(
    self,
    region_name: Optional[str] = None,
    profile_name: Optional[str] = None,
  ) -> None:
    session_kwargs: Dict[str, Any] = {}
    if profile_name:
      session_kwargs["profile_name"] = profile_name

    # Create the boto3 session AFTER env vars are loaded
    session = boto3.Session(**session_kwargs) if session_kwargs else boto3.Session()

    # Debug what credentials boto3 is using
    creds = session.get_credentials()
    if creds:
      frozen = creds.get_frozen_credentials()
      print("=== AWS DEBUG ===")
      print("Access key starts with:", frozen.access_key[:4], "****")
      print("Cred provider:", creds.method)
      print("=================")
    else:
      print("=== AWS DEBUG ===")
      print("No credentials resolved!")
      print("=================")

    # Region: from argument, then env var, then default
    resolved_region = region_name or os.getenv("AWS_REGION") or "us-east-1"

    self.client = session.client(
      "bedrock-runtime",
      region_name=resolved_region,
    )

  # ---------- internal sync helper ----------
  def _converse_sync(
    self,
    *,
    model: str,
    system: Optional[str],
    message: str,
    history: Optional[List[Dict[str, Any]]] = None,
    max_tokens: int = 2048,
    temperature: float = 0.2,
    tools: Optional[List[Dict[str, Any]]] = None,
  ) -> str:
    """
    Synchronous call to Bedrock Converse, returns assistant text.
    """

    messages: List[Dict[str, Any]] = []

    # Add history, but skip blank content
    if history:
      for turn in history:
        # Support either {role, content} or {from, text}
        if "content" in turn:
          raw_content = turn.get("content")
        else:
          raw_content = turn.get("text")

        content = (raw_content or "").strip()
        if not content:
          # Skip empty/whitespace-only history entries
          continue

        if "role" in turn:
          role = turn.get("role", "user")
        else:
          from_ = turn.get("from", "user")
          role = "user" if from_ == "user" else "assistant"

        messages.append(
          {
            "role": role,
            "content": [{"text": content}],
          }
        )

    # Add current user message (must not be blank)
    user_text = (message or "").strip()
    if not user_text:
      raise ValueError("Current user message cannot be empty or whitespace")

    messages.append(
      {
        "role": "user",
        "content": [{"text": user_text}],
      }
    )

    kwargs: Dict[str, Any] = {
      "modelId": model,
      "messages": messages,
      "inferenceConfig": {
        "maxTokens": max_tokens,
        "temperature": temperature,
      },
    }

    # Clean system prompt too
    system_text = (system or "").strip()
    if system_text:
      kwargs["system"] = [{"text": system_text}]

    if tools:
      kwargs["toolConfig"] = {"tools": tools}

    response = self.client.converse(**kwargs)

    output_msg = response.get("output", {}).get("message", {})
    text_chunks: List[str] = []
    for item in output_msg.get("content", []):
      if "text" in item:
        text_chunks.append(item["text"])

    return "".join(text_chunks).strip()

  # ---------- public async helper used by your pipelines ----------
  async def chat(
    self,
    *,
    model: str,
    system: Optional[str],
    message: str,
    history: Optional[List[Dict[str, Any]]] = None,
    max_tokens: int = 2048,
    temperature: float = 0.2,
    tools: Optional[List[Dict[str, Any]]] = None,
  ) -> str:
    """
    Async wrapper around _converse_sync so you can `await` it
    from FastAPI / any async code.
    """
    return await asyncio.to_thread(
      self._converse_sync,
      model=model,
      system=system,
      message=message,
      history=history,
      max_tokens=max_tokens,
      temperature=temperature,
      tools=tools,
    )


# Default instance used by the rest of the app
aws_bedrock_client = BedrockClient()
