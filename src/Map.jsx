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

const escapeHtml = value => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

function Map({ requests = [], volunteers = [], shelters = [], supplies = [], liveLocations = {}, heatmap = [] }) {
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
      if (m.getLayer("resq-heatmap")) m.removeLayer("resq-heatmap");
      if (m.getSource("resq-heatmap")) m.removeSource("resq-heatmap");
      if (heatmap.length) { m.addSource("resq-heatmap",{type:"geojson",data:{type:"FeatureCollection",features:heatmap.map(point=>({type:"Feature",geometry:{type:"Point",coordinates:[point.longitude,point.latitude]},properties:{density:point.density}}))}}); m.addLayer({id:"resq-heatmap",type:"heatmap",source:"resq-heatmap",paint:{"heatmap-weight":["get","density"],"heatmap-radius":28,"heatmap-opacity":0.55,"heatmap-intensity":1.2}}); }
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

      const addMarker = ({ id, coordinates, color, glow, popup }) => {
        if (!Array.isArray(coordinates) || coordinates.length !== 2) return;
        const [lng, lat] = coordinates.map(Number);
        if (![lng, lat].every(Number.isFinite) || lng < -180 || lng > 180 || lat < -90 || lat > 90) return;

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
          .setPopup(new Popup({ offset: 15 }).setHTML(popup))
          .addTo(m);

        markers.current.set(id, marker);
      };

      requests.forEach(request => {
        const status = request.status || "PENDING";
        const resolved = status === "RESOLVED";
        const cancelled = status === "CANCELLED";
        const color = resolved ? "#35d07f" : cancelled ? "#78828a" : "#ff3b30";
        const glow = resolved ? "rgba(53,208,127,.22)" : cancelled ? "rgba(120,130,138,.18)" : "rgba(255,59,48,.25)";
        const assigned = request.assignedVolunteer?.name ? `<br><small>Responder: ${escapeHtml(request.assignedVolunteer.name)}</small>` : "";

        addMarker({
          id: `request:${request._id}`,
          coordinates: request.location?.coordinates,
          color,
          glow,
          popup: `<div style="min-width:200px">
            <strong>${escapeHtml(request.title)}</strong><br>
            <span style="color:${color};font-weight:700">${escapeHtml(status.replaceAll("_", " "))}</span><br>
            <span>${escapeHtml(request.requestType)} · ${escapeHtml(request.priority)}</span><br>
            <small>${request.peopleCount || 1} people affected</small>
            ${assigned}
          </div>`
        });
      });

      volunteers.forEach(volunteer => {
        addMarker({
          id: `volunteer:${volunteer._id}`,
          coordinates: liveLocations[volunteer._id] || volunteer.location?.coordinates,
          color: "#3b82f6",
          glow: "rgba(59,130,246,.22)",
          popup: `<div style="min-width:180px">
            <strong>${escapeHtml(volunteer.name)}</strong><br>
            <span>VOLUNTEER</span><br>
            <small>Skills: ${escapeHtml(volunteer.skills?.join(", ") || "General")}</small><br>
            <small>Status: ${volunteer.available ? "Available" : "On response"}</small>
          </div>`
        });
      });

      shelters.forEach(shelter => {
        addMarker({
          id: `shelter:${shelter._id}`,
          coordinates: shelter.location?.coordinates,
          color: "#43c979",
          glow: "rgba(67,201,121,.22)",
          popup: `<div style="min-width:200px"><strong>${escapeHtml(shelter.name)}</strong><br><span>SHELTER</span><br><small>${escapeHtml(shelter.address || "")}</small><br><small>Occupancy: ${shelter.occupied}/${shelter.capacity}</small></div>`
        });
      });

      supplies.forEach(supply => {
        addMarker({
          id: `supply:${supply._id}`,
          coordinates: supply.location?.coordinates,
          color: "#8b5cf6",
          glow: "rgba(139,92,246,.22)",
          popup: `<div style="min-width:200px"><strong>${escapeHtml(supply.name)}</strong><br><span>${escapeHtml(supply.category)} SUPPLY</span><br><small>Available: ${supply.quantity} ${escapeHtml(supply.unit)}</small><br><small>Provider: ${escapeHtml(supply.providerName)}</small></div>`
        });
      });
    };

    if (m.isStyleLoaded()) render();
    else m.once("load", render);
  }, [requests, volunteers, shelters, supplies, liveLocations, heatmap]);

  return <div className="real-map-wrap">
    <div ref={mapContainer} className="real-map" />
    <div className="map-status-legend">
      <span><i className="map-dot danger" /> Needs help</span>
      <span><i className="map-dot resolved" /> Resolved</span>
      <span><i className="map-dot volunteer" /> Volunteer</span>
      <span><i className="map-dot shelter" /> Shelter</span>
      <span><i className="map-dot supply" /> Supply</span>
    </div>
  </div>;
}

export default Map;
