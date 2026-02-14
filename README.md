# ⚡ HyperChat

## Modular AI Orchestration Framework (React + FastAPI + Bedrock + RAG)

HyperChat is a full-stack, model-agnostic AI chat system that
demonstrates modern applied AI engineering patterns:

-   Multi-pipeline AI routing (General LLM, RAG, Tools/Agents)
-   Configuration-driven backend orchestration
-   Retrieval-Augmented Generation with FAISS
-   AWS Bedrock model integration
-   File-aware conversational context
-   OWASP Top 10 for LLM Applications safeguards
-   Decoupled frontend architecture

This project is not just a chat UI - it is a pluggable AI
orchestration platform designed to separate:

-   UI concerns
-   AI routing logic
-   Model infrastructure
-   Retrieval pipelines
-   Tool execution
-   Security enforcement

<p align="center">
  <img src="https://github.com/david125tran/hyperchat/blob/main/ui.png?raw=true" width="800" />
</p>

---

# 🏗 Architecture Overview

HyperChat is built around a single unified API contract:

    POST /api/chat

The frontend sends:

-   backendId
-   message
-   history
-   optional file

The backend acts as an AI orchestration layer, dynamically routing the
request to the appropriate pipeline.

---

# 🚀 Core Capabilities

## 🧠 Multi-Model Chat UI

Each AI assistant includes:

-   Independent conversation history
-   Persistent browser storage
-   Unique system prompt
-   Custom avatar & visual styling
-   Clear-chat functionality
-   Optional file attachment per message

The frontend is intentionally model-agnostic. The end user does not know
whether it is talking to:

-   A vanilla LLM
-   A RAG pipeline
-   A tools-enabled agent

It simply calls `/api/chat` with a backendId.

------------------------------------------------------------------------

## 🔀 Configuration-Driven AI Routing

Backend behavior is controlled through:

`backend/app/model_config.py`

Instead of hardcoding logic in the API layer, each assistant is defined
by configuration:

-   Model type
-   Base model
-   System prompt
-   Tool availability
-   Vector store path

Adding a new assistant requires no changes to the API contract.

------------------------------------------------------------------------

## 🔍 Retrieval-Augmented Generation (RAG)

The RAG assistant:

-   Uses LangChain for orchestration
-   Uses FAISS for local vector search
-   Uses OpenAI embeddings
-   Loads a local knowledge base directory
-   Retrieves top-k semantic chunks
-   Injects grounded context into the model prompt
-   Optionally appends uploaded file excerpts

------------------------------------------------------------------------

## 🧩 Tools / Agent Pipeline

The tools pipeline supports model-driven tool calling.

The backend can:

-   Pass tool schemas to Bedrock
-   Handle tool invocations
-   Route tool responses
-   Return structured answers

------------------------------------------------------------------------

## ☁️ AWS Bedrock Integration

All model inference is routed through a centralized Bedrock client
wrapper.

The wrapper:

-   Standardizes request formatting
-   Converts history into Bedrock message format
-   Supports tool configuration
-   Handles async execution safely
-   Sanitizes model output before returning to UI

------------------------------------------------------------------------

## 🛡 Security Integration (OWASP for LLM Applications)

HyperChat integrates best practices from the OWASP Top 10 for LLM
Applications, including:

-   Prompt injection filtering
-   Suspicious pattern detection
-   Secret redaction
-   Input validation
-   Output sanitization

Security enforcement happens before and after model inference.

------------------------------------------------------------------------

# 🧪 Vector Store Builder

The project includes a standalone ingestion + RAG validation script:

`vector store builder-1.py`

This script:

1.  Recursively scans a knowledge base directory
2.  Dynamically selects the correct document loader based on the file extension (*.pdf, *.docx, etc.)
3.  Chunks documents with overlap
4.  Generates embeddings
5.  Builds and persists a FAISS vector index
6.  Visualizes embedding clusters in 3D using PCA
7.  Runs a full RAG smoke test

For this script, I kept the chunking strategy simple for a demo (800 character chunk with 100 character overlap).  In a production setting, I would inspect my chunks heavily and probably have a stronger chunking strategy.

---

# 🛠 Tech Stack

- **Frontend** - React, React Router, LocalStorage, Multipart file upload handling
- **Backend** - FastAPI, AWS Bedrock Runtime, LangChain, FAISS, OpenAI Embeddings - Python
- **Security** - OWASP aligned practices, Input filtering, Output sanitization

---
# 🏠 System Architecture
I intentionally designed Hyperchat as a configuration-driven AI orchestration framework rather that a single hardcoded chatbot.  The core design goal was decoupling logic from the frontend.  I wanted the frontend to be completely unaware of what tye of AI system it was talking to.  Whether it was a general conversational model, a RAG pipeline, or a tools-enabled agent.  The frontend simply sends a consistent payload to `/api/chat` with a `backendId` which determines how the request is processed.  

This gives me flexibility with the app because I knew down the road, I wanted to add more AI assistants, swap model providers, and/or add entirely new pipelines without changing the API contract or touch the UI.  

The React layer handles presentation and UX.  The FastAPI layer handles orchestration.  The pipeline layer handles the AI logic.  The Bedrock client handles inference infrastructure.  And lastly, the guard layer enforces security.  

🙏 Thanks for viewing my app!   
-David Tran

---
# 🌀 Mermaid Diagram

<p align="center">
  <img src="https://github.com/david125tran/hyperchat/blob/main/mermaid%20diagram.png?raw=true" width="800" />
</p>
