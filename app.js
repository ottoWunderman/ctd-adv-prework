const GEOCODE_API = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_API = "https://api.open-meteo.com/v1/forecast";
const ARTIC_API = "https://api.artic.edu/api/v1";
const IIIF_IMAGE_BASE = "https://www.artic.edu/iiif/2";

const state = {
  activeTab: "mood", // "mood" | "artists"
  city: "Charlotte",
  artistPage: 1,
  artistTotalPages: 1,
};

// DOM References
const navMoodBtn = document.getElementById("nav-mood");
const navArtistsBtn = document.getElementById("nav-artists");
const weatherSection = document.getElementById("weather-section");
const cityForm = document.getElementById("city-form");
const cityInput = document.getElementById("city-input");
const weatherCard = document.getElementById("weather-card");
const weatherCityEl = document.getElementById("weather-city");
const weatherConditionEl = document.getElementById("weather-condition");
const weatherTempEl = document.getElementById("weather-temp");
const weatherFeelsEl = document.getElementById("weather-feels");
const weatherWindEl = document.getElementById("weather-wind");
const weatherMoodTagEl = document.getElementById("weather-mood-tag");

const viewHeading = document.getElementById("view-heading");
const loader = document.getElementById("loader");
const errorBox = document.getElementById("error-box");
const contentArea = document.getElementById("content-area");
const paginationNav = document.getElementById("pagination");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const pageIndicator = document.getElementById("page-indicator");

// Weather codes to moods
function mapWeatherCodeToMood(code) {
  if (code === 0) {
    return { label: "Clear Sky", moodLabel: "Golden Sunlight", query: "sunlight landscape" };
  }
  if (code >= 1 && code <= 3) {
    return { label: "Partly Cloudy", moodLabel: "Drifting Clouds", query: "clouds sky" };
  }
  if (code === 45 || code === 48) {
    return { label: "Foggy / Misty", moodLabel: "Atmospheric Mist", query: "fog mist" };
  }
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return { label: "Rain / Showers", moodLabel: "Rainy Reflection", query: "rain umbrella" };
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return { label: "Snowfall", moodLabel: "Winter Stillness", query: "winter snow" };
  }
  if (code >= 95) {
    return { label: "Thunderstorm", moodLabel: "Dramatic Storm", query: "storm sea" };
  }
  return { label: "Mild Weather", moodLabel: "Impressionist Nature", query: "garden nature" };
}

function createEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function stripHtmlTags(rawText) {
  if (!rawText) return "";
  const temp = document.createElement("div");
  temp.innerHTML = rawText;
  return temp.textContent.trim();
}

function setLoading(isLoading) {
  loader.hidden = !isLoading;
  if (isLoading) {
    errorBox.hidden = true;
    contentArea.innerHTML = "";
    paginationNav.hidden = true;
  }
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
  contentArea.innerHTML = "";
  paginationNav.hidden = true;
}

