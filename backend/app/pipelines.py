# app/pipelines.py

from typing import List, Dict, Any, Optional
import io

from docx import Document  # pip install python-docx

from .aws_bedrock_client import aws_bedrock_client
from .tools import call_tools

from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import OpenAIEmbeddings


# ------------------ Functions ------------------

# Helper: convert frontend history -> Bedrock history
def convert_history_for_bedrock(
    history: Optional[List[Dict[str, Any]]]
) -> List[Dict[str, Any]]:
    """
    Convert React-style history:
        [{ "from": "user" | "bot", "text": "..." }, ...]
    or Bedrock-style:
        [{ "role": "user" | "assistant", "content": "..." }, ...]
    into the format expected by BedrockClient._converse_sync:
        [{ "role": "user" | "assistant", "content": "..." }, ...]
    (the client itself wraps content as {"text": ...}).
    """
    if not history:
        return []

    converted: List[Dict[str, Any]] = []

    for turn in history:
        # Prefer explicit role/content if already present
        if "role" in turn or "content" in turn:
            raw_text = turn.get("content", "")
            role = turn.get("role", "user")
        else:
            # React-style: { from, text }
            from_ = turn.get("from", "user")
            raw_text = turn.get("text", "")
            role = "user" if from_ == "user" else "assistant"

        text = (raw_text or "").strip()
        if not text:
            continue

        converted.append({"role": role, "content": text})

    return converted


# Helper: extract text from uploaded file

def extract_text_from_uploaded_file(
    file_bytes: Optional[bytes],
    file_name: Optional[str],
    file_mime: Optional[str],
) -> str:
    """
    Extract readable text from an uploaded file.

    - Handles DOCX via python-docx
    - Handles text-like files (.txt, .md, .csv, .json, etc.)
    - Falls back to a best-effort utf-8 decode
    """
    if not file_bytes:
        return ""

    mime = (file_mime or "").lower()
    name = (file_name or "").lower()

    # ---- DOCX (Word) ----
    if (
        name.endswith(".docx")
        or mime
        == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ):
        try:
            doc = Document(io.BytesIO(file_bytes))
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            return "\n".join(paragraphs)
        except Exception as e:
            print("Failed to parse DOCX:", e)
            # fall through to generic decode

    # ---- Plain text-like files ----
    if mime.startswith("text/") or name.endswith(
        (".txt", ".md", ".csv", ".py", ".json", ".log")
    ):
        try:
            return file_bytes.decode("utf-8", errors="ignore")
        except Exception:
            return ""

    # ---- Fallback: generic decode ----
    try:
        return file_bytes.decode("utf-8", errors="ignore")
    except Exception:
        return ""


# ------------------ RAG Pipeline ------------------
async def handle_rag_chat(
    openai_api_key: str,
    config: dict,
    message: str,
    history: list | None,
    file_bytes: Optional[bytes] = None,
    file_name: Optional[str] = None,
    file_mime: Optional[str] = None,
) -> str:
    # Extract the path from the vector store
    vector_store = config["vector_store"]

    # Embedding model using OpenAI's embedding API
    embeddings = OpenAIEmbeddings(api_key=openai_api_key)

    # Load FAISS vector store
    vectorstore = FAISS.load_local(
        vector_store,
        embeddings,
        allow_dangerous_deserialization=True,  # required in newer langchain versions
    )

    # Retrieve relevant documents using similarity search
    results = vectorstore.similarity_search(message, k=4)

    # Extract & join the context from documents
    context = "\n\n".join(doc.page_content for doc in results)

    # Uploaded file text (if any)
    uploaded_text = extract_text_from_uploaded_file(file_bytes, file_name, file_mime)
    uploaded_section = ""
    if uploaded_text:
        uploaded_excerpt = uploaded_text[:4000]
        uploaded_section = (
            f"\n\n--- Uploaded file excerpt ({file_name}) ---\n{uploaded_excerpt}"
        )

    system_prompt = config["system_prompt"]

    # Build a plain user message string including context + uploaded file excerpt
    user_message = (
        f"Question: {message}\n\n"
        f"Context Text (from knowledge base):\n{context}"
        f"{uploaded_section}"
    )

    # Convert history for Bedrock
    bedrock_history = convert_history_for_bedrock(history)

    # Call model
    completion = await aws_bedrock_client.chat(
        model=config["base_model"],
        system=system_prompt,
        message=user_message,
        history=bedrock_history,
    )
    return completion


# ------------------ General Chat Pipeline ------------------

async def handle_general_chat(
    config: dict,
    message: str,
    history: list | None,
    file_bytes: Optional[bytes] = None,
    file_name: Optional[str] = None,
    file_mime: Optional[str] = None,
) -> str:
    # Convert React history -> Bedrock history
    bedrock_history = convert_history_for_bedrock(history)

    # If a file was uploaded, include an excerpt
    uploaded_text = extract_text_from_uploaded_file(file_bytes, file_name, file_mime)
    if uploaded_text:
        uploaded_excerpt = uploaded_text[:4000]
        message_for_model = (
            f"{message}\n\n"
            f"[The user also uploaded a file named '{file_name}'. "
            f"Here is an excerpt of its contents:]\n"
            f"{uploaded_excerpt}"
        )
    else:
        message_for_model = message

    completion = await aws_bedrock_client.chat(
        model=config["base_model"],
        system=config["system_prompt"],
        message=message_for_model,
        history=bedrock_history,
    )
    return completion


# ------------------ Tools Pipeline ------------------

async def handle_tools_chat(
    config: dict,
    message: str,
    history: list | None,
    file_bytes: Optional[bytes] = None,
    file_name: Optional[str] = None,
    file_mime: Optional[str] = None,
) -> str:
    # Optionally inject file info into the message so tools / model can see it.
    uploaded_text = extract_text_from_uploaded_file(file_bytes, file_name, file_mime)
    if uploaded_text:
        uploaded_excerpt = uploaded_text[:4000]
        message_for_model = (
            f"{message}\n\n"
            f"[The user also uploaded a file named '{file_name}'. "
            f"Here is an excerpt of its contents:]\n"
            f"{uploaded_excerpt}"
        )
    else:
        message_for_model = message

    # For tools, keep passing the original history (call_tools can decide how to use it)
    tool_result = await call_tools(
        model=config["base_model"],
        tools=config.get("tools", []),
        message=message_for_model,
        history=history,
    )
    return tool_result["final_answer"]
