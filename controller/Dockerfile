FROM python:3.10-slim
WORKDIR /app
COPY . .
RUN pip install fastapi uvicorn python-multipart redis faiss-cpu sentence-transformers transformers torch pillow
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]