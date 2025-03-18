import React, { useState, useEffect, useCallback } from 'react';
import debounce from 'lodash/debounce';
import './CitySearch.css';

interface City {
  name: string;
  country: string;
  state?: string;
  lat: number;
  lon: number;
}

interface CitySearchProps {
  onCitySelect: (city: City) => void;
}

const CitySearch: React.FC<CitySearchProps> = ({ onCitySelect }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchSuggestions = useCallback(
    debounce(async (input: string) => {
      if (input.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `https://api.openweathermap.org/geo/1.0/direct?q=${input}&limit=5&appid=${process.env.REACT_APP_WEATHER_API_KEY}`
        );
        const data = await response.json();
        setSuggestions(data);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      }
      setIsLoading(false);
    }, 300),
    []
  );

  useEffect(() => {
    fetchSuggestions(searchTerm);
  }, [searchTerm, fetchSuggestions]);

  const handleSuggestionClick = (city: City) => {
    setSearchTerm(city.name);
    setSuggestions([]);
    onCitySelect(city);
  };

  return (
    <div className="city-search">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search for a city..."
        className="search-input"
      />
      {isLoading && <div className="loading">Loading...</div>}
      {suggestions.length > 0 && (
        <ul className="suggestions-list">
          {suggestions.map((city, index) => (
            <li
              key={`${city.lat}-${city.lon}-${index}`}
              onClick={() => handleSuggestionClick(city)}
            >
              {city.name}, {city.country}
              {city.state && `, ${city.state}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CitySearch;