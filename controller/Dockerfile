FROM python:3.10-slim
WORKDIR /app
COPY . .

RUN pip install --no-cache-dir \
    fastapi uvicorn python-multipart redis faiss-cpu \
    sentence-transformers transformers torch pillow \
    pillow-heif piexif geopy psutil

RUN python -c "from transformers import BlipProcessor, BlipForConditionalGeneration; \
               BlipProcessor.from_pretrained('Salesforce/blip-image-captioning-base'); \
               BlipForConditionalGeneration.from_pretrained('Salesforce/blip-image-captioning-base')"

RUN python -c "from sentence_transformers import SentenceTransformer; \
               SentenceTransformer('all-MiniLM-L6-v2')"


CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]