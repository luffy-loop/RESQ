import { useState } from "react";
import axios from "axios";
import { AlertTriangle, CheckCircle2, MapPin, ShieldAlert, X } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

function EmergencyForm({ onClose, onCreated }) {
  const [form, setForm] = useState({
    disasterType: "FLOOD",
    requestType: "MEDICAL",
    title: "",
    description: "",
    peopleCount: 1,
    priority: "HIGH",
    reporterName: "",
    reporterPhone: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocation] = useState({
    latitude: null,
    longitude: null,
    accuracy: null
  });
  const [locating, setLocating] = useState(false);

  const update = event => {
    setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  };

  const captureLocation = () => {
    if (!navigator.geolocation) {
      alert("Location is not supported by this browser.");
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      position => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setLocating(false);
      },
      () => {
        setLocating(false);
        alert("Location access is needed to send your exact emergency position.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const submit = async event => {
    event.preventDefault();

    try {
      setSubmitting(true);

      let currentLocation = location;

      if (currentLocation.latitude === null || currentLocation.longitude === null) {
        currentLocation = await new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error("Location is not supported by this browser."));
            return;
          }

          navigator.geolocation.getCurrentPosition(
            position => resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            }),
            () => reject(new Error("Location access is needed to send your emergency.")),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
        });

        setLocation(currentLocation);
      }

      const res = await axios.post(`${API}/requests`, {
        requestType: form.requestType,
        title: form.title,
        description: form.description,
        peopleCount: Number(form.peopleCount),
        priority: form.priority,
        disasterType: form.disasterType,
        reporterName: form.reporterName.trim(),
        reporterPhone: form.reporterPhone.trim(),
        location: {
          type: "Point",
          coordinates: [currentLocation.longitude, currentLocation.latitude]
        }
      });

      const request = res.data.request;
      if (request?.reporterToken) {
        localStorage.setItem("resqReporterToken", request.reporterToken);
      }

      onCreated(request);
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Unable to create emergency");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="citizen-modal-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="citizen-modal citizen-report-modal">
        <div className="citizen-modal-header">
          <div>
            <div className="citizen-modal-kicker"><ShieldAlert size={14} /> NO ACCOUNT REQUIRED</div>
            <h3>Send an emergency report</h3>
            <p>Tell RESQ what is happening. We will attach your live location and route the request to responders.</p>
          </div>
          <button className="citizen-close" onClick={onClose} type="button" aria-label="Close report form">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="citizen-form-section">
            <span className="citizen-form-section-title">WHAT IS HAPPENING?</span>
            <div className="citizen-form-grid">
              <label>
                Disaster type
                <select name="disasterType" value={form.disasterType} onChange={update}>
                  <option value="FLOOD">Flood</option>
                  <option value="EARTHQUAKE">Earthquake</option>
                  <option value="CYCLONE">Cyclone</option>
                  <option value="FIRE">Fire</option>
                  <option value="LANDSLIDE">Landslide</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
              <label>
                Emergency type
                <select name="requestType" value={form.requestType} onChange={update}>
                  <option value="MEDICAL">Medical</option>
                  <option value="FOOD">Food</option>
                  <option value="WATER">Water</option>
                  <option value="RESCUE">Rescue</option>
                  <option value="SHELTER">Shelter</option>
                  <option value="CLOTHING">Clothing</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
              <label>
                People affected
                <input type="number" name="peopleCount" min="1" value={form.peopleCount} onChange={update} required />
              </label>
            </div>

            <label>
              Short description
              <input name="title" value={form.title} onChange={update} placeholder="Example: Family trapped on second floor" required />
            </label>

            <label>
              More details <span className="optional">optional</span>
              <textarea name="description" value={form.description} onChange={update} placeholder="Anything responders should know..." rows="4" />
            </label>

            <label>
              Priority
              <select name="priority" value={form.priority} onChange={update}>
                <option value="CRITICAL">Critical — immediate danger</option>
                <option value="HIGH">High — urgent help</option>
                <option value="MEDIUM">Medium — assistance needed</option>
                <option value="LOW">Low — non-urgent</option>
              </select>
            </label>
          </div>

          <div className="citizen-form-section">
            <span className="citizen-form-section-title">HOW CAN WE REACH YOU?</span>
            <div className="citizen-form-grid">
              <label>
                Your name <span className="optional">optional</span>
                <input name="reporterName" value={form.reporterName} onChange={update} placeholder="Name" />
              </label>
              <label>
                Phone <span className="optional">optional</span>
                <input type="tel" name="reporterPhone" value={form.reporterPhone} onChange={update} placeholder="10-digit number" />
              </label>
            </div>
          </div>

          <div className="citizen-location-box">
            <div className="citizen-location-icon"><MapPin size={18} /></div>
            <div>
              <strong>Live emergency location</strong>
              <span>{location.latitude !== null ? `GPS locked · ±${Math.round(location.accuracy || 0)}m accuracy` : "Your browser will ask for location access."}</span>
            </div>
            <button type="button" className="citizen-location-button" onClick={captureLocation} disabled={locating}>
              {locating ? "Locating..." : location.latitude !== null ? "Refresh" : "Use location"}
            </button>
          </div>

          <div className="citizen-safety-note">
            <AlertTriangle size={16} />
            <span>For immediate life-threatening danger, contact local emergency services as well as RESQ.</span>
          </div>

          <button className="citizen-submit" type="submit" disabled={submitting}>
            {submitting ? "Sending report..." : "Send Emergency Report"}
            {!submitting && <CheckCircle2 size={17} />}
          </button>
        </form>
      </div>
    </div>
  );
}

export default EmergencyForm;
