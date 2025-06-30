// Replace with your OpenWeatherMap and OpenCage API keys
let useCelsius = true;
let currentCity = "";
const weatherApiKey = "6a1624bf22ab8bff3e8c2fd6e876aef8";
const geocodeApiKey = "0b6f15194cf740cba0d9e43b5c4c8955";
let fullForecastData = [];
let mapInstance;

const themeToggle = document.getElementById("themeToggle");
const themeLabel = document.getElementById("themeLabel");

if (themeToggle) {
  themeToggle.addEventListener("change", () => {
    if (themeToggle.checked) {
      document.body.classList.add("light-theme");
      themeLabel.textContent = "☀️ Light";
      localStorage.setItem("theme", "light");
    } else {
      document.body.classList.remove("light-theme");
      themeLabel.textContent = "🌙 Dark";
      localStorage.setItem("theme", "dark");
    }
  });

  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "light") {
    themeToggle.checked = true;
    document.body.classList.add("light-theme");
    themeLabel.textContent = "☀️ Light";
  } else {
    themeLabel.textContent = "🌙 Dark";
  }
}

window.addEventListener("DOMContentLoaded", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      fetchLocationName(lat, lon);
      fetchWeatherByCoords(lat, lon);
    });
  }

  document.getElementById("unitToggle").addEventListener("change", () => {
    useCelsius = !document.getElementById("unitToggle").checked;
    const city = document.getElementById("cityInput").value;
    if (city) {
      currentCity = city;
      getWeather();
    } else if (currentCity) {
      document.getElementById("cityInput").value = currentCity;
      getWeather();
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
      });
    }
  });

 document.getElementById("backToForecast").addEventListener("click", () => {
  document.getElementById("dailyDetailForecast").classList.remove("active");
  const forecastGrid = document.getElementById("forecast");
  forecastGrid.style.display = "grid";
  forecastGrid.style.gridTemplateColumns = "repeat(auto-fit, minmax(110px, 1fr))";
  forecastGrid.style.gap = "15px";
});


  loadFavorites();
});

function getWeather() {
  const city = document.getElementById("cityInput").value.trim();
  const errorMsg = document.getElementById("errorMsg");
  errorMsg.textContent = "";

  if (!city) {
    errorMsg.textContent = "Please enter a city name or country.";
    return;
  }

  currentCity = city;

  fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${weatherApiKey}&units=${useCelsius ? "metric" : "imperial"}`)
    .then(res => res.json())
    .then(data => {
      if (data.cod === "404") {
        // Try resolving as country
        fetch(`https://api.opencagedata.com/geocode/v1/json?q=${city}&key=${geocodeApiKey}`)
          .then(res => res.json())
          .then(geoData => {
            const country = geoData.results[0].components.country;
            const capital = geoData.results[0].components.city ||
                            geoData.results[0].components.town ||
                            geoData.results[0].components.state_capital;

            if (capital) {
              document.getElementById("cityInput").value = capital;
              getWeather(); // Recursively call with capital
            } else {
              errorMsg.textContent = "Could not find capital for this country.";
            }
          })
          .catch(() => {
            errorMsg.textContent = "Could not resolve country.";
          });
        return;
      }

      // If found, normal flow
      errorMsg.textContent = "";
      updateWeatherUI(data);
      fetchLocationName(data.coord.lat, data.coord.lon);
      fetchForecast(data.coord.lat, data.coord.lon);
    })
    .catch(() => {
      errorMsg.textContent = "Error fetching data.";
    });
}


function fetchLocationName(lat, lon) {
  fetch(`https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lon}&key=${geocodeApiKey}`)
    .then(res => res.json())
    .then(data => {
      const components = data.results[0].components;
      const city = components.city || components.town || components.village || components.state || "Unknown";
      const country = components.country || "";
      document.getElementById("cityName").textContent = `${city}, ${country}`;
    });
}


function fetchWeatherByCoords(lat, lon) {
  fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weatherApiKey}&units=${useCelsius ? "metric" : "imperial"}`)
    .then(res => res.json())
    .then(data => {
      cacheData("latestWeather", data);
      updateWeatherUI(data);
      fetchForecast(lat, lon);
      fetchAQI(lat, lon);
    });
}

function updateWeatherUI(data) {
  const unit = useCelsius ? "°C" : "°F";
  document.getElementById("datetime").textContent = new Date(data.dt * 1000).toLocaleString();
  document.getElementById("description").textContent = data.weather[0].description;
  document.getElementById("temperature").textContent = `${data.main.temp.toFixed(1)}${unit}`;
  document.getElementById("weatherIcon").src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;

  document.getElementById("feelsLike").textContent = `${data.main.feels_like.toFixed(1)}${unit}`;
  document.getElementById("humidity").textContent = `${data.main.humidity}%`;
  document.getElementById("windSpeed").textContent = `${data.wind.speed} ${useCelsius ? "km/h" : "mph"}`;

  document.getElementById("sunrise").textContent = new Date(data.sys.sunrise * 1000).toLocaleTimeString();
  document.getElementById("sunset").textContent = new Date(data.sys.sunset * 1000).toLocaleTimeString();

  const main = data.weather[0].main.toLowerCase();
  showWeatherMap(data.coord.lat, data.coord.lon);
}

function fetchForecast(lat, lon) {
  fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${weatherApiKey}&units=${useCelsius ? "metric" : "imperial"}`)
    .then(res => res.json())
    .then(data => {
      fullForecastData = data.list;
      cacheData("latestForecast", data);

      const forecastContainer = document.getElementById("forecast");
      const hourlyContainer = document.getElementById("hourlyForecast");
      forecastContainer.innerHTML = "";
      hourlyContainer.innerHTML = "";

      const unit = useCelsius ? "°C" : "°F";
      const today = new Date().getDate();

      data.list.filter(entry => new Date(entry.dt_txt).getDate() === today)
        .slice(0, 8).forEach(item => {
          const date = new Date(item.dt_txt);
          const hour = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const icon = `https://openweathermap.org/img/wn/${item.weather[0].icon}.png`;
          const el = document.createElement("div");
          el.className = "hourly-card";
          el.innerHTML = `<p>${hour}</p><img src="${icon}" alt=""><p>${item.main.temp.toFixed(0)}${unit}</p>`;
          hourlyContainer.appendChild(el);
        });

      data.list.filter(entry => entry.dt_txt.includes("12:00:00"))
        .slice(0, 5).forEach(item => {
          const date = new Date(item.dt_txt);
          const day = date.toLocaleDateString(undefined, { weekday: 'long' });
          const dateStr = item.dt_txt.split(" ")[0];
          const icon = `https://openweathermap.org/img/wn/${item.weather[0].icon}.png`;
          const el = document.createElement("div");
          el.className = "day";
          el.dataset.date = dateStr;
          el.innerHTML = `<h4>${day}</h4><img src="${icon}" alt=""><p>${item.main.temp_max.toFixed(0)}${unit} / ${item.main.temp_min.toFixed(0)}${unit}</p><small>${item.weather[0].description}</small>`;
          el.addEventListener("click", () => showDayDetail(dateStr, day));
          forecastContainer.appendChild(el);
        });
    });
}

