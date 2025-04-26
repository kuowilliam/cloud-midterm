import os, time, json, traceback
from threading import Thread
import psutil
from redis import Redis
from PIL import Image
import numpy as np
from sentence_transformers import SentenceTransformer
from transformers import BlipProcessor, BlipForConditionalGeneration
import faiss
import torch

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

# 連線 Redis
redis = Redis(host="redis", port=6379, decode_responses=True)

device = "cuda" if torch.cuda.is_available() else "cpu"

# 模型載入
caption_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
caption_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base").to(device)
embedder = SentenceTransformer("all-MiniLM-L6-v2")

# 初始化 metadata 和 index
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

# 處理超時秒數（保留擴充用）
PROCESSING_TIMEOUT = 60

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
            # 如有錯誤就打印，但不影響主循環
            print(f"⚠️ Failed to publish metrics: {traceback.format_exc()}")
        time.sleep(4)  # 剩餘時間睡眠

# 啟動 metrics thread
Thread(target=publish_metrics, daemon=True).start()

print(f"Worker '{WORKER_NAME}' started on {device} device")

# 主循環：處理任務
while True:
    try:
        image_path = redis.rpop(QUEUE)
        if not image_path:
            time.sleep(1)
            continue

        print(f"🔄 Processing image: {image_path} by {WORKER_NAME}")

        # 標記處理中並記錄是哪一台
        redis.sadd(PROCESSING_SET, image_path)
        redis.hset("processing_workers", image_path, WORKER_NAME)
        start_time = time.time()
        full_path = os.path.join("/data", image_path)

        try:
            if not os.path.exists(full_path) or not os.path.isfile(full_path):
                raise FileNotFoundError(f"File not found: {full_path}")

            image = Image.open(full_path).convert("RGB")

            # 生成描述
            inputs = caption_processor(image, return_tensors="pt").to(device)
            out = caption_model.generate(**inputs, max_length=50)
            caption = caption_processor.decode(out[0], skip_special_tokens=True)

            # 生成向量
            vec = embedder.encode(caption).astype(np.float32)

            # 加鎖寫 metadata 和 FAISS
            with redis.lock("write_lock", timeout=10):
                # 讀 metadata
                if os.path.exists(META_PATH):
                    with open(META_PATH, "r", encoding="utf-8") as f:
                        metadata = json.load(f)
                else:
                    metadata = []

                # 讀 index
                if os.path.exists(INDEX_PATH):
                    index = faiss.read_index(INDEX_PATH)
                else:
                    dim = embedder.get_sentence_embedding_dimension()
                    index = faiss.IndexFlatL2(dim)

                # 更新 metadata
                metadata.append({
                    "filename": image_path,
                    "caption": caption
                })
                with open(META_PATH, "w", encoding="utf-8") as f:
                    json.dump(metadata, f, ensure_ascii=False, indent=2)

                # 更新 FAISS
                index.add(np.array([vec]))
                faiss.write_index(index, INDEX_PATH)

            # 處理完成：移除 processing 記錄、加入 done 並清 processing_workers
            redis.srem(PROCESSING_SET, image_path)
            redis.hdel("processing_workers", image_path)
            redis.sadd(DONE_SET, image_path)

            processing_time = time.time() - start_time
            print(f"✅ {WORKER_NAME} processed {image_path} in {processing_time:.2f}s: {caption}")

        except Exception as e:
            error_msg = f"❌ Error processing {image_path} by {WORKER_NAME}: {str(e)}"
            print(error_msg)
            print(traceback.format_exc())

            # 清理 processing set
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
