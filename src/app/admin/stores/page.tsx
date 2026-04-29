"use client";

import { useEffect, useRef, useState } from "react";

import { useAdminAuth } from "@/components/admin/AdminShell";
import {
  createStore,
  deactivateStore,
  getStores,
  type Store,
  updateStore,
} from "@/lib/adminApi";

type StoreForm = {
  name: string;
  latitude: string;
  longitude: string;
  radius: string;
};

const emptyForm: StoreForm = {
  name: "",
  latitude: "",
  longitude: "",
  radius: "",
};

type GoogleLatLngLiteral = { lat: number; lng: number };

type GoogleMapsApi = {
  maps: {
    Map: new (
      element: HTMLElement,
      options: {
        center: GoogleLatLngLiteral;
        zoom: number;
        mapTypeControl?: boolean;
        streetViewControl?: boolean;
      }
    ) => {
      setCenter: (center: GoogleLatLngLiteral) => void;
      setZoom: (zoom: number) => void;
    };
    Marker: new (options: {
      map: {
        setCenter: (center: GoogleLatLngLiteral) => void;
        setZoom: (zoom: number) => void;
      };
      position: GoogleLatLngLiteral;
      title?: string;
    }) => unknown;
    Circle: new (options: {
      map: {
        setCenter: (center: GoogleLatLngLiteral) => void;
        setZoom: (zoom: number) => void;
      };
      center: GoogleLatLngLiteral;
      radius: number;
      fillColor?: string;
      fillOpacity?: number;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
    }) => unknown;
  };
};

declare global {
  interface Window {
    google?: GoogleMapsApi;
  }
}

let googleMapsLoaderPromise: Promise<GoogleMapsApi> | null = null;

function loadGoogleMaps(apiKey: string): Promise<GoogleMapsApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in browser."));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }

  if (googleMapsLoaderPromise) {
    return googleMapsLoaderPromise;
  }

  googleMapsLoaderPromise = new Promise<GoogleMapsApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google?.maps) {
        resolve(window.google);
        return;
      }

      reject(new Error("Google Maps failed to initialize."));
    };

    script.onerror = () => {
      reject(new Error("Failed to load Google Maps script."));
    };

    document.head.appendChild(script);
  });

  return googleMapsLoaderPromise;
}

function radiusToZoom(radiusMeters: number): number {
  if (radiusMeters <= 0) {
    return 16;
  }

  const zoom = Math.round(16 - Math.log2(radiusMeters / 200));
  return Math.max(10, Math.min(19, zoom));
}

function toNumber(value: string): number {
  return Number(value.trim());
}

