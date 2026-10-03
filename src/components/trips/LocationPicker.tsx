"use client";

import React, { useState, useEffect, useRef } from "react";
import { locationsApi } from "@/lib/api/locations";
import { ResolvedLocation, TripLocationInput } from "@/types";
import { MapPin, Search, Loader2, X, Check, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LocationPickerProps {
  label: string;
  placeholder?: string;
  value: TripLocationInput | null;
  onChange: (location: TripLocationInput | null) => void;
  error?: string;
  id?: string;
  variant?: "origin" | "destination";
}

export function LocationPicker({
  label,
  placeholder = "Search landmark or city...",
  value,
  onChange,
  error,
  id,
  variant = "origin",
}: LocationPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResolvedLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (value) {
      // Already selected
      setResults([]);
      setIsLoading(false);
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      setSearchError(null);
      return;
    }

    setIsLoading(true);
    setSearchError(null);

    const timer = setTimeout(async () => {
      try {
        const locations = await locationsApi.search(trimmed, 6);
        setResults(locations);
        setIsOpen(true);
      } catch (err: unknown) {
        setSearchError(err instanceof Error ? err.message : "Search failed");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, value]);

  const handleSelect = (loc: ResolvedLocation) => {
    const locationInput: TripLocationInput = {
      ...(loc.displayName ? { name: loc.displayName.slice(0, 100) } : {}),
      formattedAddress: loc.formattedAddress,
      latitude: loc.latitude,
      longitude: loc.longitude,
      ...(loc.googlePlaceId ? { googlePlaceId: loc.googlePlaceId.slice(0, 100) } : {}),
      ...(loc.serpApiDataId ? { serpApiDataId: loc.serpApiDataId.slice(0, 100) } : {}),
    };

    onChange(locationInput);
    setIsOpen(false);
    setQuery("");
  };

  const handleClear = () => {
    onChange(null);
    setQuery("");
    setResults([]);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const accentColor = variant === "origin" ? "emerald" : "indigo";
  const pinColor = variant === "origin" ? "text-emerald-600 bg-emerald-50 border-emerald-200" : "text-indigo-600 bg-indigo-50 border-indigo-200";

  return (
    <div className="w-full space-y-1.5" ref={containerRef} id={id}>
      <label className="block text-xs font-semibold text-slate-700 tracking-wide">
        {label}
      </label>

      {value ? (
        // Selected Location Card
        <div className={cn(
          "flex items-start justify-between gap-3 p-3 rounded-xl border bg-slate-50/70 transition-all",
          variant === "origin" ? "border-emerald-200/80 bg-emerald-50/20" : "border-indigo-200/80 bg-indigo-50/20"
        )}>
          <div className="flex items-start gap-2.5 min-w-0">
            <div className={cn("p-1.5 rounded-lg border shrink-0 mt-0.5", pinColor)}>
              <MapPin className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-sm text-slate-900 truncate">
                  {value.name || value.formattedAddress}
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-200/70 text-slate-700">
                  {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {value.formattedAddress}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors shrink-0"
            title="Change location"
            aria-label="Change location"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        // Search Input
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              className={cn(
                "w-full pl-10 pr-10 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 text-sm rounded-xl border border-slate-200 transition-all focus:outline-none focus:ring-2 shadow-xs",
                variant === "origin"
                  ? "focus:ring-emerald-500 focus:border-emerald-500"
                  : "focus:ring-indigo-500 focus:border-indigo-500",
                error && "border-rose-400 focus:ring-rose-500 focus:border-rose-500"
              )}
              placeholder={placeholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => {
                if (results.length > 0) setIsOpen(true);
              }}
            />
            {isLoading && (
              <Loader2 className="absolute right-3.5 h-4 w-4 text-slate-400 animate-spin" />
            )}
            {!isLoading && query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setResults([]);
                }}
                className="absolute right-3 p-0.5 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {isOpen && (query.trim().length >= 2 || results.length > 0) && (
            <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-lg py-1">
              {isLoading && results.length === 0 ? (
                <div className="p-3 text-xs text-slate-400 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Searching authoritative locations...
                </div>
              ) : results.length > 0 ? (
                results.map((loc, idx) => (
                  <button
                    key={`${loc.googlePlaceId || loc.serpApiDataId || idx}-${loc.latitude}-${loc.longitude}`}
                    type="button"
                    onClick={() => handleSelect(loc)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 transition-colors flex items-start gap-2.5 border-b border-slate-100 last:border-b-0"
                  >
                    <MapPin className={cn(
                      "h-4 w-4 shrink-0 mt-0.5",
                      variant === "origin" ? "text-emerald-500" : "text-indigo-500"
                    )} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-slate-900 truncate">
                          {loc.displayName || loc.formattedAddress}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 shrink-0">
                          {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {loc.formattedAddress}
                      </p>
                    </div>
                  </button>
                ))
              ) : !isLoading && query.trim().length >= 2 ? (
                <div className="p-3 text-xs text-slate-500 text-center">
                  No matching locations found for &ldquo;{query}&rdquo;
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-rose-600 font-medium">{error}</p>
      )}
    </div>
  );
}
