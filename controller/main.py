from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
import zipfile, os, json, shutil
from redis import Redis
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# 資料與 Redis 設定
DATA_DIR = "/data"
UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
redis = Redis(host="redis", port=6379, decode_responses=True)
QUEUE = "image_queue"
PROCESSING_SET = "processing_set"
DONE_SET = "done_set"

# FAISS 與 metadata 設定
META_PATH = os.path.join(DATA_DIR, "metadata.json")
INDEX_PATH = os.path.join(DATA_DIR, "index_file.index")
embedder = SentenceTransformer("all-MiniLM-L6-v2")

@app.post("/upload")
def upload_zip(zip_file: UploadFile = File(...)):
    zip_path = os.path.join(UPLOAD_DIR, zip_file.filename)
    with open(zip_path, "wb") as f:
        f.write(zip_file.file.read())
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(UPLOAD_DIR)
    os.remove(zip_path)
    count = 0
    for root, _, files in os.walk(UPLOAD_DIR):
        for fname in files:
            # 支援 .jpg, .jpeg, .png 三種格式
            if fname.lower().endswith((".jpg", ".jpeg", ".png")):
                relative_path = os.path.relpath(os.path.join(root, fname), DATA_DIR)
                redis.lpush(QUEUE, relative_path)
                count += 1
    return {"message": f"Uploaded and queued {count} images."}

@app.get("/status")
def get_status():
    # 數量資訊
    queue_count = redis.llen(QUEUE)
    processing_items = list(redis.smembers(PROCESSING_SET))
    done_items = list(redis.smembers(DONE_SET))
    # 列表資訊
    queued_raw = redis.lrange(QUEUE, 0, -1)
    queued_items = [{"item": item, "delete_url": f"/queue/{item}"} for item in queued_raw]

    # 錯誤與重試資訊
    errors = {}
    for item in processing_items + done_items:
        key = f"error:{item}"
        if redis.exists(key):
            errors[item] = redis.get(key)
    retries = {}
    for item in processing_items + done_items:
        key = f"retry:{item}"
        if redis.exists(key):
            retries[item] = redis.get(key)

    # 節點映射與資源使用
    processing_workers = redis.hgetall("processing_workers")
    node_metrics_raw = redis.hgetall("node_metrics")
    node_metrics = {node: json.loads(v) for node, v in node_metrics_raw.items()}

    return {
        "queue": queue_count,
        "queued_items": queued_items,
        "processing": processing_items,
        "done": done_items,
        "errors": errors,
        "retries": retries,
        "processing_workers": processing_workers,
        "node_metrics": node_metrics
    }

@app.delete("/queue/{item}")
def delete_queued_item(item: str):
    # 從佇列中刪除指定項目
    removed = redis.lrem(QUEUE, 0, item)
    if removed == 0:
        raise HTTPException(status_code=404, detail=f"Item {item} not found in queue")
    return {"message": f"Removed {removed} occurrence(s) of {item} from queue."}

class SearchQuery(BaseModel):
    query: str
    top_k: Optional[int] = 5

@app.post("/search")
def search(query: SearchQuery):
    # 確認資料存在
    if not os.path.exists(META_PATH):
        raise HTTPException(status_code=400, detail="Metadata file not found")
    if not os.path.exists(INDEX_PATH):
        raise HTTPException(status_code=400, detail="FAISS index file not found")

    with open(META_PATH, "r", encoding="utf-8") as f:
        metadata = json.load(f)
    
    index = faiss.read_index(INDEX_PATH)
    query_vec = embedder.encode(query.query)
    top_k = min(query.top_k, len(metadata))
    D, I = index.search(np.array([query_vec]), top_k)
    
    results = []
    for idx, distance in zip(I[0], D[0]):
        if idx < len(metadata):
            info = metadata[idx]
            results.append({
                "filename": info["filename"],
                "caption": info["caption"],
                "similarity": float(1 - distance/100),
                "image_path": os.path.join(DATA_DIR, info["filename"])
            })
    return {"results": results}

@app.get("/image/{path:path}")
def get_image(path: str):
    if not path:
        raise HTTPException(status_code=400, detail="Image path cannot be empty")
    full = os.path.join(DATA_DIR, path)
    if os.path.exists(full) and os.path.isfile(full):
        return FileResponse(full)
    raise HTTPException(status_code=404, detail="Image not found or path is a directory")

@app.post("/reset")
def reset_system():
    # 刪除 FAISS 與 metadata
    if os.path.exists(INDEX_PATH):
        os.remove(INDEX_PATH)
    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump([], f)
    # 重建 uploads 資料夾
    if os.path.exists(UPLOAD_DIR):
        shutil.rmtree(UPLOAD_DIR)
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    # 清空 Redis
    redis.delete(QUEUE)
    redis.delete(PROCESSING_SET)
    redis.delete(DONE_SET)
    for key in redis.keys("error:*"):
        redis.delete(key)
    for key in redis.keys("retry:*"):
        redis.delete(key)
    return {"message": "System reset completed."}