function fetchAQI(lat, lon) {
  fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${weatherApiKey}`)
    .then(res => res.json())
    .then(data => {
      const aqi = data.list[0].main.aqi;
      const levels = ["Good", "Fair", "Moderate", "Poor", "Very Poor"];
      const box = document.getElementById("aqiBox");
      box.textContent = `AQI: ${aqi} (${levels[aqi - 1]})`;
      box.style.background = aqi < 3 ? "#27ae60" : aqi < 5 ? "#f39c12" : "#c0392b";
    });
}

function showDayDetail(dateStr, dayLabel) {
  const detailSection = document.getElementById("dailyDetailForecast");
  const detailGrid = document.getElementById("detailedHourlyGrid");
  const unit = useCelsius ? "°C" : "°F";
  detailGrid.innerHTML = "";
  document.getElementById("selectedDayTitle").textContent = `Forecast for ${dayLabel}`;
  fullForecastData.filter(item => item.dt_txt.startsWith(dateStr)).forEach(item => {
    const date = new Date(item.dt_txt);
    const hour = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const icon = `https://openweathermap.org/img/wn/${item.weather[0].icon}.png`;
    const el = document.createElement("div");
    el.className = "hourly-card";
    el.innerHTML = `<p>${hour}</p><img src="${icon}" alt=""><p>${item.main.temp.toFixed(0)}${unit}</p>`;
    detailGrid.appendChild(el);
  });
  document.getElementById("forecast").style.display = "none";
  detailSection.classList.add("active");
}

function speakForecast() {
  const city = document.getElementById("cityName").textContent;
  const temp = document.getElementById("temperature").textContent;
  const desc = document.getElementById("description").textContent;
  const msg = new SpeechSynthesisUtterance(`In ${city}, it is currently ${temp} with ${desc}.`);
  speechSynthesis.speak(msg);
}

function shareForecast() {
  const city = document.getElementById("cityName").textContent;
  const temp = document.getElementById("temperature").textContent;
  const desc = document.getElementById("description").textContent;
  const text = `Weather in ${city}: ${temp} with ${desc}`;
  if (navigator.share) navigator.share({ text });
  else navigator.clipboard.writeText(text).then(() => alert("Forecast copied to clipboard!"));
}

function saveToFavorites() {
  if (!currentCity) return;
  const saved = JSON.parse(localStorage.getItem("favorites") || "[]");
  if (!saved.includes(currentCity)) {
    saved.push(currentCity);
    localStorage.setItem("favorites", JSON.stringify(saved));
    loadFavorites();
  }
}

function loadFavorites() {
  const container = document.getElementById("favoriteCities");
  container.innerHTML = "";
  const saved = JSON.parse(localStorage.getItem("favorites") || "[]");
  saved.forEach(city => {
    const btn = document.createElement("button");
    btn.textContent = city;
    btn.title = "Click to unsave";
    btn.onclick = () => {
      if (confirm(`Remove ${city} from favorites?`)) {
        const updated = saved.filter(item => item !== city);
        localStorage.setItem("favorites", JSON.stringify(updated));
        loadFavorites();
      } else {
        document.getElementById("cityInput").value = city;
        getWeather();
      }
    };
    container.appendChild(btn);
  });
}

function cacheData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

if (!navigator.onLine) {
  const data = JSON.parse(localStorage.getItem("latestWeather"));
  const forecast = JSON.parse(localStorage.getItem("latestForecast"));
  if (data) updateWeatherUI(data);
  if (forecast) fetchForecast(data.coord.lat, data.coord.lon);
  alert("You are offline. Showing last saved data.");
}

// 🗺️ Weather map
function showWeatherMap(lat, lon) {
  if (!mapInstance) {
    mapInstance = L.map("weatherMap").setView([lat, lon], 7);
  } else {
    mapInstance.setView([lat, lon], 7);
  }

  mapInstance.eachLayer(layer => mapInstance.removeLayer(layer));

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
  }).addTo(mapInstance);

  L.tileLayer(`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${weatherApiKey}`, {
    attribution: "Weather © OpenWeatherMap",
    maxZoom: 19,
    opacity: 0.6
  }).addTo(mapInstance);

  L.marker([lat, lon]).addTo(mapInstance)
    .bindPopup("Current Location")
    .openPopup();
}
