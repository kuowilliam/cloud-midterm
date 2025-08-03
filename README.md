# Distributed Image Retrieval System

## System Overview

This is a distributed intelligent image retrieval system based on microservices architecture, supporting multimodal search (text and image queries), PDF document processing, and real-time monitoring capabilities. The system adopts a microservices architecture with controller, multiple worker nodes, Redis cache, and frontend interface.

## Demo Video

🎥 **Watch the system in action**: [Demo Video](https://youtu.be/U49DOafMAWg)

## System Architecture

```
cloud-midterm/
├── controller/                 # Controller service
│   ├── main.py               # FastAPI main application
│   ├── Dockerfile            # Controller container config
│   └── README.md             # Controller detailed docs
├── worker/                    # Worker node service
│   ├── worker.py             # Worker processing logic
│   └── Dockerfile            # Worker container config
├── frontend/                  # React frontend application
│   ├── src/                  # Frontend source code
│   ├── package.json          # Frontend dependencies
│   └── public/               # Static resources
├── data/                      # Shared data directory
│   ├── uploads/              # Upload file cache
│   ├── metadata.json         # Image metadata
│   └── index_file           # FAISS vector index
├── docker-compose.yml         # Container orchestration
├── requirements.txt           # Python dependencies
└── README.md                 # This document
```

## Core Features

### Multimodal Search
- **Text Search**: Support natural language queries for image content
- **Image Search**: Support image-to-image search functionality
- **Hybrid Search**: Combined text and image composite queries

### PDF Document Processing
- Support PDF file upload and parsing
- Automatic extraction and indexing of images from PDFs
- Text content search functionality

### Image Processing Capabilities
- Support multiple image formats (JPEG, PNG, HEIC, WebP)
- Automatic EXIF geolocation information extraction
- Intelligent image caption generation (BLIP model)
- Vectorized embeddings (Sentence Transformers)

### User Authentication
- JWT token authentication mechanism
- User registration and login functionality
- Personalized data isolation

### Real-time Monitoring
- Worker node health status monitoring
- System performance metrics tracking
- Real-time event streaming (Server-Sent Events)
- Real-time processing progress updates

## Technology Stack

### Backend Technologies
- **FastAPI**: Modern Python web framework
- **Redis**: Distributed caching and message queue
- **FAISS**: High-performance vector similarity search
- **PyTorch**: Deep learning model inference
- **Transformers**: Hugging Face pre-trained models
- **Sentence Transformers**: Text vectorization
- **BLIP**: Image caption generation model

### Frontend Technologies
- **React 19**: Modern frontend framework
- **Material-UI**: Beautiful UI component library
- **React Query**: Data fetching and caching management
- **Recharts**: Data visualization charts
- **Axios**: HTTP client

### AI/ML Models
- **all-MiniLM-L6-v2**: Text embedding model
- **BLIP**: Image caption generation model
- **Cohere**: Advanced text processing API
- **Google Gemini**: Multimodal AI model

## System Services

### Controller
- **Functions**: 
  - API endpoint management
  - File upload processing
  - Search request routing
  - User authentication
  - System monitoring

### Worker Nodes
- **Count**: 3 nodes (worker1, worker2, worker3)
- **Functions**:
  - Image processing and indexing
  - Vectorization calculations
  - Parallel task processing
  - Health status reporting

### Redis Cache
- **Functions**:
  - Task queue management
  - Distributed caching
  - Real-time monitoring data
  - Session management

## Installation and Deployment

### Prerequisites
- Docker and Docker Compose
- Minimum 8GB RAM (recommended 16GB)
- GPU support (optional, for AI model acceleration)

### Environment Variables Configuration

Configure in `controller/.env` and `worker/.env`:

```bash
# AI API Keys
COHERE_API_KEY=your_cohere_api_key
GOOGLE_API_KEY=your_google_api_key

# JWT Settings
SECRET_KEY=your_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Starting the System

```bash
# Build and start all services
docker-compose up --build -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### Stopping the System

```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Usage Guide

### 1. System Startup
```bash
# Start complete system
docker-compose up --build -d
```

### 2. Frontend Access
- Register new user account
- Start uploading and searching images

### 3. File Upload
- Support ZIP file batch upload
- Support PDF file upload
- System automatically processes and indexes content

### 4. Search Functionality
- Enter text descriptions to search related images
- Upload images for similarity search
- View search results and related information

---

