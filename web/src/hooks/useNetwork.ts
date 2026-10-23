import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Route, Stop, SafeSpot } from "@transitiq/shared";
import { DEFAULT_ROUTES, DEFAULT_STOPS, DEFAULT_SAFE_SPOTS } from "../data/defaultNetwork";

export interface NetworkState {
  routes: Route[];
  stops: Stop[];
  safeSpots?: SafeSpot[];
  loading: boolean;
  error: Error | null;
}

export function useNetwork(): NetworkState {
  const [routes, setRoutes] = useState<Route[]>(DEFAULT_ROUTES);
  const [stops, setStops] = useState<Stop[]>(DEFAULT_STOPS);
  const [safeSpots, setSafeSpots] = useState<SafeSpot[]>(DEFAULT_SAFE_SPOTS);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadNetwork() {
      try {
        const [stopsSnap, routesSnap, safeSpotsSnap] = await Promise.all([
          getDocs(collection(db, "stops")),
          getDocs(collection(db, "routes")),
          getDocs(collection(db, "safeSpots")),
        ]);

        if (!isMounted) return;

        if (!stopsSnap.empty && !routesSnap.empty) {
          const loadedStops = stopsSnap.docs.map((d) => Stop.parse(d.data()));
          const loadedRoutes = routesSnap.docs.map((d) => Route.parse(d.data()));
          const loadedSpots = safeSpotsSnap.docs.map((d) => SafeSpot.parse(d.data()));

          setStops(loadedStops);
          setRoutes(loadedRoutes);
          setSafeSpots(loadedSpots);
        }
        setError(null);
      } catch {
        if (!isMounted) return;
        // Keep resilient DEFAULT_STOPS and DEFAULT_ROUTES on any Firestore error / offline
        setError(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadNetwork();

    return () => {
      isMounted = false;
    };
  }, []);

  return { routes, stops, safeSpots, loading, error };
}