function setActiveTabUI(tabName) {
  state.activeTab = tabName;
  navMoodBtn.classList.toggle("active", tabName === "mood");
  navArtistsBtn.classList.toggle("active", tabName === "artists");
  weatherSection.hidden = tabName !== "mood";
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with HTTP status ${response.status}.`);
  }
  return response.json();
}

function buildArtworkImage(imageId, altText, imgClass) {
  if (!imageId) {
    return createEl("div", "img-fallback", "No public domain image available");
  }
  const img = createEl("img", imgClass);
  img.src = `${IIIF_IMAGE_BASE}/${imageId}/full/600,/0/default.jpg`;
  img.alt = altText || "Artwork preview";
  img.loading = "lazy";
  img.addEventListener("error", () => {
    const fallback = createEl("div", "img-fallback", "Image preview unavailable");
    img.replaceWith(fallback);
  });
  return img;
}

// Weather Forecast + Mood-Matched Artworks
async function loadWeatherAndMood(cityName) {
  setActiveTabUI("mood");
  setLoading(true);
  viewHeading.textContent = "";

  try {
    // Geocode city name
    const geoUrl = `${GEOCODE_API}?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
    const geoData = await fetchJson(geoUrl);

    if (!geoData.results || geoData.results.length === 0) {
      weatherCard.hidden = true;
      throw new Error(`City "${cityName}" was not found. Please check the spelling and try again.`);
    }

    const place = geoData.results[0];
    const locationDisplay = [place.name, place.admin1, place.country].filter(Boolean).join(", ");

    // Fetch current weather for coordinates
    const weatherUrl = `${WEATHER_API}?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph`;
    const weatherData = await fetchJson(weatherUrl);
    const current = weatherData.current;
    const mood = mapWeatherCodeToMood(current.weather_code);

    const tempF = Math.round(current.temperature_2m);
    const tempC = Math.round(((current.temperature_2m - 32) * 5) / 9);
    const feelsF = Math.round(current.apparent_temperature);

    weatherCityEl.textContent = locationDisplay;
    weatherConditionEl.textContent = mood.label;
    weatherTempEl.textContent = `${tempF}°F (${tempC}°C)`;
    weatherFeelsEl.textContent = `${feelsF}°F`;
    weatherWindEl.textContent = `${Math.round(current.wind_speed_10m)} mph`;
    weatherMoodTagEl.textContent = mood.moodLabel;
    weatherCard.hidden = false;

    // Fetch targeted artworks matching today's weather mood (only needed fields, limit=6)
    const fields = "id,title,artist_id,artist_title,date_display,medium_display,image_id";
    const artUrl = `${ARTIC_API}/artworks/search?q=${encodeURIComponent(mood.query)}&query[term][is_public_domain]=true&fields=${fields}&limit=6`;
    const artData = await fetchJson(artUrl);

    viewHeading.textContent = `Curated Artworks for "${mood.moodLabel}"`;
    renderArtworkGrid(artData.data);
  } catch (err) {
    showError(err.message || "Unable to load weather and artworks.");
  } finally {
    setLoading(false);
  }
}

// Paginated Artists
async function loadArtistsDirectory() {
  setActiveTabUI("artists");
  setLoading(true);
  viewHeading.textContent = "Artists Directory — Art Institute of Chicago";

  try {
    const fields = "id,title,birth_date,death_date,description";
    const url = `${ARTIC_API}/artists?page=${state.artistPage}&limit=8&fields=${fields}`;
    const data = await fetchJson(url);

    state.artistTotalPages = data.pagination.total_pages || 1;
    renderArtistsGrid(data.data);

    paginationNav.hidden = false;
    pageIndicator.textContent = `Page ${state.artistPage} of ${state.artistTotalPages}`;
    prevBtn.disabled = state.artistPage <= 1;
    nextBtn.disabled = state.artistPage >= state.artistTotalPages;
  } catch (err) {
    showError(err.message || "Unable to load artists directory.");
  } finally {
    setLoading(false);
  }
}

// LINKED GET REQUEST (Artwork -> Artist)
async function loadArtistDetail(artistId) {
  setActiveTabUI("artists");
  setLoading(true);
  viewHeading.textContent = "Artist Profile & Linked Works";

  try {
    const artistUrl = `${ARTIC_API}/artists/${artistId}?fields=id,title,birth_date,death_date,description`;
    const worksFields = "id,title,date_display,medium_display,image_id";
    const worksUrl = `${ARTIC_API}/artworks/search?query[term][artist_id]=${artistId}&fields=${worksFields}&limit=6`;

    // GET requests for the artist
    const [artistRes, worksRes] = await Promise.all([
      fetchJson(artistUrl),
      fetchJson(worksUrl),
    ]);

    renderArtistDetail(artistRes.data, worksRes.data);
  } catch (err) {
    showError(err.message || "Unable to load artist profile.");
  } finally {
    setLoading(false);
  }
}

// GET Artist / Grid -> Single Artwork
async function loadArtworkDetail(artworkId) {
  setActiveTabUI("mood");
  weatherSection.hidden = true;
  setLoading(true);
  viewHeading.textContent = "Artwork Details";

  try {
    const fields =
      "id,title,artist_id,artist_title,date_display,medium_display,dimensions,place_of_origin,credit_line,image_id";
    const artworkRes = await fetchJson(`${ARTIC_API}/artworks/${artworkId}?fields=${fields}`);
    renderArtworkDetail(artworkRes.data);
  } catch (err) {
    showError(err.message || "Unable to load artwork details.");
  } finally {
    setLoading(false);
  }
}

