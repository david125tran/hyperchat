# app/main.py
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from pydantic import BaseModel
from typing import Any, List, Optional

from .model_config import MODEL_CONFIGS
from .pipelines import handle_rag_chat, handle_general_chat, handle_tools_chat


# ------------------------------------ Configure API Keys / Tokens ----------------------------------
# Path to the .env file
env_path = r"C:\Users\Laptop\Desktop\Coding\React\hyperchat\backend\.env"

# Load the .env file
load_dotenv(dotenv_path=env_path, override=True)

# Access the API keys stored in the environment variable
openai_api_key = os.getenv('OPENAI_API_KEY')            # https://openai.com/api/


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
async def chat_endpoint(body: ChatRequest):
    backend_id = body.backendId
    message = body.message
    history = body.history or []

    config = MODEL_CONFIGS.get(backend_id)

    # The "model_config.py" script will control what function is called
    if not config:
        raise HTTPException(status_code=400, detail="Unknown model backendId")

    # Extract the LLM type
    type_ = config["type"]

    # Route the chat to the correct pipeline
    if type_ == "rag-assistant-1":
        reply = await handle_rag_chat(openai_api_key, config, message, history)
    elif type_ == "tools-assistant-1":
        reply = await handle_tools_chat(config, message, history)
    # All generalist AI models use the same function
    elif type_ in ("general", "fine_tuned"):
        reply = await handle_general_chat(config, message, history)
    else:
        raise HTTPException(status_code=500, detail="Unsupported model type")

    return ChatResponse(reply=reply)