export default function AdminStoresPage() {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const { token } = useAdminAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  const [form, setForm] = useState<StoreForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const loadStores = async () => {
    setLoading(true);
    setError(null);

    try {
      const rows = await getStores(token);
      setStores(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stores.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStores();
  }, [token]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: form.name.trim(),
        latitude: toNumber(form.latitude),
        longitude: toNumber(form.longitude),
        radius: toNumber(form.radius),
      };

      if (editingId) {
        await updateStore(token, editingId, payload);
      } else {
        await createStore(token, payload);
      }

      resetForm();
      await loadStores();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save store.");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (store: Store) => {
    setEditingId(store.id);
    setForm({
      name: store.name,
      latitude: String(store.latitude),
      longitude: String(store.longitude),
      radius: String(store.radius),
    });
  };

  const handleDeactivate = async (id: string) => {
    setSubmitting(true);
    setError(null);

    try {
      await deactivateStore(token, id);
      await loadStores();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate store.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusToggle = async (store: Store) => {
    setSubmitting(true);
    setError(null);

    try {
      await updateStore(token, store.id, {
        status: store.status === "active" ? "inactive" : "active",
      });
      await loadStores();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!selectedStore || !mapContainerRef.current) {
      return;
    }

    setMapError(null);

    if (!googleMapsApiKey) {
      setMapError("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY. Add it to your .env file.");
      return;
    }

    const center = {
      lat: selectedStore.latitude,
      lng: selectedStore.longitude,
    };

    void loadGoogleMaps(googleMapsApiKey)
      .then((googleApi) => {
        if (!mapContainerRef.current) {
          return;
        }

        const zoom = radiusToZoom(selectedStore.radius);

        const map = new googleApi.maps.Map(mapContainerRef.current, {
          center,
          zoom,
          mapTypeControl: false,
          streetViewControl: false,
        });

        map.setCenter(center);
        map.setZoom(zoom);

        new googleApi.maps.Marker({
          map,
          position: center,
          title: selectedStore.name,
        });

        new googleApi.maps.Circle({
          map,
          center,
          radius: selectedStore.radius,
          fillColor: "#4f46e5",
          fillOpacity: 0.2,
          strokeColor: "#4338ca",
          strokeOpacity: 0.9,
          strokeWeight: 2,
        });
      })
      .catch((err) => {
        setMapError(err instanceof Error ? err.message : "Failed to render Google Maps.");
      });
  }, [selectedStore, googleMapsApiKey]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-semibold text-slate-900">Store Management</h2>
        <p className="mt-1 text-base text-slate-600">Create and manage geofence stores for attendance tracking.</p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h3 className="text-base font-semibold text-slate-900">
          {editingId ? "Edit Store" : "Create New Store"}
        </h3>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="text"
            placeholder="Store name"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            className="rounded-lg border border-slate-300 px-5 py-3 text-base outline-none ring-indigo-500 focus:ring-2"
            required
          />

          <input
            type="number"
            step="0.000001"
            placeholder="Latitude"
            value={form.latitude}
            onChange={(event) => setForm((prev) => ({ ...prev, latitude: event.target.value }))}
            className="rounded-lg border border-slate-300 px-5 py-3 text-base outline-none ring-indigo-500 focus:ring-2"
            required
          />

          <input
            type="number"
            step="0.000001"
            placeholder="Longitude"
            value={form.longitude}
            onChange={(event) => setForm((prev) => ({ ...prev, longitude: event.target.value }))}
            className="rounded-lg border border-slate-300 px-5 py-3 text-base outline-none ring-indigo-500 focus:ring-2"
            required
          />

          <input
            type="number"
            step="1"
            placeholder="Radius (meters)"
            value={form.radius}
            onChange={(event) => setForm((prev) => ({ ...prev, radius: event.target.value }))}
            className="rounded-lg border border-slate-300 px-5 py-3 text-base outline-none ring-indigo-500 focus:ring-2"
            required
          />

          <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {submitting ? "Saving..." : editingId ? "Update Store" : "Create Store"}
            </button>

            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-slate-300 px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>
      </section>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-base text-red-700">{error}</div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h3 className="text-base font-semibold text-slate-900">Stores</h3>

        {loading ? <p className="mt-4 text-base text-slate-500">Loading stores...</p> : null}

        {!loading && stores.length === 0 ? (
          <p className="mt-4 text-base text-slate-500">No stores found.</p>
        ) : null}

        {!loading && stores.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-base lg:text-xl">
              <thead>
                <tr className="border-b border-slate-200 text-sm uppercase text-slate-500">
                  <th className="py-3 pr-5">Name</th>
                  <th className="py-3 pr-5">Latitude</th>
                  <th className="py-3 pr-5">Longitude</th>
                  <th className="py-3 pr-5">Radius</th>
                  <th className="py-3 pr-5">Status</th>
                  <th className="py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((store) => (
                  <tr key={store.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 pr-5 font-medium text-slate-800">{store.name}</td>
                    <td className="py-3 pr-5 text-slate-700">{store.latitude}</td>
                    <td className="py-3 pr-5 text-slate-700">{store.longitude}</td>
                    <td className="py-3 pr-5 text-slate-700">{store.radius}m</td>
                    <td className="py-3 pr-5">
                      <span
                        className={`rounded-full px-2 py-1 text-sm font-semibold ${
                          store.status === "active"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {store.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => startEdit(store)}
                          className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleStatusToggle(store)}
                          className="rounded-lg border border-indigo-300 px-3 py-1 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
                        >
                          Toggle Status
                        </button>
                        <button
                          onClick={() => setSelectedStore(store)}
                          className="rounded-lg border border-violet-300 px-3 py-1 text-sm font-medium text-violet-700 hover:bg-violet-50"
                        >
                          Detail Map
                        </button>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${store.latitude},${store.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-emerald-300 px-3 py-1 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                        >
                          Open Map
                        </a>
                        <button
                          onClick={() => handleDeactivate(store.id)}
                          className="rounded-lg border border-red-300 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-50"
                        >
                          Deactivate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {selectedStore ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-6">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
            <div className="mb-3 flex items-start justify-between gap-6">
              <div>
                <h3 className="text-3xl font-semibold text-slate-900">{selectedStore.name}</h3>
                <p className="mt-1 text-base text-slate-600">
                  Geofence radius: <span className="font-semibold">{selectedStore.radius}m</span>
                </p>
                <p className="text-sm text-slate-500">
                  {selectedStore.latitude}, {selectedStore.longitude}
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedStore(null);
                  setMapError(null);
                }}
                className="rounded-lg border border-slate-300 px-3 py-1 text-base font-medium text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div ref={mapContainerRef} className="h-[420px] w-full overflow-hidden rounded-xl border border-slate-200" />

            {mapError ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-5 py-3 text-base text-amber-800">
                {mapError}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
