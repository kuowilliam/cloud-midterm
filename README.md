# cloud-midterm
## model structure
docker-compose.yaml config five docker container including controller, worker1, worker2, worker3, redis 
```sh
root/
│
├── controllor/                                
│   ├── Dockerfile                
│   └── main.py                     
├── data/              # shared space
│   ├── index_file     # faiss    
│   ├── metadata.json  # caption data    
│   └── upload 
├── worker/
│   ├── Dockerfile    
│   └── worker.py
├── docker-compose.yaml #build docker image, container, volume
```
## Setup Instructions
start entire backend system
```
docker-compose up --build -d
```
close docker container
```
docker-compose down
```
checking container
```
docker-compose logs
```

## Testing with fastapi
```
http://127.0.0.1:8000/docs
```
