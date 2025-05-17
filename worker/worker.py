import os, time, json, traceback, atexit
from threading import Thread
import psutil
from redis import Redis
from PIL import Image
import numpy as np
from sentence_transformers import SentenceTransformer
from transformers import BlipProcessor, BlipForConditionalGeneration
import faiss
import torch
from pillow_heif import register_heif_opener
import piexif
from geopy.geocoders import Nominatim

# 讀取 Worker 名稱
WORKER_NAME = os.getenv("WORKER_NAME", "unknown")

# 資料目錄與 Redis key 設定
UPLOAD_DIR = "/data/uploads"
META_PATH = "/data/metadata.json"
INDEX_PATH = "/data/index_file.index"

QUEUE = "image_queue"
PROCESSING_SET = "processing_set"
DONE_SET = "done_set"

# Metrics Hash 名稱
METRICS_HASH = "node_metrics"

HEARTBEAT_KEY     = f"heartbeat:{WORKER_NAME}"
HEARTBEAT_EXPIRE  = 5    # 心跳 key 過期時間 (秒)
HEARTBEAT_INTERVAL= 1     # 心跳更新間隔 (秒)

register_heif_opener()
geolocator = Nominatim(user_agent="image-rag")

def dms_to_decimal(dms, ref):
    degrees = dms[0][0] / dms[0][1]
    minutes = dms[1][0] / dms[1][1]
    seconds = dms[2][0] / dms[2][1]
    decimal = degrees + minutes / 60 + seconds / 3600
    if ref in [b'S', b'W']:
        decimal *= -1
    return round(decimal, 6)

# 連線 Redis
redis = Redis(host="redis", port=6379, decode_responses=True)

# 將自己註冊到 active_workers set 裡，監控程式可用來知道哪些節點上線
redis.sadd("active_workers", WORKER_NAME)
# 重新開機就馬上送出第一顆心跳
redis.set(HEARTBEAT_KEY, time.time(), ex=HEARTBEAT_EXPIRE)

def on_exit():
    redis.srem("active_workers", WORKER_NAME)
atexit.register(on_exit)

def publish_heartbeat():
    while True:
        # 每 HEARTBEAT_INTERVAL 秒更新一次，並設定自動過期
        redis.set(HEARTBEAT_KEY, time.time(), ex=HEARTBEAT_EXPIRE)
        time.sleep(HEARTBEAT_INTERVAL)

# Metrics 上報：定期將 CPU% 與 Memory% 寫入 Redis hash
def publish_metrics():
    while True:
        # psutil.cpu_percent(interval=1) 會阻塞 1 秒採樣
        cpu = psutil.cpu_percent(interval=1)
        mem = psutil.virtual_memory().percent
        timestamp = time.time()
        data = {"cpu": cpu, "mem": mem, "ts": timestamp}
        try:
            redis.hset(METRICS_HASH, WORKER_NAME, json.dumps(data))
        except Exception:
            print(f"⚠️ Failed to publish metrics: {traceback.format_exc()}")
        time.sleep(2)  # 剩餘時間睡眠

# 啟動背景thread
Thread(target=publish_heartbeat, daemon=True).start()
Thread(target=publish_metrics, daemon=True).start()

device = "cuda" if torch.cuda.is_available() else "cpu"
# 模型載入
caption_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
caption_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base").to(device)
embedder = SentenceTransformer("all-MiniLM-L6-v2")

# 載入 metadata 和 index
if os.path.exists(META_PATH):
    with open(META_PATH, "r", encoding="utf-8") as f:
        metadata = json.load(f)
else:
    metadata = []
if os.path.exists(INDEX_PATH):
    index = faiss.read_index(INDEX_PATH)
else:
    dim = embedder.get_sentence_embedding_dimension()
    index = faiss.IndexFlatL2(dim)

print(f"Worker '{WORKER_NAME}' started on {device} device")

