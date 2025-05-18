FROM python:3.10-slim
WORKDIR /app
COPY . .

RUN apt-get update && apt-get install -y \
    poppler-utils \
    gcc \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    fastapi uvicorn python-multipart redis faiss-cpu \
    sentence-transformers transformers torch pillow \
    pillow-heif piexif geopy psutil pdf2image cohere google-generativeai python-dotenv

RUN python -c "from transformers import BlipProcessor, BlipForConditionalGeneration; \
               BlipProcessor.from_pretrained('Salesforce/blip-image-captioning-base'); \
               BlipForConditionalGeneration.from_pretrained('Salesforce/blip-image-captioning-base')"

RUN python -c "from sentence_transformers import SentenceTransformer; \
               SentenceTransformer('all-MiniLM-L6-v2')"


CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]