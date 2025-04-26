import os
import requests
import streamlit as st
from PIL import Image
from io import BytesIO
import time
import pandas as pd

# 解決 Torch 跟 Streamlit watcher 衝突的報錯
os.environ["STREAMLIT_WATCHER_TYPE"] = "none"

# API 端點設定
API_BASE_URL = "http://localhost:8000"
SEARCH_URL = f"{API_BASE_URL}/search"
IMAGE_URL = f"{API_BASE_URL}/image"
STATUS_URL = f"{API_BASE_URL}/status"
UPLOAD_URL = f"{API_BASE_URL}/upload"

# Streamlit 介面設定
st.set_page_config(page_title="圖片語意查詢", layout="wide")
st.title("🔍 圖片語意搜尋系統")

# 側邊欄：上傳與系統管理
st.sidebar.title("📤 上傳圖片")
uploaded_file = st.sidebar.file_uploader("選擇 ZIP 檔案", type=["zip"])
st.sidebar.title("⚙️ 系統管理")
if st.sidebar.button("重置系統", help="清空所有索引、metadata 和上傳的圖片"):
    with st.spinner("重置中..."):
        try:
            resp = requests.post(UPLOAD_URL.replace("/upload", "/reset"))
            if resp.status_code == 200:
                st.success("✅ " + resp.json()["message"])
            else:
                st.error(f"❌ 重置失敗: {resp.status_code}")
        except Exception as e:
            st.error(f"❌ 重置錯誤: {e}")

# 上傳並啟動處理
if uploaded_file is not None and st.sidebar.button("開始處理"):
    with st.spinner("上傳中..."):
        try:
            files = {"zip_file": (uploaded_file.name, uploaded_file, "application/zip")}
            upload_resp = requests.post(UPLOAD_URL, files=files)
            if upload_resp.status_code == 200:
                msg = upload_resp.json()["message"]
                st.success(f"✅ {msg}")
                progress = st.progress(0)
                status_txt = st.empty()
                mapping_placeholder = st.empty()
                metrics_placeholder = st.empty()
                while True:
                    status_resp = requests.get(STATUS_URL)
                    data = status_resp.json()
                    q, p, d = data['queue'], len(data['processing']), len(data['done'])
                    total = q + p + d
                    # 更新進度
                    if total > 0:
                        progress.progress(d / total)
                        status_txt.text(f"佇列: {q} | 處理中: {p} | 已完成: {d}")
                    # 顯示正在處理的檔案 ↔ 節點
                    proc_map = data.get('processing_workers', {})
                    if proc_map:
                        md = "### 📌 正在處理的檔案 ↔ 節點"
                        for img, node in proc_map.items():
                            md += f"\n- **{img}** → `{node}`"
                        mapping_placeholder.markdown(md)
                    else:
                        mapping_placeholder.empty()
                    # 顯示節點 CPU/Memory
                    node_metrics = data.get('node_metrics', {})
                    if node_metrics:
                        df = pd.DataFrame.from_dict(node_metrics, orient='index')
                        df = df.rename(columns={
                            'cpu': 'CPU (%)',
                            'mem': 'Memory (%)',
                            'ts': 'Last Update'
                        })
                        df['Last Update'] = pd.to_datetime(df['Last Update'], unit='s')
                        metrics_placeholder.table(df)
                    else:
                        metrics_placeholder.empty()
                    # 完成條件
                    if q == 0 and p == 0:
                        progress.progress(1.0)
                        status_txt.text(f"✅ 全部 {d} 張圖片處理完成！")
                        break
                    time.sleep(1)
            else:
                st.error(f"❌ 上傳失敗: {upload_resp.status_code}")
        except Exception as e:
            st.error(f"❌ 上傳錯誤: {e}")

# 取得並檢查 API 狀態
status_data = {}
try:
    status_resp = requests.get(STATUS_URL)
    if status_resp.status_code == 200:
        status_data = status_resp.json()
        st.sidebar.success("✅ API 連接成功")
    else:
        st.sidebar.error("❌ API 連接失敗")
