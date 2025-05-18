# Image Embedding System - API Documentation

## 共通設定
- **Base URL**：`http://<controller-ip>:8000`
- **資料格式**：所有 Request 和 Response 使用 `JSON`
- **CORS**：已開啟，任何來源都可直接呼叫
- **認證**：除了註冊和登入外，所有API都需要JWT認證

---

## 認證相關

### 1. 註冊新使用者
### `POST /signup`
註冊新使用者帳號。

- **Request Payload**（JSON）：
```json
{
  "username": "user1",
  "password": "your_password"
}
```

- **Response Payload**：
```json
{
  "message": "Signup successful"
}
```

### 2. 登入系統
### `POST /login`
登入並取得JWT令牌用於後續API呼叫。

- **Request Payload**（JSON）：
```json
{
  "username": "user1",
  "password": "your_password"
}
```

- **Response Payload**：
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

---

## 上傳功能

### 3. 上傳壓縮檔並排入任務
### `POST /upload`
上傳一個 **zip 檔案**，系統會自動解壓並把圖片排入該使用者的專屬任務佇列。

- **Request Header**：
  - `Authorization: Bearer <your_token>`

- **Request Payload**（Form Data）：
  - `zip_file`：上傳的 ZIP 檔案，內含圖片（支援 `.jpg`, `.jpeg`, `.png`, `.heic`）

- **Response Payload**：
```json
{
  "message": "Uploaded and queued 5 images.",
  "queued": ["uploads/user1/image1.jpg", "uploads/user1/image2.jpg"]
}
```

### 4. 上傳PDF文件或圖像ZIP
### `POST /upload/pdf`
上傳PDF或圖像ZIP，系統會轉換為圖像並排入該使用者的專屬任務佇列。

- **Request Header**：
  - `Authorization: Bearer <your_token>`

- **Request Payload**（Form Data）：
  - `upload_file`：上傳的PDF檔或ZIP檔案

- **Response Payload**：
```json
{
  "message": "Processed 3 pages from PDF.",
  "queued": ["uploads/user1/pdfs/doc_page_001.jpg", "uploads/user1/pdfs/doc_page_002.jpg"]
}
```

---

## 搜尋功能

### 5. 搜尋相似圖片
### `POST /search`
輸入文字（Caption）或上傳圖片，系統用向量比對找出當前使用者空間中最相近的圖片。

- **Request Header**：
  - `Authorization: Bearer <your_token>`

- **Request Payload**（Form Data）：
  - `query`：文字描述（可選）
  - `image`：上傳的圖片文件（可選）
  - `top_k`：要返回的結果數量（選填）

- **Response Payload**：
```json
{
  "results": [
    {
      "filename": "uploads/user1/image1.jpg",
      "caption": "a beautiful sunset over mountains",
      "similarity": 0.87,
      "image_path": "/data/uploads/user1/image1.jpg"
    }
  ]
}
```

### 6. PDF內容搜尋
### `POST /search/pdf`
搜尋使用者上傳的PDF圖像內容。

- **Request Header**：
  - `Authorization: Bearer <your_token>`

- **Request Payload**（JSON）：
```json
{
  "query": "your search query",
  "top_k": 1
}
```

- **Response Payload**：
```json
{
  "query": "your search query",
  "top_result": {
    "filename": "uploads/user1/pdfs/document_page_001.jpg",
    "similarity": 0.85,
    "image_url": "/image/uploads/user1/pdfs/document_page_001.jpg"
  },
  "gemini_answer": "具體回答您的問題..."
}
```

---

## 系統管理

### 7. 查詢系統當前狀態
### `GET /status`
取得目前使用者的任務排隊、處理、完成的狀態。

- **Request Header**：
  - `Authorization: Bearer <your_token>`

- **Response Payload**：
```json
{
  "queue": 10,
  "queued_items": ["uploads/user1/image1.jpg", "uploads/user1/image2.jpg"],
  "processing": ["uploads/user1/image3.jpg"],
  "processing_workers": {"uploads/user1/image3.jpg": "worker1"},
  "done": ["uploads/user1/image4.jpg"],
  "errors": {
    "uploads/user1/image5.jpg": "Error message"
  },
  "retries": {
    "uploads/user1/image5.jpg": "1"
  }
}
```

### 8. 刪除排隊中的任務
### `DELETE /queue/{item}`
從使用者的Redis佇列中刪除一個等待中的圖片，不再處理。

- **Request Header**：
  - `Authorization: Bearer <your_token>`

- **Response Payload**（成功）：
```json
{
  "message": "Removed 1 occurrence(s) of uploads/user1/image1.jpg from queue."
}
```

### 9. 列出已完成的圖片
### `GET /done`
列出當前使用者所有已處理完成的圖片路徑。

- **Request Header**：
  - `Authorization: Bearer <your_token>`

- **Response Payload**：
```json
{
  "done_images": ["uploads/user1/image1.jpg", "uploads/user1/image2.jpg"]
}
```

### 10. 重置系統
### `POST /reset`
清空當前使用者的系統資料，包括：
- 刪除用戶的FAISS向量索引
- 清空用戶的metadata
- 刪除用戶的上傳資料夾內容
- 清空用戶的Redis佇列、處理中、完成、錯誤、重試紀錄

- **Request Header**：
  - `Authorization: Bearer <your_token>`

- **Response Payload**：
```json
{
  "message": "Reset completed for user user1."
}
```

---

## 其他功能

### 11. 取得圖片檔案
### `GET /image/{path}`
直接下載或顯示一張圖片。

- **Request Payload**：無（透過 URL 傳 `path`）

- **Response Payload**（成功）：直接回傳圖片檔案（MIME: `image/jpeg` 或 `image/png`）

- **Response Payload**（失敗）：
```json
{
  "detail": "Image not found"
}
```

### 12. 監控Worker狀態
### `GET /monitor/worker`
監控所有Worker節點的狀態。

- **Response Payload**：
```json
{
  "worker1": {"status": "health", "metrics": {"cpu": 35.2, "mem": 68.7, "ts": 1687426502}},
  "worker2": {"status": "health", "metrics": {"cpu": 28.4, "mem": 52.3, "ts": 1687426501}},
  "worker3": {"status": "dead"}
}
```

### 13. 監控系統事件
### `GET /monitor/events`
監控系統事件（Worker死亡、任務超時等）。

- **Response Payload**：
```json
[
  {"ts": 1687426502, "type": "worker_dead", "worker": "worker3", "requeued": ["uploads/user1/image1.jpg"]},
  {"ts": 1687426430, "type": "task_timeout", "user": "user1", "item": "uploads/user1/image2.jpg"}
]
```

### 14. 重置監控事件
### `POST /monitor/events/reset`
清空監控事件記錄。

- **Response Payload**：
```json
{
  "message": "Monitor events reset successfully."
}
```

---

# 📌 注意事項
- **認證要求**：除了 `/signup` 和 `/login` 外，所有API都要求在Header中提供JWT令牌。
- **多使用者隔離**：每個使用者擁有獨立的任務佇列、處理集合、索引和上傳空間。
- **搜尋功能**：必須在使用者已經有訓練過的索引文件後才能正常使用。
- **圖片路徑**：傳給 `/image/{path}` 時，要確保是從 `/status` 或 `/search` 回傳的 `image_path`。
- **刪除任務**：只能刪除「排隊中」的，不能刪除已經被 worker 拿去處理的。

---

