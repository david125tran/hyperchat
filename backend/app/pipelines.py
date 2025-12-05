# app/pipelines.py

from typing import List, Dict, Any, Optional

from .aws_bedrock_client import aws_bedrock_client
from .tools import call_tools

from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import OpenAIEmbeddings


# ---------- helper: convert frontend history -> Bedrock history ----------

def convert_history_for_bedrock(history: Optional[List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
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


# ---------- RAG pipeline ----------

async def handle_rag_chat(
    openai_api_key: str,
    config: dict,
    message: str,
    history: list | None,
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

    system_prompt = config["system_prompt"]

    # Build a plain user message string including context
    user_message = f"Question: {message}\n\nContext Text:\n{context}"

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


# ---------- General chat pipeline ----------

async def handle_general_chat(
    config: dict,
    message: str,
    history: list | None,
) -> str:
    # Convert React history -> Bedrock history
    bedrock_history = convert_history_for_bedrock(history)

    completion = await aws_bedrock_client.chat(
        model=config["base_model"],
        system=config["system_prompt"],
        message=message,
        history=bedrock_history,   # <<< THIS is the key change
    )
    return completion


# ---------- Tools pipeline ----------

async def handle_tools_chat(
    config: dict,
    message: str,
    history: list | None,
) -> str:
    # For tools, keep passing the original history (call_tools can decide how to use it)
    tool_result = await call_tools(
        model=config["base_model"],
        tools=config.get("tools", []),
        message=message,
        history=history,
    )
    return tool_result["final_answer"]
