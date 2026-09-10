import asyncio
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
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")


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

    models_to_try = [MODEL_NAME]
    if "gemini-3.6-flash" not in models_to_try:
        models_to_try.append("gemini-3.6-flash")

    last_error = None

    for model in models_to_try:
        max_retries = 2 if model == MODEL_NAME else 1
        retry_delay = 1.0

        for attempt in range(1, max_retries + 1):
            try:
                print(f"Calling Gemini API with model: {model} (attempt {attempt})...")
                response = client.models.generate_content(
                    model=model,
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

            except HTTPException:
                raise
            except Exception as exc:
                last_error = exc
                print(f"Gemini model {model} attempt {attempt} failed: {type(exc).__name__}: {exc}")
                if attempt < max_retries and any(err_code in str(exc) for err_code in ["503", "UNAVAILABLE", "429", "RESOURCE_EXHAUSTED"]):
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 2
                    continue
                break

    raise HTTPException(
        status_code=503 if ("503" in str(last_error) or "UNAVAILABLE" in str(last_error)) else 500,
        detail=f"Gemini API is currently experiencing high demand: {last_error}",
    )

   