# Image Embedding System - API Documentation

## Common Settings
- **Data Format**: All Requests and Responses use `JSON`
- **CORS**: Enabled, any origin can call directly
- **Authentication**: All APIs require JWT authentication except for signup and login

---

## Authentication

### 1. Register New User
### `POST /signup`
Register a new user account.

- **Request Payload** (JSON):
```json
{
  "username": "user1",
  "password": "your_password"
}
```

- **Response Payload**:
```json
{
  "message": "Signup successful"
}
```

### 2. Login System
### `POST /login`
Login and obtain JWT token for subsequent API calls.

- **Request Payload** (Form Data):
  - `username`: Username
  - `password`: Password

- **Response Payload**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

---

## Upload Functions

### 3. Upload ZIP File and Queue Tasks
### `POST /upload`
Upload a **ZIP file**, the system will automatically extract and queue images to the user's dedicated task queue.

- **Request Header**:
  - `Authorization: Bearer <your_token>`

- **Request Payload** (Form Data):
  - `zip_file`: Uploaded ZIP file containing images (supports `.jpg`, `.jpeg`, `.png`, `.heic`)

- **Response Payload**:
```json
{
  "message": "Uploaded and queued 5 images.",
  "queued": ["uploads/user1/image1.jpg", "uploads/user1/image2.jpg"]
}
```

### 4. Upload PDF Document or Image ZIP
### `POST /upload/pdf`
Upload PDF or image ZIP, the system will convert to images and queue to the user's dedicated task queue.

- **Request Header**:
  - `Authorization: Bearer <your_token>`

- **Request Payload** (Form Data):
  - `upload_file`: Uploaded PDF file or ZIP file

- **Response Payload**:
```json
{
  "message": "Processed 3 pages from PDF.",
  "queued": ["uploads/user1/pdfs/doc_page_001.jpg", "uploads/user1/pdfs/doc_page_002.jpg"]
}
```

---

## Search Functions

### 5. Search Similar Images
### `POST /search`
Enter text (caption) or upload an image, the system uses vector comparison to find the most similar images in the current user's space.

- **Request Header**:
  - `Authorization: Bearer <your_token>`

- **Request Payload** (Form Data):
  - `query`: Text description (optional)
  - `image`: Uploaded image file (optional)
  - `top_k`: Number of results to return (optional, default: 5)

- **Response Payload**:
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

### 6. PDF Content Search
### `POST /search/pdf`
Search image content from user-uploaded PDFs.

- **Request Header**:
  - `Authorization: Bearer <your_token>`

- **Request Payload** (Form Data):
  - `query`: Search query
  - `top_k`: Number of results (optional, default: 1)

- **Response Payload**:
```json
{
  "query": "your search query",
  "top_result": {
    "filename": "uploads/user1/pdfs/document_page_001.jpg",
    "similarity": 0.85,
    "image_url": "/image/uploads/user1/pdfs/document_page_001.jpg"
  },
  "gemini_answer": "Specific answer to your question..."
}
```

---

## System Management

### 7. Query System Current Status
### `GET /status`
Get the current user's task queue, processing, and completion status.

- **Request Header**:
  - `Authorization: Bearer <your_token>`

- **Response Payload** (Server-Sent Events):
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

### 8. Delete Queued Task
### `DELETE /queue/{item}`
Delete a waiting image from the user's Redis queue, no longer processing.

- **Request Header**:
  - `Authorization: Bearer <your_token>`

- **Response Payload** (Success):
```json
{
  "message": "Removed 1 occurrence(s) of uploads/user1/image1.jpg from queue."
}
```

### 9. List Completed Images
### `GET /done`
List all processed image paths for the current user.

- **Request Header**:
  - `Authorization: Bearer <your_token>`

- **Response Payload**:
```json
{
  "done_images": ["uploads/user1/image1.jpg", "uploads/user1/image2.jpg"]
}
```

### 10. Reset System
### `POST /reset`
Clear current user's system data, including:
- Delete user's FAISS vector index
- Clear user's metadata
- Delete user's upload folder contents
- Clear user's Redis queue, processing, done, errors, retry records

- **Request Header**:
  - `Authorization: Bearer <your_token>`

- **Response Payload**:
```json
{
  "message": "Reset completed for user user1."
}
```

---

## Other Functions

### 11. Get Image File
### `GET /image/{path}`
Directly download or display an image.

- **Request Payload**: None (pass `path` via URL)

- **Response Payload** (Success): Directly return image file (MIME: `image/jpeg` or `image/png`)

- **Response Payload** (Failure):
```json
{
  "detail": "Image not found"
}
```

### 12. Monitor Worker Status
### `GET /monitor/worker`
Monitor status of all Worker nodes.

- **Response Payload** (Server-Sent Events):
```json
{
  "worker1": {"status": "health", "metrics": {"cpu": 35.2, "mem": 68.7, "ts": 1687426502}},
  "worker2": {"status": "health", "metrics": {"cpu": 28.4, "mem": 52.3, "ts": 1687426501}},
  "worker3": {"status": "dead"}
}
```

### 13. Monitor System Events
### `GET /monitor/events`
Monitor system events (Worker death, task timeout, etc.).

- **Response Payload** (Server-Sent Events):
```json
[
  {"ts": 1687426502, "type": "worker_dead", "worker": "worker3", "requeued": ["uploads/user1/image1.jpg"]},
  {"ts": 1687426430, "type": "task_timeout", "user": "user1", "item": "uploads/user1/image2.jpg"}
]
```

### 14. Reset Monitor Events
### `POST /monitor/events/reset`
Clear monitor event records.

- **Response Payload**:
```json
{
  "message": "Monitor events reset successfully."
}
```

