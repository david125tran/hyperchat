# ⚡ HyperChat - Multi-Model AI Chat + RAG + File Upload

HyperChat is a full-stack end-to-end **multi-modal** AI chat inspired by **Microsoft Teams** assistant built with **React**, **FastAPI**, and **Amazon Bedrock**, with support for:

- Multiple AI chat models with different funcitionality (**RAG**, **Tooling**, **Generallist**)
- Per-chat conversation history
- Uploading files into a conversation
- Clear chat button
- Most recent messages go to the top
- Model-specific pipelines (generalist, RAG, tools, etc.)

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

### 🧠 LLM Model Routing
The backend switches between different behavior depending on the model type:

- General conversational AI
- RAG assistant w/ FAISS search
- Tools-enabled AI

Configured in `backend/app/model_config.py`  

### 🔍 Retrieval-Augmented Generation (RAG)
- **David Tran the Robot** (rag-assistant-1) - This rag system was built here: `hyperchat\pipelines\rag-assistant-1`
   
Uses:
- LangChain
- FAISS vector store
- OpenAI embeddings
- Local knowledge base folder

When chatting with the RAG assistant, answers are grounded in your own documents.  The **`hyperchat\pipelines`** directory contains a script to create a Vector DB for the RAG systems.  

### 🧩 AWS Bedrock Inference
Backend uses AWS Bedrock Runtime to communicate with Claude / other Amazon-hosted models.

---
