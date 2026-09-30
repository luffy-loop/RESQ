import { useEffect, useRef } from "react";
import {
  Map as MapLibre,
  Marker,
  Popup,
  NavigationControl,
  setWorkerUrl
} from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";

setWorkerUrl(workerUrl);

function Map({
  requests = [],
  volunteers = [],
  shelters = [],
  supplies = [],
  liveLocations = {}
}) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef(new Map());

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const m = new MapLibre({
      container: mapContainer.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [78.4867, 17.385],
      zoom: 12
    });

    map.current = m;
    m.addControl(new NavigationControl(), "top-right");

    return () => {
      markers.current.forEach(marker => marker.remove());
      markers.current.clear();
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;

    if (!m) return;

    const render = () => {
      markers.current.forEach(marker => marker.remove());
      markers.current.clear();

      const addMarker = ({
        id,
        coordinates,
        color,
        glow,
        popup
      }) => {
        if (!Array.isArray(coordinates) || coordinates.length !== 2) return;

        const [lng, lat] = coordinates;

        if (
          typeof lng !== "number" ||
          typeof lat !== "number" ||
          lng < -180 ||
          lng > 180 ||
          lat < -90 ||
          lat > 90
        ) {
          return;
        }

        const el = document.createElement("div");

        el.style.width = "18px";
        el.style.height = "18px";
        el.style.background = color;
        el.style.border = "3px solid white";
        el.style.borderRadius = "50%";
        el.style.boxShadow = `0 0 0 6px ${glow}`;
        el.style.cursor = "pointer";

        const marker = new Marker({ element: el })
          .setLngLat([lng, lat])
          .setPopup(
            new Popup({ offset: 15 }).setHTML(popup)
          )
          .addTo(m);

        markers.current.set(id, marker);
      };

      requests.forEach(request => {
        addMarker({
          id: `request:${request._id}`,
          coordinates: request.location?.coordinates,
          color: "#fc6c26",
          glow: "rgba(252, 108, 38, 0.22)",
          popup: `
            <div style="min-width:180px">
              <strong>${request.title}</strong>
              <br>
              <span>${request.requestType}</span>
              <br>
              <span>${request.priority}</span>
              <br>
              <small>${request.peopleCount || 1} people affected</small>
              ${request.assignedVolunteer
                ? `<br><small>Assigned to: ${request.assignedVolunteer.name}</small>`
                : ""}
            </div>
          `
        });
      });

      volunteers.forEach(volunteer => {
        const stored = volunteer.location?.coordinates;
        const live = liveLocations[volunteer._id];

        addMarker({
          id: `volunteer:${volunteer._id}`,
          coordinates: live || stored,
          color: "#3b82f6",
          glow: "rgba(59, 130, 246, 0.22)",
          popup: `
            <div style="min-width:180px">
              <strong>${volunteer.name}</strong>
              <br>
              <span>VOLUNTEER</span>
              <br>
              <small>Skills: ${volunteer.skills?.join(", ") || "General"}</small>
              <br>
              <small>Status: ${volunteer.available ? "Available" : "Busy"}</small>
              ${live ? "<br><small>Live location: ON</small>" : ""}
            </div>
          `
        });
      });

      shelters.forEach(shelter => {
        addMarker({
          id: `shelter:${shelter._id}`,
          coordinates: shelter.location?.coordinates,
          color: "#43c979",
          glow: "rgba(67, 201, 121, 0.22)",
          popup: `
            <div style="min-width:210px">
              <strong>${shelter.name}</strong>
              <br>
              <span>SHELTER</span>
              <br>
              <small>${shelter.address || ""}</small>
              <br><br>
              <small>Occupancy: ${shelter.occupied}/${shelter.capacity}</small>
              <br>
              <small>Resources: ${shelter.resources?.join(", ") || "None"}</small>
              <br>
              <small>Contact: ${shelter.contact || "N/A"}</small>
            </div>
          `
        });
      });

      supplies.forEach(supply => {
        addMarker({
          id: `supply:${supply._id}`,
          coordinates: supply.location?.coordinates,
          color: "#8b5cf6",
          glow: "rgba(139, 92, 246, 0.22)",
          popup: `
            <div style="min-width:210px">
              <strong>${supply.name}</strong>
              <br>
              <span>${supply.category} SUPPLY</span>
              <br>
              <small>Available: ${supply.quantity} ${supply.unit}</small>
              <br>
              <small>Provider: ${supply.providerName}</small>
              <br>
              <small>Contact: ${supply.contact || "N/A"}</small>
            </div>
          `
        });
      });
    };

    if (m.isStyleLoaded()) {
      render();
    } else {
      m.once("load", render);
    }
  }, [requests, volunteers, shelters, supplies, liveLocations]);

  return <div ref={mapContainer} className="real-map" />;
}

export default Map;


