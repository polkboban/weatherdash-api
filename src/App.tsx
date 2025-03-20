import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, History, Thermometer, RefreshCw, MapPin, Wind, Droplets, Sun, Cloud } from 'lucide-react';
import type { WeatherData, SearchHistory, CitySearchResult } from './types';
import CitySearch from './components/CitySearch';

const WEATHER_API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
const MAX_HISTORY_ITEMS = 5;

function App() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>(() => {
    const saved = localStorage.getItem('weatherSearchHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCelsius, setIsCelsius] = useState(true);
  const [suggestions, setSuggestions] = useState<CitySearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef<number>();
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('weatherSearchHistory', JSON.stringify(searchHistory));
  }, [searchHistory]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await axios.get(
        `https://api.weatherapi.com/v1/search.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(searchTerm)}`
      );
      setSuggestions(response.data);
      setShowSuggestions(true);
    } catch (err) {
      setSuggestions([]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCity(value);
    setError('');
    
    if (searchTimeout.current) {
      window.clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = window.setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  const fetchWeather = async (searchCity: string) => {
    if (!searchCity.trim()) return;

    try {
      setLoading(true);
      setError('');
      
      const encodedCity = encodeURIComponent(searchCity.trim());
      const response = await axios.get(
        `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${encodedCity}&aqi=no`
      );

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      setWeather(response.data);
      
      const newHistory = [
        { city: searchCity, timestamp: Date.now() },
        ...searchHistory.filter(item => item.city.toLowerCase() !== searchCity.toLowerCase())
      ].slice(0, MAX_HISTORY_ITEMS);
      
      setSearchHistory(newHistory);
      setCity('');
      setSuggestions([]);
      setShowSuggestions(false);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        setError('Please enter a valid city name');
      } else if (axios.isAxiosError(err) && err.response?.status === 403) {
        setError('API key error. Please try again later.');
      } else {
        setError('Unable to fetch weather data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (city.trim()) {
      fetchWeather(city.trim());
    } else {
      setError('Please enter a city name');
    }
  };

  const handleSuggestionClick = (suggestion: CitySearchResult) => {
    const cityString = `${suggestion.name}, ${suggestion.country}`;
    fetchWeather(cityString);
  };

  const handleHistoryClick = (historyCity: string) => {
    fetchWeather(historyCity);
  };

  const handleCitySelect = (city: { lat: number; lon: number; name: string; country: string }) => {
    const cityString = `${city.name}, ${city.country}`;
    fetchWeather(cityString);
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4 md:p-8"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=2000&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-6 md:p-8">
            
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center">
                <Sun className="mr-3 text-grey-100" /> Weather Dashboard
              </h1>
              <button
                onClick={() => setIsCelsius(!isCelsius)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all duration-300 flex items-center"
              >
                <RefreshCw size={16} className="mr-2" />
                {isCelsius ? '°F' : '°C'}
              </button>
            </div>

            
            <div className="mb-8">
              <form onSubmit={handleSubmit} className="relative">
                <div className="relative">
                  <input
                    type="text"
                    value={city}
                    onChange={handleInputChange}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Search for a city..."
                    className="w-full px-6 py-4 bg-white/20 text-white placeholder-white/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-300"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white disabled:opacity-50 transition-all duration-300"
                    disabled={loading}
                  >
                    {loading ? (
                      <RefreshCw size={24} className="animate-spin" />
                    ) : (
                      <Search size={24} />
                    )}
                  </button>
                </div>

                
                {showSuggestions && suggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute z-10 w-full mt-2 bg-white/95 backdrop-blur-lg border border-white/20 rounded-xl shadow-lg max-h-60 overflow-auto"
                  >
                    {suggestions.map((suggestion) => (
                      <button
                        key={`${suggestion.id}-${suggestion.name}`}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full text-left px-6 py-3 hover:bg-white/20 flex items-center space-x-3 transition-all duration-300"
                        disabled={loading}
                      >
                        <MapPin size={18} className="text-purple-400" />
                        <div>
                          <div className="font-medium text-gray-900">{suggestion.name}</div>
                          <div className="text-sm text-gray-600">
                            {suggestion.region && `${suggestion.region}, `}{suggestion.country}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </form>

              {error && (
                <div className="mt-4 p-4 bg-red-500/20 text-white rounded-xl backdrop-blur-lg">
                  {error}
                </div>
              )}
            </div>

            
            {weather && (
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div className="bg-white/20 rounded-2xl p-6 backdrop-blur-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-semibold text-white">
                      {weather.location.name}
                    </h2>
                    <span className="text-sm text-white/80">{weather.location.country}</span>
                  </div>
                  <div className="flex items-center justify-center py-6">
                    <img
                      src={`https:${weather.current.condition.icon}`}
                      alt={weather.current.condition.text}
                      className="w-24 h-24"
                    />
                    <div className="ml-6">
                      <div className="text-5xl font-bold text-white">
                        {isCelsius ? `${weather.current.temp_c}°C` : `${weather.current.temp_f}°F`}
                      </div>
                      <div className="text-white/80 mt-2">{weather.current.condition.text}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/20 rounded-2xl p-6 backdrop-blur-lg">
                  <h3 className="text-xl font-semibold text-white mb-6">Weather Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3">
                      <Wind className="text-blue-300" />
                      <div>
                        <div className="text-white/60">Wind Speed</div>
                        <div className="text-white text-lg">{weather.current.wind_kph} km/h</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Droplets className="text-blue-300" />
                      <div>
                        <div className="text-white/60">Humidity</div>
                        <div className="text-white text-lg">{weather.current.humidity}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            
            {searchHistory.length > 0 && (
              <div className="bg-white/20 rounded-2xl p-6 backdrop-blur-lg">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <History size={20} className="mr-2" /> Recent Searches
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {searchHistory.map((item) => (
                    <button
                      key={item.timestamp}
                      onClick={() => handleHistoryClick(item.city)}
                      className="px-4 py-3 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-all duration-300"
                      disabled={loading}
                    >
                      <Cloud className="inline-block mr-2 h-4 w-4" />
                      {item.city}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
