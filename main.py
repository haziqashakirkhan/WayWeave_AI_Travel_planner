import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from google import genai

from prompts import (
    ZERO_SHOT_PROMPT,
    FEW_SHOT_PROMPT,
    STRUCTURED_REASONING_PROMPT,
)


load_dotenv()


API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-3.7-flash")


if not API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is missing. Add it to your .env file."
    )


client = genai.Client(api_key=API_KEY)


app = FastAPI(
    title="Wayweave",
    description="AI Travel Planner using Gemini prompting techniques",
    version="1.0.0",
)


app.mount(
    "/static",
    StaticFiles(directory="static"),
    name="static",
)


class TravelRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    destination: str = Field(..., min_length=1, max_length=100)
    days: int = Field(..., ge=1, le=30)
    budget: float = Field(..., gt=0)
    interests: list[str] = Field(..., min_length=1)
    travel_style: str = Field(..., min_length=1)
    method: str = Field(...)


class TravelResponse(BaseModel):
    method: str
    itinerary: str


PROMPTS = {
    "zero-shot": ZERO_SHOT_PROMPT,
    "few-shot": FEW_SHOT_PROMPT,
    "structured": STRUCTURED_REASONING_PROMPT,
}


@app.get("/", response_class=HTMLResponse)
async def home():
    with open("templates/index.html", "r", encoding="utf-8") as file:
        return file.read()


@app.post("/api/plan", response_model=TravelResponse)
async def generate_plan(data: TravelRequest):

    if data.method not in PROMPTS:
        raise HTTPException(
            status_code=400,
            detail="Invalid prompting method.",
        )

    interests = ", ".join(data.interests)

    prompt = PROMPTS[data.method].format(
        name=data.name.strip(),
        destination=data.destination.strip(),
        days=data.days,
        budget=f"${data.budget:,.2f}",
        interests=interests,
        travel_style=data.travel_style.strip(),
    )

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
        )

        itinerary = response.text

        if not itinerary:
            raise HTTPException(
                status_code=502,
                detail="Gemini returned an empty response.",
            )

        return TravelResponse(
            method=data.method,
            itinerary=itinerary,
        )

    except Exception as exc:
        print(f"Gemini error: {type(exc).__name__}: {exc}")

        raise HTTPException(
            status_code=500,
            detail=f"Gemini error: {type(exc).__name__}: {exc}",
        )
   