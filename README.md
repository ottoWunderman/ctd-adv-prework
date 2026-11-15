# Weather & Art Mood Explorer

Pre-work project built for the **Code the Dream React.js (Advanced)** class. This application pairs real-time weather conditions from **Open-Meteo** with mood-matched public domain artworks and artist biographies from the **Art Institute of Chicago (ARTIC) API**.

## Project Structure

- `index.html` — Semantic HTML5 layout, search bar, and endpoint navigation controls.
- `styles.css` — Responsive grid and detail layouts with accessible typography and contrast.
- `app.js` — Vanilla ES6+ JavaScript managing asynchronous `fetch` calls, WMO weather-to-mood mapping, linked endpoint navigation, pagination, and error handling.
- `README.md` — Instructions for running and testing the project locally.

## APIs & Endpoints Used (No API Keys Required)

1. **Open-Meteo API**
   - `GET https://geocoding-api.open-meteo.com/v1/search` — Resolves city names into coordinates.
   - `GET https://api.open-meteo.com/v1/forecast` — Retrieves current temperature, wind speed, and WMO weather codes.
2. **Art Institute of Chicago (ARTIC) API**
   - **Artworks Endpoint (`GET /api/v1/artworks/search` & `GET /api/v1/artworks/{id}`):** Fetches mood-matched artworks using targeted `fields` and `limit` parameters to keep responses fast, and issues a fresh `GET` request when inspecting an individual artwork.
   - **Artists Endpoint (`GET /api/v1/artists` & `GET /api/v1/artists/{id}`):** Displays a paginated directory of museum artists and issues a new `GET` request when navigating from an artwork to its creator's profile (and vice versa).

## How to Run Locally

No build tools, dependencies, or `.env` API keys are needed.

### Option 1: Open Directly in a Browser
1. Clone this repository:
   ```bash
   git clone https://github.com/ottoWunderman/ctd-adv-prework