function renderArtworkGrid(artworks) {
  if (!artworks || artworks.length === 0) {
    showError("No artworks matched this weather mood.");
    return;
  }

  const grid = createEl("div", "grid");

  artworks.forEach((art) => {
    const card = createEl("article", "card");

    const imgWrap = createEl("div", "card-img-wrap");
    imgWrap.appendChild(buildArtworkImage(art.image_id, art.title, "card-img"));

    const body = createEl("div", "card-body");

    const titleBtn = createEl("button", "link-btn card-title", art.title || "Untitled");
    titleBtn.type = "button";
    titleBtn.addEventListener("click", () => loadArtworkDetail(art.id));

    const artistRow = createEl("p", "meta-text");
    artistRow.appendChild(document.createTextNode("Artist: "));

    if (art.artist_id) {
      const artistBtn = createEl("button", "link-btn", art.artist_title || "View Artist");
      artistBtn.type = "button";
      artistBtn.title = "Issue GET request for this artist";
      artistBtn.addEventListener("click", () => loadArtistDetail(art.artist_id));
      artistRow.appendChild(artistBtn);
    } else {
      artistRow.appendChild(document.createTextNode(art.artist_title || "Unknown Artist"));
    }

    const dateRow = createEl("p", "meta-text", `Date: ${art.date_display || "Unknown"}`);
    const mediumRow = createEl("p", "meta-text", art.medium_display || "");

    const actions = createEl("div", "card-actions");
    const inspectBtn = createEl("button", "btn btn-secondary", "Inspect Artwork");
    inspectBtn.type = "button";
    inspectBtn.addEventListener("click", () => loadArtworkDetail(art.id));
    actions.appendChild(inspectBtn);

    body.append(titleBtn, artistRow, dateRow, mediumRow, actions);
    card.append(imgWrap, body);
    grid.appendChild(card);
  });

  contentArea.appendChild(grid);
}

function renderArtistsGrid(artists) {
  const grid = createEl("div", "grid");

  artists.forEach((artist) => {
    const card = createEl("article", "card");
    const body = createEl("div", "card-body");

    const titleBtn = createEl("button", "link-btn card-title", artist.title);
    titleBtn.type = "button";
    titleBtn.addEventListener("click", () => loadArtistDetail(artist.id));

    const years =
      artist.birth_date || artist.death_date
        ? `${artist.birth_date || "?"} – ${artist.death_date || "Present"}`
        : "Dates unknown";
    const datesRow = createEl("p", "meta-text", `Lifespan: ${years}`);

    const cleanBio = stripHtmlTags(artist.description);
    const bioPreview = cleanBio
      ? `${cleanBio.slice(0, 140)}${cleanBio.length > 140 ? "..." : ""}`
      : "No biography excerpt available in catalog.";
    const bioRow = createEl("p", "meta-text", bioPreview);

    const actions = createEl("div", "card-actions");
    const viewBtn = createEl("button", "btn btn-secondary", "View Profile & Artworks");
    viewBtn.type = "button";
    viewBtn.addEventListener("click", () => loadArtistDetail(artist.id));
    actions.appendChild(viewBtn);

    body.append(titleBtn, datesRow, bioRow, actions);
    card.appendChild(body);
    grid.appendChild(card);
  });

  contentArea.appendChild(grid);
}