except Exception as e:
    st.sidebar.error(f"❌ API 錯誤: {e}")

# 主畫面：任務列表管理
if status_data:
    st.markdown("## 📋 任務列表管理")
    col_q, col_p, col_d = st.columns(3)
    # 排隊中
    with col_q:
        st.subheader("排隊中 (Queue)")
        for item in status_data.get('queued_items', []):
            cols = st.columns([4,1])
            cols[0].write(item)
            if cols[1].button("刪除", key=f"del_{item.replace('/','_')}"):
                try:
                    resp = requests.delete(f"{API_BASE_URL}/queue/{item}")
                    if resp.status_code == 200:
                        st.success(f"刪除 {item} 成功")
                    else:
                        st.error(f"刪除失敗: {resp.status_code}")
                except Exception as e:
                    st.error(f"刪除錯誤: {e}")
                st.experimental_rerun()
    # 處理中
    with col_p:
        st.subheader("處理中 (Processing)")
        for item in status_data.get('processing', []):
            st.write(f"- {item}")
    # 已完成
    with col_d:
        st.subheader("已完成 (Done)")
        for item in status_data.get('done', []):
            st.write(f"- {item}")

# 側欄：顯示系統狀態與資訊
if status_data:
    st.sidebar.markdown(f"- 🕑 佇列: {status_data.get('queue', 0)}")
    st.sidebar.markdown(f"- 🔄 處理中: {len(status_data.get('processing', []))}")
    st.sidebar.markdown(f"- ✅ 已完成: {len(status_data.get('done', []))}")
    # 側欄節點任務對應
    proc_map = status_data.get('processing_workers', {})
    if proc_map:
        with st.sidebar.expander("📌 節點任務對應", expanded=False):
            for img, node in proc_map.items():
                st.write(f"- **{img}** → `{node}`")
    # 側欄節點資源使用
    node_metrics = status_data.get('node_metrics', {})
    if node_metrics:
        with st.sidebar.expander("📊 節點資源使用", expanded=False):
            df2 = pd.DataFrame.from_dict(node_metrics, orient='index')
            df2 = df2.rename(columns={
                'cpu': 'CPU (%)',
                'mem': 'Memory (%)',
                'ts': 'Last Update'
            })
            df2['Last Update'] = pd.to_datetime(df2['Last Update'], unit='s')
            st.table(df2)

# 主區域：搜尋功能
st.markdown("請輸入一段描述，我們會幫你找出最相似的圖片")
query = st.text_input("🔎 查詢內容（例：birthday, dog, beach）")
top_k = st.slider("結果數量", 1, 10, 5)
if query:
    try:
        resp = requests.post(SEARCH_URL, json={"query": query, "top_k": top_k})
        data = resp.json()
        if "results" in data:
            st.markdown("## 📸 查詢結果")
            results = data['results']
            cols = st.columns(3)
            for i, item in enumerate(results):
                with cols[i % 3]:
                    st.markdown(f"**相似度**: {item['similarity']:.2f}")
                    st.markdown(f"**描述**: {item['caption']}")
                    img_resp = requests.get(f"{IMAGE_URL}/{item['filename']}")
                    if img_resp.status_code == 200:
                        img = Image.open(BytesIO(img_resp.content))
                        st.image(img, use_column_width=True)
                    else:
                        st.error("圖片載入失敗")
        elif "error" in data:
            st.error(f"❌ {data['error']}")
        else:
            st.info("沒有找到符合的結果")
    except Exception as e:
        st.error(f"❌ 搜尋錯誤: {e}")
else:
    st.info("👆 請在上方輸入查詢內容")

# 側欄：系統資訊
with st.sidebar.expander("📌 系統資訊", expanded=False):
    st.markdown(f"- API Base URL: {API_BASE_URL}")
    st.markdown(f"- Upload: {UPLOAD_URL}")
    st.markdown(f"- Status: {STATUS_URL}")
    st.markdown(f"- Search: {SEARCH_URL}")
    st.markdown(f"- Image: {IMAGE_URL}")
