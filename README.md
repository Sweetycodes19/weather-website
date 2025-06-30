# weather-website
A responsive, advanced weather website that auto-detects your location or lets you search any city or country.
The app shows current weather, a 5-day forecast, sunrise/sunset times, AQI, a dynamic weather map.

## ✨ Features

- Auto-detects current location
- Search city or country (fetches capital city automatically)
- Real-time weather info with temperature toggle (°C/°F)
- 5-day forecast and hourly forecast
- Sunrise & sunset with icons
- Air Quality Index (AQI)
- Leaflet.js interactive map
- Dark/Light theme toggle with ☀️ / 🌙 icon
- Save and unsave favorite cities
- Text-to-speech forecast & share feature
- Offline fallback using localStorage

- ## ⚙️ How It Works

The app uses **JavaScript `fetch`** to call:
- **[OpenWeatherMap API](https://openweathermap.org/api)** — for weather data
- **[OpenCage API](https://opencagedata.com/api)** — for geocoding (get city, country, capital)
