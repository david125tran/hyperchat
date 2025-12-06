hyperchat/
│
├── start-frontend.bat                                          # Run UI
├── start-backend.bat                                           # Run Python backend FastAPI entry point to AWS Bedrock
│
├── pipelines/
│   │
│   └── rag-assistant-1/
│       ├── knowledge base/
│       │   └── *.txt, *.md, *.pdf, *.docx, *.html, *.htm       # Raw unstructured knowledge documents
│       ├── vectorstore_db/
│       │   ├── index.faiss                                     # FAISS vector store
│       │   └── index.pkl                                       # Pickle file
│       └── vector store builder-1.py                           # Script to embed documents + build vector DB for 'rag-assistant-1'
│
├── backend/
│   │
│   ├── app/
│   |   ├── __init__.py
│   |   ├── main.py                                             # FastAPI routes (POST /api/chat)
│   |   ├── model_config.py                                     # Defines all LLM models & their IDs
│   |   ├── pipelines.py                                        # Handle different LLM Chats, Ex: handle_rag_chat, handle_general_chat, handle_tools_chat
│   |   ├── aws_bedrock_client.py                               # Async Bedrock runtime wrapper
│   |   └── tools.py                                            # tool-calling stub
│   └──.env                                                     # Environment Variables: 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'OPEN_API_KEY'
│
└── frontend/
    │
    ├── package.json                                            # Frontend dependencies + scripts
    ├── node_modules/
    │
    ├── public/            
    │   └── index.html     
    │
    └── src/
        ├── images/
        │   └── *.jpg                                           # Avatar profile pictures        
        ├── App.js                                              # App root (Login Page of UI)
        ├── App.css                                             # App root's styles
        ├── ChatPage.jsx                                        # Chat UI (sidebar, messages, input)
        ├── ChatPage.css                                        # Chat UI styling
        ├── index.js                                            # React entrypoint → App
        └── index.css                                           # Global styles (resets, fonts)