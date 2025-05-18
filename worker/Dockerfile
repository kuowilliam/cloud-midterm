FROM python:3.10-slim
WORKDIR /app
COPY . .
RUN pip install transformers sentence-transformers torch redis pillow faiss-cpu psutil pillow-heif piexif geopy cohere python-dotenv

RUN python -c "from transformers import BlipProcessor, BlipForConditionalGeneration; \
               BlipProcessor.from_pretrained('Salesforce/blip-image-captioning-base'); \
               BlipForConditionalGeneration.from_pretrained('Salesforce/blip-image-captioning-base')"

RUN python -c "from sentence_transformers import SentenceTransformer; \
               SentenceTransformer('all-MiniLM-L6-v2')"
               
CMD ["python", "worker.py"]