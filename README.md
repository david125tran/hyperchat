# ⚡ HyperChat - Multi-Model AI Chat + RAG + File Upload

HyperChat is a full-stack end-to-end **multi-modal** AI chat inspired by **Microsoft Teams** assistant built with **React**, **FastAPI**, and **Amazon Bedrock**, with support for:

- Multiple AI chat models with different funcitionality (**RAG**, **Tooling**, **Generallist**)
- Per-chat conversation history
- Uploading files into a conversation
- Clear chat button
- Most recent messages go to the top
- Model-specific pipelines (generalist, RAG, tools, etc.)
- I integrated in **OWASP Top 10 for Large Language Model Applications** best practices to filter user inputs and filter LLM outputs. 

This project includes both a **frontend UI** and a **Python backend API**.

<p align="center">
  <img src="https://github.com/david125tran/hyperchat/blob/main/ui.png?raw=true" width="800" />
</p>

---

## 🚀 Features

### 🎨 Multi-Model Chat UI
Each AI model gets:
- A separate conversation
- Its own avatar
- Persistent history saved in browser storage
- Custom intro prompt
- Colored sidebar status
- End user has ability to clear conversational chat history

### 🧠 LLM Model Routing
The backend switches between different behavior depending on the model type:

- General conversational AI
- RAG assistant w/ FAISS search
- Tools-enabled AI

Configured in `backend/app/model_config.py`  

### 🔍 Retrieval-Augmented Generation (RAG)
- **David Tran the Robot** (rag-assistant-1) - A RAG system with equipped knowledge on LLM security.  This rag system was built here: `hyperchat\pipelines\rag-assistant-1`
- Uses:
    - LangChain
    - FAISS vector store
    - OpenAI embeddings
    - Local knowledge base folder

### 🧩 AWS Bedrock Inference
Backend uses AWS Bedrock Runtime to communicate with Claude / other Amazon-hosted models.

```mermaid
    flowchart LR
    %% =========================
    %% Backend entry point (FastAPI)
    %% =========================
    A["Client (React)<br>POST /api/chat\nmultipart/form-data\nbackendId, message, history, optional file"] --> B["FastAPI app\napp/main.py"]
    B --> C["chat_endpoint()\n/api/chat"] 

    %% Security + parsing
    C --> D["validate_query(message)\nblocks prompt/SQL injection\nredacts secrets"]
    D -->|blocked| E["Return ChatResponse(reply=error_msg)"]
    D -->|ok| F["Parse history JSON\nhistory_list = json.loads(history)"]
    F --> G["Lookup config by backendId\nMODEL_CONFIGS[backendId]"]

    %% File handling
    C --> H{File uploaded?}
    H -->|yes| I["Read file bytes + metadata\nfile_bytes, file_name, file_mime"]
    H -->|no| J[Continue without file]

    %% Route by backend type
    G --> K{"config['type']"}
    K -->|rag-assistant-1| RAG["handle_rag_chat(...)"]
    K -->|tools-assistant-1| TOOLS["handle_tools_chat(...)"]
    K -->|"general / fine_tuned"| GEN["handle_general_chat(...)"]
    K -->|unknown| X[HTTP 500 Unsupported model type]

    %% =========================
    %% RAG pipeline
    %% =========================
    subgraph S1["RAG pipeline (app/pipelines.py)"]
        RAG --> R1["Load FAISS vector store\n(config['vector_store'])"]
        R1 --> R2["Embed query w/ OpenAIEmbeddings\n(api_key from env)"]
        R2 --> R3["Similarity search k=4\ncontext = join(doc.page_content)"]
        RAG --> R4["Extract uploaded file text\n(DOCX or text decode)\n+ append excerpt"]
        R3 --> R5["Build user_message:\nQuestion + Context + optional file excerpt"]
        RAG --> R6["Convert history for Bedrock\nconvert_history_for_bedrock()"]
        R5 --> R7["aws_bedrock_client.chat(\nmodel=base_model,\nsystem=system_prompt,\nmessage=user_message,\nhistory=converted)"]
        R6 --> R7
    end

    %% =========================
    %% General pipeline
    %% =========================
    subgraph S2["General pipeline (app/pipelines.py)"]
        GEN --> G1[Convert history for Bedrock]
        GEN --> G2["If file uploaded:\nappend excerpt to message"]
        G1 --> G3["aws_bedrock_client.chat(\nmodel=base_model,\nsystem=system_prompt,\nmessage=message_for_model,\nhistory=converted)"]
        G2 --> G3
    end

    %% =========================
    %% Tools pipeline
    %% =========================
    subgraph S3["Tools pipeline (app/pipelines.py + app/tools.py)"]
        TOOLS --> T1["If file uploaded:\nappend excerpt to message"]
        TOOLS --> T2["call_tools(\nmodel=base_model,\ntools=config.tools,\nmessage=message_for_model,\nhistory=original)"]
        T2 --> T3["Return tool_result['final_answer']\n(currently a stub/echo)"]
    end

    %% =========================
    %% Bedrock client (shared)
    %% =========================
    subgraph S4["AWS Bedrock Client (app/aws_bedrock_client.py)"]
        R7 --> BC["BedrockClient.chat()\nasync wrapper -> to_thread"]
        G3 --> BC
        BC --> BCS["_converse_sync()\nBuild messages + system + toolConfig\nCall bedrock-runtime.converse()"]
        BCS --> OUT["sanitize_model_output()\nredact key-like patterns\nreturn safe assistant text"]
    end

    %% Return to client
    OUT --> Z["Return ChatResponse(reply=completion)"]
    T3 --> Z2["Return ChatResponse(reply=tool_answer)"]
  ```
