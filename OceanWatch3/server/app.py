from fastapi import FastAPI
from fastapi.responses import JSONResponse
import requests
import os

app = FastAPI()
DB_URL = os.getenv('MONGODB_URI', "")

@app.get("/")
def index():
    return JSONResponse(content={"message": "Hello World"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
