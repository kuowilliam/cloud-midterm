# Image Embedding System - API Documentation

## 共通設定
- **Base URL**：`http://<controller-ip>:8000`
- **資料格式**：所有 Request 和 Response 使用 `JSON`
- **CORS**：已開啟，任何來源都可直接呼叫

---

## 1. 上傳壓縮檔並排入任務
### `POST /upload`
上傳一個 **zip 檔案**，系統會自動解壓並把圖片排入 Redis 任務佇列。

- **Request Payload**（Form Data）：
  - `zip_file`：上傳的 ZIP 檔案，內含圖片（支援 `.jpg`, `.jpeg`, `.png`）

- **Response Payload**：
```json
{
  "message": "Uploaded and queued X images."
}
```

---

## 2. 查詢系統當前狀態
### `GET /status`
取得目前任務排隊、處理、完成的狀態。

- **Request Payload**：無

- **Response Payload**：
```json
{
  "queue": 10,
  "queued_items": [
    {"item": "uploads/xxx.jpg", "delete_url": "/queue/uploads/xxx.jpg"}
  ],
  "processing": ["uploads/xxx.jpg"],
  "done": ["uploads/xxx.jpg"],
  "errors": {
    "uploads/xxx.jpg": "Error message"
  },
  "retries": {
    "uploads/xxx.jpg": 2
  },
  "processing_workers": {
    "worker1": "uploads/xxx.jpg"
  },
  "node_metrics": {
    "worker1": {
      "processed": 5,
      "errors": 1
    }
  }
}
```

---

## 3. 刪除排隊中的任務
### `DELETE /queue/{item}`
從 Redis 佇列中刪除一個等待中的圖片，不再處理。

- **Request Payload**：無（透過 URL 傳 `item`）

- **Response Payload**（成功）：
```json
{
  "message": "Removed 1 occurrence(s) of uploads/xxx.jpg from queue."
}
```

- **Response Payload**（失敗）：
```json
{
  "detail": "Item uploads/xxx.jpg not found in queue"
}
```

---

## 4. 搜尋相似圖片
### `POST /search`
輸入文字（Caption），系統用向量比對找出最相近的圖片。

- **Request Payload**（JSON）：
```json
{
  "query": "your text description",
  "top_k": 5
}
```

- **Response Payload**：
```json
{
  "results": [
    {
      "filename": "uploads/xxx.jpg",
      "caption": "example caption",
      "similarity": 0.89,
      "image_path": "/data/uploads/xxx.jpg"
    }
  ]
}
```

---

## 5. 取得圖片檔案
### `GET /image/{path}`
直接下載或顯示一張圖片。

- **Request Payload**：無（透過 URL 傳 `path`）

- **Response Payload**（成功）：直接回傳圖片檔案（MIME: `image/jpeg` 或 `image/png`）

- **Response Payload**（失敗）：
```json
{
  "detail": "Image not found or path is a directory"
}
```

---

## 6. 重置系統
### `POST /reset`
清空系統，包括：
- 刪除 FAISS 向量索引
- 清空 metadata
- 刪除上傳資料夾內容
- 清空 Redis 佇列、處理中、完成、錯誤、重試紀錄

- **Request Payload**：無

- **Response Payload**：
```json
{
  "message": "System reset completed."
}
```

---

# 📌 注意事項
- **搜尋**功能必須在有訓練過的 `index_file.index` 和 `metadata.json` 存在時才能正常使用。
- **圖片路徑**傳給 `/image/{path}` 時，要確保是從 `/status` 或 `/search` 回傳的 `image_path`。
- **刪除任務**只能刪除「排隊中」的，不能刪除已經被 worker 拿去處理的。

---