# 不停循環從 redis 的 image_queue 拿任務出來做
while True:
    try:
        image_path = redis.rpop(QUEUE)
        if not image_path:
            time.sleep(1)
            continue
        
        # 記錄「任務開始時間」，並寫入 processing timestamp
        start_time = time.time()
        redis.set(f"processing_ts:{image_path}", start_time)
        
        print(f"🔄 Processing image: {image_path} by {WORKER_NAME}")

        # 標記處理中並記錄是哪一台
        redis.sadd(PROCESSING_SET, image_path)
        redis.hset("processing_workers", image_path, WORKER_NAME)
        
        full_path = os.path.join("/data", image_path)
        try:
            if not os.path.exists(full_path) or not os.path.isfile(full_path):
                raise FileNotFoundError(f"File not found: {full_path}")

            # 用 BLIP 生 caption
            image = Image.open(full_path).convert("RGB")
            inputs = caption_processor(image, return_tensors="pt").to(device)
            out = caption_model.generate(**inputs, max_length=50)
            caption = caption_processor.decode(out[0], skip_special_tokens=True)

            # 加鎖寫 metadata 和 FAISS
            with redis.lock("write_lock", timeout=10):
                """
                worker 拿到鎖之後
                馬上讀「現在最新磁碟上的 metadata.json、index」
                基於最新版本去加自己的新資料
                以免覆蓋掉其他 worker 的資料
                """
                # 讀 metadata
                if os.path.exists(META_PATH):
                    metadata = json.load(open(META_PATH, "r", encoding="utf-8"))
                else:
                    metadata = []

                # 讀 index
                if os.path.exists(INDEX_PATH):
                    index = faiss.read_index(INDEX_PATH)
                else:
                    dim = embedder.get_sentence_embedding_dimension()
                    index = faiss.IndexFlatL2(dim)

                # 更新 metadata
                # 預設欄位
                country = None
                city = None
                date_str = None

                if image_path.lower().endswith(".heic"):
                    try:
                        img = Image.open(full_path)
                        exif_bytes = img.info.get("exif")
                        if not exif_bytes:
                            print(f"❌ No EXIF found: {image_path}")
                        else:
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
                        print(f"⚠️ HEIC metadata 提取失敗: {e}")

                # 這裡添加移動過來的向量生成代碼
                full_text = f"{caption}. Location: {city}, {country}. Date: {date_str or ''}."
                vec = embedder.encode(full_text).astype(np.float32)

                entry = {
                    "filename": image_path,
                    "caption": caption
                }
                if country:
                    entry["country"] = country
                if city:
                    entry["city"] = city
                if date_str:
                    entry["date"] = date_str

                metadata.append(entry)
                json.dump(metadata, open(META_PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

                # 更新 FAISS
                index.add(np.array([vec]))
                faiss.write_index(index, INDEX_PATH)

            # 處理完成：移除 processing 記錄、加入 done 並清 processing_workers
            redis.delete(f"processing_ts:{image_path}")
            redis.srem(PROCESSING_SET, image_path)
            redis.hdel("processing_workers", image_path)
            redis.sadd(DONE_SET, image_path)

            elapsed = time.time() - start_time
            print(f"✅ {WORKER_NAME} done {image_path} in {elapsed:.2f}s: {caption}")

        except Exception as e:
            # 處理失敗：清處理時間，記錄 error，並做一次 retry
            error_msg = f"❌ Error processing {image_path} by {WORKER_NAME}: {str(e)}"
            print(error_msg)
            print(traceback.format_exc())

            # 清理 processing set
            redis.delete(f"processing_ts:{image_path}")
            redis.srem(PROCESSING_SET, image_path)
            redis.set(f"error:{image_path}", error_msg)

            # 重試一次
            if not redis.get(f"retry:{image_path}"):
                print(f"🔄 Requeueing {image_path} for retry")
                redis.set(f"retry:{image_path}", "1")
                redis.lpush(QUEUE, image_path)
            else:
                print(f"❌ Failed to process {image_path} after retry")

    except Exception as e:
        print(f"⚠️ Worker main loop error: {str(e)}")
        print(traceback.format_exc())
        time.sleep(5)