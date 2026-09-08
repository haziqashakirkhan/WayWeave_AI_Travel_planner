# Wayweave — AI Travel Planner

> **thoughtful travel, shaped around you**

Wayweave is an AI-powered travel planner that creates personalized day-by-day travel itineraries using the **Google Gemini API**.

The project demonstrates how different **prompting techniques** can influence the quality and structure of AI-generated travel plans.

## Features

* Personalized travel itineraries
* Destination, duration, and budget-based planning
* Interest selection
* Solo, Family, or Friends travel styles
* Three prompting techniques:

  * Zero-Shot Prompting
  * Few-Shot Prompting
  * Structured Reasoning Prompting
* Estimated travel costs
* Recommended places and activities
* Clean responsive web interface
* FastAPI backend
* Google Gemini integration

## Prompting Techniques

### 1. Zero-Shot Prompting

The model receives the travel requirements directly without examples.

**Goal:** Test how well Gemini can generate a useful itinerary from instructions alone.

### 2. Few-Shot Prompting

The model receives several example itineraries before generating the requested itinerary.

**Goal:** Guide Gemini toward a particular response structure and style.

### 3. Structured Reasoning Prompting

The prompt instructs Gemini to consider the travel constraints, interests, budget, geography, activities, and pacing before producing the final itinerary.

**Goal:** Generate a more organized and constraint-aware travel plan without exposing the model's private reasoning.

## Tech Stack

* **Python**
* **FastAPI**
* **Google Gemini API**
* **HTML**
* **CSS**
* **JavaScript**
* **Pydantic**
* **Uvicorn**

## Project Structure

```text
TripLense AI/
│
├── main.py
├── prompts.py
├── requirements.txt
├── .gitignore
│
├── templates/
│   └── index.html
│
└── static/
    ├── style.css
    └── script.js
```

## Installation

### 1. Clone the repository

```bash
git clone YOUR_REPOSITORY_URL
cd "TripLense AI"
```

### 2. Create a virtual environment

```bash
python -m venv .AI
```

Activate it on Windows:

```powershell
.AI\Scripts\Activate.ps1
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

## Environment Variables

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.7-flash
```

**Never commit your `.env` file or API key to GitHub.**

## Run the Application

Start the FastAPI server:

```bash
uvicorn main:app --reload
```

Open the application in your browser:

```text
http://127.0.0.1:8000
```

## How It Works

```text
User
 │
 │ Travel preferences
 ▼
Wayweave Frontend
 │
 │ JSON request
 ▼
FastAPI Backend
 │
 │ Selected prompting technique
 ▼
Prompt Template
 │
 ▼
Google Gemini API
 │
 │ Generated itinerary
 ▼
FastAPI
 │
 ▼
Wayweave Results Panel
```

## API Endpoint

### Generate Travel Plan

```text
POST /api/plan
```

Example request:

```json
{
  "name": "Haziqa",
  "destination": "Istanbul",
  "days": 5,
  "budget": 1000,
  "interests": [
    "History",
    "Food",
    "Nature"
  ],
  "travel_style": "Friends",
  "method": "few-shot"
}
```

Example response:

```json
{
  "method": "few-shot",
  "itinerary": "..."
}
```

## Important Note

Gemini availability can occasionally be affected by temporary API capacity or model demand. A `503 UNAVAILABLE` response means the selected model is temporarily unavailable rather than indicating that the FastAPI application itself is broken.

## Future Improvements

* Compare outputs from all three prompting methods side-by-side
* Add destination images
* Add hotel and flight recommendations
* Add currency conversion
* Add map integration
* Add itinerary export to PDF
* Add saved trips
* Add user accounts
* Add travel history

## Learning Objectives

This project was built to practice:

* FastAPI development
* REST API integration
* Gemini API usage
* Prompt engineering
* Zero-shot prompting
* Few-shot prompting
* Structured prompting
* Frontend and backend integration
* Environment variable management
* Building AI-powered applications

## Author

**Haziqa Shakir Khan**

Built as an AI Travel Planner project focused on understanding and comparing Gemini prompting techniques.

