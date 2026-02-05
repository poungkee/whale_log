import { create } from 'zustand';

interface Location {
  latitude: number;
  longitude: number;
}

interface LocationState {
  currentLocation: Location | null;
  selectedRegion: string | null;
  setLocation: (location: Location | null) => void;
  setRegion: (region: string | null) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  currentLocation: null,
  selectedRegion: null,

  setLocation: (currentLocation) => set({ currentLocation }),
  setRegion: (selectedRegion) => set({ selectedRegion }),
}));