function renderArtistDetail(artist, artworks) {
  const panel = createEl("article", "detail-panel");

  const navRow = createEl("div", "detail-nav-row");
  const backArtistsBtn = createEl("button", "btn btn-secondary", "\u2190 Back to Artists Directory");
  backArtistsBtn.type = "button";
  backArtistsBtn.addEventListener("click", () => loadArtistsDirectory());

  const backWeatherBtn = createEl("button", "btn btn-secondary", "Go to Weather & Mood");
  backWeatherBtn.type = "button";
  backWeatherBtn.addEventListener("click", () => loadWeatherAndMood(state.city));

  navRow.append(backArtistsBtn, backWeatherBtn);

  const title = createEl("h2", "detail-title", artist.title);
  const lifespan =
    artist.birth_date || artist.death_date
      ? `${artist.birth_date || "?"} – ${artist.death_date || "Present"}`
      : "Dates unknown";
  const meta = createEl("p", "meta-text", `Lifespan: ${lifespan}`);

  const cleanBio = stripHtmlTags(artist.description);
  const bio = createEl(
    "p",
    "detail-bio",
    cleanBio || "No detailed biography is listed for this artist in the museum archive."
  );

  const worksTitle = createEl(
    "h3",
    "linked-section-title",
    `Collection Works by ${artist.title} (Click to fetch Artwork)`
  );

  panel.append(navRow, title, meta, bio, worksTitle);
  contentArea.appendChild(panel);

  if (artworks && artworks.length > 0) {
    renderArtworkGrid(artworks);
  } else {
    panel.appendChild(
      createEl("p", "meta-text", "No public artworks returned for this artist.")
    );
  }
}

function renderArtworkDetail(art) {
  const panel = createEl("article", "detail-panel");

  const navRow = createEl("div", "detail-nav-row");
  const backWeatherBtn = createEl("button", "btn btn-secondary", "\u2190 Back to Weather & Mood");
  backWeatherBtn.type = "button";
  backWeatherBtn.addEventListener("click", () => loadWeatherAndMood(state.city));

  const artistsDirBtn = createEl("button", "btn btn-secondary", "Browse Artists Directory");
  artistsDirBtn.type = "button";
  artistsDirBtn.addEventListener("click", () => loadArtistsDirectory());

  navRow.append(backWeatherBtn, artistsDirBtn);

  const layout = createEl("div", "detail-layout");
  const imgContainer = createEl("div");
  imgContainer.appendChild(buildArtworkImage(art.image_id, art.title, "detail-img"));

  const info = createEl("div");
  const title = createEl("h2", "detail-title", art.title || "Untitled");

  const artistRow = createEl("p", "meta-text");
  artistRow.style.marginBottom = "0.5rem";
  artistRow.appendChild(document.createTextNode("Artist: "));

  if (art.artist_id) {
    const artistBtn = createEl("button", "link-btn", art.artist_title || "Inspect Artist");
    artistBtn.type = "button";
    artistBtn.addEventListener("click", () => loadArtistDetail(art.artist_id));
    artistRow.appendChild(artistBtn);
  } else {
    artistRow.appendChild(document.createTextNode(art.artist_title || "Unknown Artist"));
  }

  const dateRow = createEl("p", "meta-text", `Date: ${art.date_display || "Unknown"}`);
  const originRow = createEl(
    "p",
    "meta-text",
    `Origin: ${art.place_of_origin || "Unknown"}`
  );
  const mediumRow = createEl(
    "p",
    "meta-text",
    `Medium: ${art.medium_display || "Not specified"}`
  );
  const dimRow = createEl(
    "p",
    "meta-text",
    `Dimensions: ${art.dimensions || "Not specified"}`
  );
  const creditRow = createEl(
    "p",
    "detail-bio",
    art.credit_line ? `Credit Line: ${art.credit_line}` : ""
  );

  info.append(title, artistRow, dateRow, originRow, mediumRow, dimRow, creditRow);
  layout.append(imgContainer, info);
  panel.append(navRow, layout);
  contentArea.appendChild(panel);
}

// Event Listeners
navMoodBtn.addEventListener("click", () => {
  loadWeatherAndMood(state.city);
});

navArtistsBtn.addEventListener("click", () => {
  state.artistPage = 1;
  loadArtistsDirectory();
});

cityForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = cityInput.value.trim();
  if (!query) {
    showError("Please enter a city name before searching.");
    return;
  }
  state.city = query;
  loadWeatherAndMood(state.city);
});

prevBtn.addEventListener("click", () => {
  if (state.artistPage > 1) {
    state.artistPage -= 1;
    loadArtistsDirectory();
  }
});

nextBtn.addEventListener("click", () => {
  if (state.artistPage < state.artistTotalPages) {
    state.artistPage += 1;
    loadArtistsDirectory();
  }
});

// Initial load
cityInput.value = state.city;
loadWeatherAndMood(state.city);