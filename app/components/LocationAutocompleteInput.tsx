import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  googlePlacesService,
  type LocationData,
  type PlaceSuggestion,
} from '../services/googlePlacesService';

interface LocationAutocompleteInputProps {
  label: string;
  placeholder: string;
  value: string;
  selectedLocation: LocationData | null;
  onChangeText: (value: string) => void;
  onSelectLocation: (location: LocationData) => void;
  onUseCurrentLocation: () => void;
  gettingCurrentLocation: boolean;
  useCurrentLabel: string;
  coordinatesLabel: string;
  searchFailedMessage: string;
  noResultsMessage: string;
}

export function LocationAutocompleteInput({
  label,
  placeholder,
  value,
  selectedLocation,
  onChangeText,
  onSelectLocation,
  onUseCurrentLocation,
  gettingCurrentLocation,
  useCurrentLabel,
  coordinatesLabel,
  searchFailedMessage,
  noResultsMessage,
}: LocationAutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [showNoResults, setShowNoResults] = useState(false);
  const skipNextSearch = useRef(false);
  const latitude = Number(selectedLocation?.latitude);
  const longitude = Number(selectedLocation?.longitude);
  const hasValidCoordinates = selectedLocation !== null
    && Number.isFinite(latitude)
    && Number.isFinite(longitude);

  const [searchInputs, setSearchInputs] = useState({ value, hasValidCoordinates });
  if (searchInputs.value !== value || searchInputs.hasValidCoordinates !== hasValidCoordinates) {
    setSearchInputs({ value, hasValidCoordinates });
    if (value.trim().length < 2 || hasValidCoordinates) {
      setSuggestions([]); setShowNoResults(false); setSearchError(''); setSearching(false);
    }
  }

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }

    const query = value.trim();
    if (query.length < 2 || hasValidCoordinates) return;

    let active = true;
    const timeout = setTimeout(async () => {
      setSearching(true);
      setSearchError('');
      try {
        const results = await googlePlacesService.searchLocations(query);
        if (!active) return;
        setSuggestions(results);
        setShowNoResults(results.length === 0);
      } catch {
        if (!active) return;
        setSuggestions([]);
        setShowNoResults(false);
        setSearchError(searchFailedMessage);
      } finally {
        if (active) setSearching(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [hasValidCoordinates, searchFailedMessage, value]);

  const selectSuggestion = async (suggestion: PlaceSuggestion) => {
    setSearching(true);
    setSearchError('');
    try {
      const location = await googlePlacesService.getPlaceDetails(suggestion.placeId);
      skipNextSearch.current = true;
      setSuggestions([]);
      setShowNoResults(false);
      onSelectLocation(location);
    } catch {
      setSearchError(searchFailedMessage);
    } finally {
      setSearching(false);
    }
  };

  return (
    <View style={styles.inputContainer}>
      <View style={styles.inputLabelRow}>
        <Text style={styles.inputLabel}>{label}</Text>
        <TouchableOpacity
          style={styles.locationButton}
          onPress={onUseCurrentLocation}
          disabled={gettingCurrentLocation}
        >
          {gettingCurrentLocation ? (
            <ActivityIndicator size="small" color="#0F4C75" />
          ) : (
            <>
              <Ionicons name="location" size={16} color="#0F4C75" />
              <Text style={styles.locationButtonText}>{useCurrentLabel}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View>
        <TextInput
          style={[styles.input, hasValidCoordinates && styles.inputSelected]}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor="#6b8aa0"
          autoCorrect={false}
          autoCapitalize="words"
        />
        {searching && (
          <ActivityIndicator style={styles.searchSpinner} size="small" color="#0F4C75" />
        )}
      </View>

      {(suggestions.length > 0 || searchError || showNoResults) && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={suggestion.placeId}
              style={[styles.suggestion, index < suggestions.length - 1 && styles.suggestionBorder]}
              onPress={() => selectSuggestion(suggestion)}
            >
              <Ionicons name="location-outline" size={18} color="#3282B8" />
              <View style={styles.suggestionTextContainer}>
                <Text style={styles.suggestionTitle}>{suggestion.mainText}</Text>
                {!!suggestion.secondaryText && (
                  <Text style={styles.suggestionSubtitle}>{suggestion.secondaryText}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
          {!!searchError && <Text style={styles.statusText}>{searchError}</Text>}
          {showNoResults && <Text style={styles.statusText}>{noResultsMessage}</Text>}
        </View>
      )}

      {hasValidCoordinates && (
        <View style={styles.coordinatesInfo}>
          <Ionicons name="checkmark-circle" size={14} color="#15803d" />
          <Text style={styles.coordinatesText}>
            {coordinatesLabel}: {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: { gap: Platform.OS === 'android' ? 7 : 8 },
  inputLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inputLabel: { fontSize: Platform.OS === 'android' ? 14 : 15, fontWeight: '500', color: '#334155' },
  locationButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Platform.OS === 'android' ? 10 : 12,
    paddingVertical: Platform.OS === 'android' ? 5 : 6,
    backgroundColor: '#dce8f2', borderRadius: Platform.OS === 'android' ? 10 : 12,
  },
  locationButtonText: { fontSize: Platform.OS === 'android' ? 11 : 12, fontWeight: '600', color: '#0F4C75' },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: Platform.OS === 'android' ? 10 : 12,
    padding: Platform.OS === 'android' ? 14 : 16,
    paddingRight: 44, fontSize: Platform.OS === 'android' ? 15 : 16, color: '#0d2137',
  },
  inputSelected: { borderColor: '#27ae60' },
  searchSpinner: { position: 'absolute', right: 14, top: Platform.OS === 'android' ? 15 : 17 },
  suggestionsContainer: {
    overflow: 'hidden', backgroundColor: '#fff', borderWidth: 1, borderColor: '#dce8f2',
    borderRadius: 12, shadowColor: '#0F4C75', shadowOpacity: 0.12, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  suggestionBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8f0' },
  suggestionTextContainer: { flex: 1 },
  suggestionTitle: { color: '#0d2137', fontSize: 14, fontWeight: '600' },
  suggestionSubtitle: { color: '#64748b', fontSize: 12, marginTop: 2 },
  statusText: { color: '#64748b', fontSize: 12, padding: 12 },
  coordinatesInfo: {
    flexDirection: 'row', alignItems: 'center', gap: Platform.OS === 'android' ? 5 : 6,
    paddingHorizontal: Platform.OS === 'android' ? 10 : 12,
    paddingVertical: Platform.OS === 'android' ? 7 : 8,
    backgroundColor: '#f0fdf4', borderRadius: Platform.OS === 'android' ? 7 : 8,
  },
  coordinatesText: { fontSize: Platform.OS === 'android' ? 11 : 12, color: '#15803d', fontWeight: '500' },
});
