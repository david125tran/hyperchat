# app/main.py
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import os
import json
from pydantic import BaseModel
import re
from typing import Any, Iterable, List, Optional

from .model_config import MODEL_CONFIGS
from .pipelines import handle_rag_chat, handle_general_chat, handle_tools_chat


# ------------------------------------ Configure API Keys / Tokens ----------------------------------
# Path to the .env file
env_path = r"C:\Users\Laptop\Desktop\Coding\React\hyperchat\backend\.env"

# Load the .env file
load_dotenv(dotenv_path=env_path, override=True)

# Access the API keys stored in the environment variable
openai_api_key = os.getenv("OPENAI_API_KEY")  # https://openai.com/api/



# ---------------------------------- Prompt Injection Attack Defense Functions ----------------------------------
DANGEROUS_WORDS = re.compile(
    r"(?i)\b(ignore previous|override.*instructions|system prompt|jailbreak|"
    r"developer mode|bypass|prompt injection|sudo rm -rf|;--|/\*|\*/|xp_cmdshell)\b"
)
SQL_SIGNS = re.compile(r"(?i)\b(UNION SELECT|--|#|/\*|\*/|;|DROP|INSERT|UPDATE|DELETE)\b")

URL_RE = re.compile(r"https?://[^\s)>\]]+")

SECRET_PATTERNS = [
    re.compile(r"sk-[A-Za-z0-9]{20,}"),
    re.compile(r"(?i)aws_?(secret|access)_?key\s*[:=]\s*[A-Za-z0-9/+=]{20,}"),
]

def validate_query(query: str):
    """
    Returns:
      (ok: bool, sanitized_query: Optional[str], error_msg: Optional[str])
    """
    # Hard-block obvious prompt / SQL injection
    for pat in (DANGEROUS_WORDS, SQL_SIGNS):
        if pat.search(query):
            return (
                False,
                None,
                "⚠️ Your previous message was blocked because it looked like "
                "a prompt / SQL injection attempt. Please rephrase and try again."
            )

    # Redact any secrets if they appear
    sanitized = query
    for pat in SECRET_PATTERNS:
        sanitized = pat.sub("[REDACTED_SECRET]", sanitized)

    return True, sanitized, None

    

# ------------------------------------ Chat Classes ----------------------------------
class ChatRequest(BaseModel):
    backendId: str
    message: str
    history: Optional[List[dict]] = None


class ChatResponse(BaseModel):
    reply: str


# ------------------------------------ Server Side Python Backend ----------------------------------
app = FastAPI()

# CORS so React can call this
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(
    backendId: str = Form(...),
    message: str = Form(""),
    history: str = Form("[]"),
    file: UploadFile = File(None),
):
    """
    Chat endpoint that supports text, history, and an optional uploaded file.
    The frontend sends multipart/form-data (FormData).
    """

    # ----------------- Prompt-injection / security validation -----------------
    ok, sanitized_message, error_msg = validate_query(message)
    if not ok:
        # Respond like a normal assistant reply so the user sees it in chat
        return ChatResponse(reply=error_msg)

    if sanitized_message is not None:
        message = sanitized_message
    # -------------------------------------------------------------------------

    # Parse history JSON
    try:
        history_list = json.loads(history) if history else []
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid history JSON")

    config = MODEL_CONFIGS.get(backendId)
    if not config:
        raise HTTPException(status_code=400, detail="Unknown model backendId")

    # Handle file (if any)
    file_bytes: Optional[bytes] = None
    file_name: Optional[str] = None
    file_mime: Optional[str] = None

    if file is not None:
        file_bytes = await file.read()
        file_name = file.filename
        file_mime = file.content_type or "application/octet-stream"

        print("---- Uploaded file ----")
        print("Name:", file_name)
        print("MIME:", file_mime)
        print("Size (bytes):", len(file_bytes))
        print("------------------------")

    # Extract the LLM type
    type_ = config["type"]

    # Route the chat to the correct pipeline and pass file data
    if type_ == "rag-assistant-1":
        reply = await handle_rag_chat(
            openai_api_key,
            config,
            message,
            history_list,
            file_bytes=file_bytes,
            file_name=file_name,
            file_mime=file_mime,
        )
    elif type_ == "tools-assistant-1":
        reply = await handle_tools_chat(
            config,
            message,
            history_list,
            file_bytes=file_bytes,
            file_name=file_name,
            file_mime=file_mime,
        )
    elif type_ in ("general", "fine_tuned"):
        reply = await handle_general_chat(
            config,
            message,
            history_list,
            file_bytes=file_bytes,
            file_name=file_name,
            file_mime=file_mime,
        )
    else:
        raise HTTPException(status_code=500, detail="Unsupported model type")

    return ChatResponse(reply=reply)
