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
import base64
from io import BytesIO
import cohere
import random

from dotenv import load_dotenv
load_dotenv()

# 讀取 Worker 名稱
WORKER_NAME = os.getenv("WORKER_NAME", "unknown")

# 資料目錄與 Redis key 設定
UPLOAD_DIR = "/data/uploads"

# 將單一queue換成prefix
QUEUE_PREFIX = "image_queue"
PROCESSING_SET_PREFIX = "processing_set"
DONE_SET_PREFIX = "done_set"

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
COHERE_API_KEY = os.getenv("COHERE_API_KEY")
co = cohere.ClientV2(api_key=COHERE_API_KEY)

caption_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
caption_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base").to(device)
embedder = SentenceTransformer("all-MiniLM-L6-v2")

# 載入 metadata 和 index
# 不需要預先載入全域metadata和index
print(f"Worker '{WORKER_NAME}' started on {device} device")

# 不停循環從 redis 的 image_queue 拿任務出來做
while True:
    try:
        # 1) 先從 Redis 拿出所有 active_users
        user_ids = list(redis.smembers("active_users"))
        # 2) 計算每個 user 的隊列長度
        lengths = []
        total = 0
        for u in user_ids:
            l = redis.llen(f"{QUEUE_PREFIX}:{u}")
            if l > 0:
                lengths.append((u, l))
                total += l
        # 如果沒有任何任務，sleep 然後繼續
        if total == 0:
            time.sleep(0.1)
            continue

        # 3) 按 length 加權隨機選一個 user
        #    （隊列越長被選中的機率越大）
        r = random.uniform(0, total)
        upto = 0
        for (u, l) in lengths:
            upto += l
            if upto >= r:
                selected_user = u
                break

        queue_key = f"{QUEUE_PREFIX}:{selected_user}"
        image_path = redis.rpop(queue_key)
        if not image_path:
            # 這個極少發生，重試一下
            continue

        # --- 拿到一條真正要處理的任務，下面沿用你現有的邏輯，只是把 `user` 換成 selected_user ---
        user = selected_user
        start_time = time.time()
        orig_image_path = image_path  # <== 新增：記住原來的路徑
        redis.set(f"processing_ts:{user}:{image_path}", start_time)
        
        print(f"🔄 Processing image: {image_path} for user {user} by {WORKER_NAME}")

        # 標記處理中並記錄是哪一台
        redis.sadd(f"{PROCESSING_SET_PREFIX}:{user}", image_path)
        redis.hset("processing_workers", f"{user}:{image_path}", WORKER_NAME)
        
        # 使用者特定的路徑
        user_meta = f"/data/metadata_{user}.json"
        user_index = f"/data/index_file_{user}.index"
        user_pdf_index = f"/data/pdf_index_{user}.index"
        user_pdf_meta = f"/data/pdf_metadata_{user}.json"
        
        full_path = os.path.join("/data", image_path)
        try:
            if not os.path.exists(full_path) or not os.path.isfile(full_path):
                raise FileNotFoundError(f"File not found: {full_path}")

            # 開啟圖片
            image = Image.open(full_path).convert("RGB")

            # 動態判斷：是不是上傳到 uploads/{user}/pdfs 下的檔案
            pdf_folder = f"uploads/{user}/pdfs"
            # 把兩邊都標準化一下再比
            norm_image = os.path.normpath(image_path)
            norm_folder = os.path.normpath(pdf_folder)
            print(f"[DEBUG] user={user} pdf_folder={norm_folder} image_path={norm_image}")
            is_pdf_page = norm_image.startswith(norm_folder)

            if is_pdf_page:
                print(f"📄 Processing PDF image with Cohere: {image_path}")

                # 轉成 base64 URL
                buf = BytesIO()
                image.save(buf, format="JPEG")
                b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
                b64_url = f"data:image/jpeg;base64,{b64}"

                image_input = {
                    "content": [
                        {"type": "image_url", "image_url": {"url": b64_url}}
                    ]
                }

                try:
                    res = co.embed(
                        model="embed-v4.0",
                        inputs=[image_input],
                        input_type="search_document",
                        embedding_types=["float"]
                    )
                    vector = np.array(res.embeddings.float_[0], dtype=np.float32)

                    with redis.lock(f"pdf_write_lock:{user}", timeout=10):
                        if os.path.exists(user_pdf_index):
                            pdf_index = faiss.read_index(user_pdf_index)
                        else:
                            pdf_index = faiss.IndexFlatL2(len(vector))

                        if os.path.exists(user_pdf_meta):
                            with open(user_pdf_meta, "r", encoding="utf-8") as f:
                                pdf_meta = json.load(f)
                        else:
                            pdf_meta = []

                        pdf_index.add(np.array([vector]))
                        faiss.write_index(pdf_index, user_pdf_index)

                        pdf_meta.append({"filename": image_path})
                        json.dump(pdf_meta, open(user_pdf_meta, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

                    # 標記完成
                    redis.delete(f"processing_ts:{user}:{orig_image_path}")
                    redis.srem(f"{PROCESSING_SET_PREFIX}:{user}", orig_image_path)
                    redis.hdel("processing_workers", f"{user}:{orig_image_path}")
                    redis.sadd(f"{DONE_SET_PREFIX}:{user}", orig_image_path)

                    print(f"✅ {WORKER_NAME} done {image_path} for user {user} with Cohere embedding")

                    continue  # ❗️這一點很重要，跳過預設 BLIP 處理

                except Exception as e:
                    print(f"❌ Cohere embedding failed for {image_path}: {e}")
                    raise e

            # 用 BLIP 生 caption
            inputs = caption_processor(image, return_tensors="pt").to(device)
            out = caption_model.generate(**inputs, max_length=50)
            caption = caption_processor.decode(out[0], skip_special_tokens=True)

            # 加鎖寫 metadata 和 FAISS
            with redis.lock(f"write_lock:{user}", timeout=10):
                """
                worker 拿到鎖之後
                馬上讀「現在最新磁碟上的 metadata.json、index」
                基於最新版本去加自己的新資料
                以免覆蓋掉其他 worker 的資料
                """
                # 讀使用者的 metadata
                if os.path.exists(user_meta):
                    metadata = json.load(open(user_meta, "r", encoding="utf-8"))
                else:
                    metadata = []

                # 讀使用者的 index
                if os.path.exists(user_index):
                    index = faiss.read_index(user_index)
                else:
                    dim = embedder.get_sentence_embedding_dimension()
                    index = faiss.IndexFlatL2(dim)

                # 更新 metadata
                # 預設欄位
                country = None
                city = None
                date_str = None

                # 若為 HEIC，先提取 metadata，再轉成 JPG 並覆蓋
                if image_path.lower().endswith(".heic"):
                    try:
                        img = Image.open(full_path)

                        # 提取 EXIF
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
                        else:
                            print(f"❌ No EXIF found: {image_path}")

                        # ✅ 轉成 JPG 並覆蓋：uploads/foo.heic → uploads/foo.jpg
                        base_name = os.path.splitext(image_path)[0]  # uploads/foo
                        new_rel_path = base_name + ".jpg"
                        new_abs_path = os.path.join("/data", new_rel_path)

                        img.convert("RGB").save(new_abs_path, "JPEG")

                        # 刪除原始 .heic
                        os.remove(full_path)

                        # 保存舊的.heic路徑用於移除
                        orig_heic_path = orig_image_path  # 暫存原始.heic路徑
                        
                        # 替換 image_path 與 full_path 為新的 .jpg
                        image_path = new_rel_path
                        full_path = new_abs_path
                        
                        # --- HEIC ➜ JPG 成功後同步更新所有Redis keys ---
                        # 0. 準備新舊key
                        old_key = f"{user}:{orig_heic_path}"
                        new_key = f"{user}:{new_rel_path}"
                        
                        # 1. 移除舊 processing 標記
                        redis.delete(f"processing_ts:{user}:{orig_heic_path}")
                        redis.srem(f"{PROCESSING_SET_PREFIX}:{user}", orig_heic_path)
                        redis.hdel("processing_workers", old_key)
                        
                        # 2. 加入新 processing 標記
                        redis.set(f"processing_ts:{user}:{new_rel_path}", time.time())
                        redis.sadd(f"{PROCESSING_SET_PREFIX}:{user}", new_rel_path)
                        redis.hset("processing_workers", new_key, WORKER_NAME)
                        
                        # 3. 更新變數，讓後面清理 / done_set 都用 .jpg
                        orig_image_path = new_rel_path  # 後續 finally/清理用
                        
                        # 4. done_set處理
                        redis.sadd(f"{DONE_SET_PREFIX}:{user}", new_rel_path)
                        redis.srem(f"{DONE_SET_PREFIX}:{user}", orig_heic_path)
                        
                        print(f"🖼️ HEIC converted and replaced: {image_path}")

                    except Exception as e:
                        print(f"⚠️ HEIC metadata or convert failed: {e}")

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
                json.dump(metadata, open(user_meta, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

                # 更新 FAISS
                index.add(np.array([vec]))
                faiss.write_index(index, user_index)

            # 處理完成：移除 processing 記錄、加入 done 並清 processing_workers
            redis.delete(f"processing_ts:{user}:{orig_image_path}")
            redis.srem(f"{PROCESSING_SET_PREFIX}:{user}", orig_image_path)
            redis.hdel("processing_workers", f"{user}:{orig_image_path}")
            redis.sadd(f"{DONE_SET_PREFIX}:{user}", orig_image_path)

            elapsed = time.time() - start_time
            print(f"✅ {WORKER_NAME} done {image_path} for user {user} in {elapsed:.2f}s: {caption}")

        except Exception as e:
            # 處理失敗：清處理時間，記錄 error，並做一次 retry
            error_msg = f"❌ Error processing {image_path} for user {user} by {WORKER_NAME}: {str(e)}"
            print(error_msg)
            print(traceback.format_exc())

            # 清理 processing set
            redis.delete(f"processing_ts:{user}:{orig_image_path}")
            redis.srem(f"{PROCESSING_SET_PREFIX}:{user}", orig_image_path)
            redis.set(f"error:{user}:{orig_image_path}", error_msg)

            # 重試一次
            if not redis.get(f"retry:{user}:{orig_image_path}"):
                print(f"🔄 Requeueing {image_path} for user {user} for retry")
                redis.set(f"retry:{user}:{orig_image_path}", "1")
                redis.lpush(f"{QUEUE_PREFIX}:{user}", image_path)
            else:
                print(f"❌ Failed to process {image_path} for user {user} after retry")

    except Exception as e:
        print(f"⚠️ Worker main loop error: {str(e)}")
        print(traceback.format_exc())
        time.sleep(5)