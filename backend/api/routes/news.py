from fastapi import  Query, HTTPException
from dotenv import load_dotenv
import requests
import os

load_dotenv()

router = APIRouter()

NEWS_API_KEY = os.getenv("NEWS_API_KEY")

BASE_TOP = "https://newsapi.org/v2/top-headlines"
BASE_SEARCH = "https://newsapi.org/v2/everything"


@app.get("/news")
def get_news(
    category: str = Query("general"),
    q: str = Query("")
):
    if not NEWS_API_KEY:
        raise HTTPException(status_code=500, detail="NEWS_API_KEY missing")

    try:
        if q.strip():
            response = requests.get(
                BASE_SEARCH,
                params={
                    "q": q.strip(),
                    "language": "en",
                    "sortBy": "publishedAt",
                    "apiKey": NEWS_API_KEY
                },
                timeout=10
            )
        else:
            response = requests.get(
                BASE_TOP,
                params={
                    "country": "in",
                    "category": category,
                    "apiKey": NEWS_API_KEY
                },
                timeout=10
            )

        data = response.json()

        print("STATUS:", response.status_code)
        print("RESPONSE:", data)        

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=data.get("message", "Error fetching news")
            )

        return data

    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="News API timeout")