import os, time, json, shutil, threading, zipfile, asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from redis import Redis
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from transformers import BlipProcessor, BlipForConditionalGeneration
import torch
from PIL import Image
import io
from pillow_heif import register_heif_opener
import piexif
from geopy.geocoders import Nominatim

register_heif_opener()
geolocator = Nominatim(user_agent="image-rag-controller")

def dms_to_decimal(dms, ref):
    degrees = dms[0][0] / dms[0][1]
    minutes = dms[1][0] / dms[1][1]
    seconds = dms[2][0] / dms[2][1]
    decimal = degrees + minutes / 60 + seconds / 3600
    if ref in [b'S', b'W']:
        decimal *= -1
    return round(decimal, 6)

# 監控與回收設定常數
HEARTBEAT_PREFIX      = "heartbeat:"
PROCESSING_TS_PREFIX  = "processing_ts:"
PROCESSING_TIMEOUT    = 20
MONITOR_INTERVAL      = 2
SSE_PUSH_INTERVAL  = 1

# 要監控的 worker 名稱清單
WORKER_NAMES = ["worker1", "worker2", "worker3"]

# 定義 lifespan 以接管啟動時行為
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 啟動監控背景執行緒
    t = threading.Thread(target=monitor_loop, daemon=True)
    t.start()
    yield

app = FastAPI(lifespan=lifespan)
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
MONITOR_CHANNEL = "monitor_events"

# FAISS 與 metadata 設定
META_PATH = os.path.join(DATA_DIR, "metadata.json")
INDEX_PATH = os.path.join(DATA_DIR, "index_file.index")
embedder = SentenceTransformer("all-MiniLM-L6-v2")

device = "cuda" if torch.cuda.is_available() else "cpu"
blip_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
blip_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base").to(device)

# 偵測死掉節點 & 超時任務回收
def monitor_loop():
    while True:
        now = time.time()
        # Dead worker 檢測
        active = redis.smembers("active_workers")
        for worker in active:
            if not redis.exists(HEARTBEAT_PREFIX + worker):
                proc_map = redis.hgetall("processing_workers")
                requeued = []
                for item, w in proc_map.items():
                    if w == worker:
                        redis.srem(PROCESSING_SET, item)
                        redis.hdel("processing_workers", item)
                        redis.lpush(QUEUE, item)
                        requeued.append(item)
                event = {"ts": now, "type": "worker_dead", "worker": worker, "requeued": requeued}
                redis.lpush(MONITOR_CHANNEL, json.dumps(event))
                redis.srem("active_workers", worker)
        # Timeout 任務回收
        for item in redis.smembers(PROCESSING_SET):
            ts_key = PROCESSING_TS_PREFIX + item
            ts = redis.get(ts_key)
            if ts and now - float(ts) > PROCESSING_TIMEOUT:
                redis.srem(PROCESSING_SET, item)
                redis.hdel("processing_workers", item)
                redis.delete(ts_key)
                redis.lpush(QUEUE, item)
                event = {"ts": now, "type": "task_timeout", "item": item}
                redis.lpush(MONITOR_CHANNEL, json.dumps(event))
        time.sleep(MONITOR_INTERVAL)

# 其他 API 保持不變
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
            if fname.lower().endswith((".jpg", ".jpeg", ".png", ".heic")):
                rel = os.path.relpath(os.path.join(root, fname), DATA_DIR)
                redis.lpush(QUEUE, rel)
                count += 1
    return {"message": f"Uploaded and queued {count} images."}

