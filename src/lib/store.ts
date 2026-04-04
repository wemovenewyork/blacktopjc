import { create } from 'zustand';
import { User, Court } from '@/types';
import { Session } from '@supabase/supabase-js';

interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface AuthSlice {
  user: User | null;
  session: Session | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
}

interface CourtsSlice {
  courts: Court[];
  activeCourts: Record<string, number>; // court_id -> checkin count
  setCourts: (courts: Court[]) => void;
  setActiveCourts: (active: Record<string, number>) => void;
  updateCourtActivity: (courtId: string, count: number) => void;
}

interface UISlice {
  selectedTab: string;
  mapRegion: MapRegion;
  setSelectedTab: (tab: string) => void;
  setMapRegion: (region: MapRegion) => void;
}

type Store = AuthSlice & CourtsSlice & UISlice;

export const useStore = create<Store>((set) => ({
  // Auth
  user: null,
  session: null,
  loading: true,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),

  // Courts
  courts: [],
  activeCourts: {},
  setCourts: (courts) => set({ courts }),
  setActiveCourts: (active) => set({ activeCourts: active }),
  updateCourtActivity: (courtId, count) =>
    set((state) => ({
      activeCourts: { ...state.activeCourts, [courtId]: count },
    })),

  // UI
  selectedTab: 'Home',
  mapRegion: {
    latitude: 40.7282,
    longitude: -74.0776,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  },
  setSelectedTab: (tab) => set({ selectedTab: tab }),
  setMapRegion: (region) => set({ mapRegion: region }),
}));