@app.post("/search")
async def search(
    query: Optional[str] = None,
    image: Optional[UploadFile] = File(None),
    top_k: Optional[int] = 5
):
    if not os.path.exists(META_PATH) or not os.path.exists(INDEX_PATH):
        raise HTTPException(status_code=400, detail="Metadata or index not found")
    
    if not query and not image:
        raise HTTPException(status_code=400, detail="Must provide a query or image")

    # 載入資料
    with open(META_PATH, "r", encoding="utf-8") as f:
        metadata = json.load(f)
    index = faiss.read_index(INDEX_PATH)

    # 文字或圖片轉換為 query 向量
    device = "cuda" if torch.cuda.is_available() else "cpu"

    if image:
        image_bytes = await image.read()
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # Run BLIP to get caption
        inputs = blip_processor(img, return_tensors="pt").to(device)
        out = blip_model.generate(**inputs, max_length=50)
        caption = blip_processor.decode(out[0], skip_special_tokens=True)

        # 預設 metadata
        country = None
        city = None
        date_str = None

        # 如果是 HEIC 試圖解析 EXIF
        if image.filename.lower().endswith(".heic"):
            try:
                exif_bytes = img.info.get("exif")
                if exif_bytes:
                    exif_dict = piexif.load(exif_bytes)
                    # 時間
                    date_bytes = exif_dict.get("Exif", {}).get(piexif.ExifIFD.DateTimeOriginal)
                    if date_bytes:
                        date_str = date_bytes.decode(errors="ignore").split(" ")[0].replace(":", "-")
                    # GPS
                    gps = exif_dict.get("GPS", {})
                    lat = gps.get(piexif.GPSIFD.GPSLatitude)
                    lat_ref = gps.get(piexif.GPSIFD.GPSLatitudeRef)
                    lon = gps.get(piexif.GPSIFD.GPSLongitude)
                    lon_ref = gps.get(piexif.GPSIFD.GPSLongitudeRef)

                    if lat and lat_ref and lon and lon_ref:
                        lat_decimal = dms_to_decimal(lat, lat_ref)
                        lon_decimal = dms_to_decimal(lon, lon_ref)

                        location = geolocator.reverse((lat_decimal, lon_decimal), language="en", timeout=10)
                        if location and "address" in location.raw:
                            addr = location.raw["address"]
                            country = addr.get("country")
                            city = addr.get("city", addr.get("town", addr.get("village")))
            except Exception as e:
                print(f"⚠️ Failed to extract HEIC metadata: {e}")

        # 組合 query: metadata + caption
        query = f"{caption}. Location: {city or ''}, {country or ''}. Date: {date_str or ''}."
        print(f"🖼️ Final query from image: {query}")

    query_vec = embedder.encode(query)
    top_k = min(top_k, len(metadata))
    D, I = index.search(np.array([query_vec]), top_k)

    results = []
    for idx, dist in zip(I[0], D[0]):
        info = metadata[idx]
        results.append({
            "filename": info["filename"],
            "caption": info["caption"],
            "similarity": float(1 - dist / 100),
            "image_path": os.path.join(DATA_DIR, info["filename"])
        })
    return {"results": results}

@app.get("/image/{path:path}")
def get_image(path: str):
    full = os.path.join(DATA_DIR, path)
    if os.path.isfile(full):
        return FileResponse(full)
    raise HTTPException(status_code=404, detail="Image not found")

@app.post("/reset")
def reset_system():
    if os.path.exists(INDEX_PATH): os.remove(INDEX_PATH)
    with open(META_PATH, "w", encoding="utf-8") as f: json.dump([], f)
    if os.path.exists(UPLOAD_DIR): shutil.rmtree(UPLOAD_DIR)
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    redis.delete(QUEUE, PROCESSING_SET, DONE_SET)
    for k in redis.keys("error:*"): redis.delete(k)
    for k in redis.keys("retry:*"): redis.delete(k)
    return {"message": "System reset completed."}

# 三個 SSE Endpoints
@app.get("/status")
async def status_sse():
    async def event_generator():
        while True:
            data = {
                "queue": redis.llen(QUEUE),
                "queued_items": redis.lrange(QUEUE, 0, -1),
                "processing": list(redis.smembers(PROCESSING_SET)),
                "processing_workers": redis.hgetall("processing_workers"),
                "done": list(redis.smembers(DONE_SET)),
                "errors": {item: redis.get(f"error:{item}") for item in list(redis.smembers(PROCESSING_SET)) + list(redis.smembers(DONE_SET)) if redis.exists(f"error:{item}")},
                "retries": {item: redis.get(f"retry:{item}") for item in list(redis.smembers(PROCESSING_SET)) + list(redis.smembers(DONE_SET)) if redis.exists(f"retry:{item}")}
            }
            yield f"data: {json.dumps(data)}\n\n"
            await asyncio.sleep(SSE_PUSH_INTERVAL)
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/monitor/worker")
async def worker_sse():
    async def event_generator():
        while True:
            raw = redis.hgetall("node_metrics")
            status = {}
            for w in WORKER_NAMES:
                if redis.exists(HEARTBEAT_PREFIX + w):
                    metrics = json.loads(raw.get(w, "{}"))
                    status[w] = {"status": "health", "metrics": metrics}
                else:
                    status[w] = {"status": "dead"}
            yield f"data: {json.dumps(status)}\n\n"
            await asyncio.sleep(SSE_PUSH_INTERVAL)
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/monitor/events")
async def events_sse(limit: int = 50):
    async def event_generator():
        while True:
            items = redis.lrange(MONITOR_CHANNEL, 0, limit - 1)
            evs = [json.loads(i) for i in items]
            yield f"data: {json.dumps(evs)}\n\n"
            await asyncio.sleep(SSE_PUSH_INTERVAL)
    return StreamingResponse(event_generator(), media_type="text/event-stream")

# delete 佇列中的項目
@app.delete("/queue/{item:path}")
def delete_queued_item(item: str):
    removed = redis.lrem(QUEUE, 0, item)
    if removed == 0:
        raise HTTPException(status_code=404, detail=f"Item {item} not found in queue")
    return {"message": f"Removed {removed} occurrence(s) of {item} from queue."}

@app.get("/done")
def list_done_images():
    return {"done_images": list(redis.smembers(DONE_SET))}

@app.post("/monitor/events/reset")
def reset_monitor_events():
    if redis.exists(MONITOR_CHANNEL):
        redis.delete(MONITOR_CHANNEL)
        return {"message": "Monitor events reset successfully."}
    else:
        return {"message": "No monitor events to reset."}
