import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  CheckCircle2,
  Clock3,
  Crosshair,
  LogOut,
  MapPin,
  Navigation,
  Radio,
  ShieldCheck,
  Siren,
  UserRound,
  XCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import useResqSocket from "./hooks/useResqSocket";
import "./VolunteerDashboard.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

const flow = [
  "ASSIGNED",
  "ACCEPTED",
  "ON_THE_WAY",
  "ARRIVED",
  "IN_PROGRESS",
  "RESOLVED"
];

const labels = {
  ASSIGNED: "Assigned",
  ACCEPTED: "Accepted",
  ON_THE_WAY: "On the way",
  ARRIVED: "Arrived",
  IN_PROGRESS: "In progress",
  RESOLVED: "Completed"
};

function VolunteerDashboard() {
  const [volunteer, setVolunteer] = useState(null);
  const [assigned, setAssigned] = useState([]);
  const [openRequests, setOpenRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [claiming, setClaiming] = useState(null);
  const [notice, setNotice] = useState(null);
  const [online, setOnline] = useState(false);
  const [sharing, setSharing] = useState(false);

  const watchRef = useRef(null);
  const socketRef = useRef(null);

  const user = useMemo(
    () => JSON.parse(localStorage.getItem("user") || "null"),
    []
  );

  const loadData = useCallback(async () => {
    if (!user?._id) return;

    try {
      const [volunteersRes, requestsRes] = await Promise.all([
        axios.get(`${API}/volunteers`),
        axios.get(`${API}/requests`)
      ]);

      const me = (volunteersRes.data || []).find(
        item => item._id === user._id
      );

      const all = requestsRes.data.requests || [];

      setVolunteer(me || null);

      setAssigned(
        all.filter(
          item =>
            item.assignedVolunteer?._id === user._id ||
            item.assignedVolunteer === user._id
        )
      );

      setOpenRequests(
        all.filter(item => item.status === "PENDING")
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useResqSocket({
    volunteerId: volunteer?._id,

    onAssignment: data => {
      setNotice({
        title: "New assignment",
        message:
          data?.request?.title ||
          "A new emergency has been assigned to you.",
        tone: "good"
      });

      void loadData();
    },

    onEmergencyUpdate: loadData,

    onNotification: setNotice,

    onConnectionChange: setOnline,

    onSocketReady: socket => {
      socketRef.current = socket;
    }
  });

  useEffect(() => {
    if (!notice) return;

    const timer = setTimeout(() => {
      setNotice(null);
    }, 4500);

    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    return () => {
      if (
        watchRef.current !== null &&
        navigator.geolocation
      ) {
        navigator.geolocation.clearWatch(watchRef.current);
      }
    };
  }, []);

  const updateStatus = async (id, status) => {
    try {
      setUpdating(id);

      await axios.patch(`${API}/requests/${id}`, {
        status
      });

      await loadData();
    } catch (err) {
      setNotice({
        title: "Update failed",
        message:
          err.response?.data?.message ||
          "Unable to update response.",
        tone: "bad"
      });
    } finally {
      setUpdating(null);
    }
  };

  const claim = async id => {
    try {
      setClaiming(id);

      await axios.post(`${API}/requests/${id}/assign`, {
        volunteerId: user._id
      });

      await loadData();

      setNotice({
        title: "Assignment received",
        message:
          "The emergency is now assigned to you. Accept it to begin the response sequence.",
        tone: "good"
      });
    } catch (err) {
      setNotice({
        title: "Could not accept",
        message:
          err.response?.data?.message ||
          "This request may have already been assigned.",
        tone: "bad"
      });
    } finally {
      setClaiming(null);
    }
  };

  const toggleAvailability = async () => {
    if (!volunteer) return;

    try {
      await axios.patch(
        `${API}/volunteers/${volunteer._id}/availability`,
        {
          available: !volunteer.available
        }
      );

      await loadData();
    } catch (err) {
      setNotice({
        title: "Availability failed",
        message:
          err.response?.data?.message ||
          "Unable to update availability.",
        tone: "bad"
      });
    }
  };

  const toggleLocation = () => {
    if (!navigator.geolocation || !volunteer) {
      return setNotice({
        title: "GPS unavailable",
        message:
          "This browser cannot share live location.",
        tone: "bad"
      });
    }

    if (sharing) {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(
          watchRef.current
        );
      }

      watchRef.current = null;
      setSharing(false);
      return;
    }

    const id = navigator.geolocation.watchPosition(
      async position => {
        const longitude = position.coords.longitude;
        const latitude = position.coords.latitude;

        try {
          await axios.patch(
            `${API}/volunteers/${volunteer._id}/location`,
            {
              longitude,
              latitude
            }
          );

          socketRef.current?.emit("volunteer-location", {
            volunteerId: volunteer._id,
            coordinates: [longitude, latitude]
          });
        } catch (err) {
          console.error(err);
        }
      },
      () => {
        setSharing(false);

        setNotice({
          title: "Location permission needed",
          message:
            "Allow GPS access to share your response position.",
          tone: "bad"
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );

    watchRef.current = id;
    setSharing(true);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login?role=VOLUNTEER";
  };

  if (loading) {
    return (
      <div className="vol-page">
        <div className="vol-loading">
          Loading response network...
        </div>
      </div>
    );
  }

  if (!volunteer) {
    return (
      <div className="vol-page">
        <div className="vol-loading">
          Volunteer account not found.{" "}
          <Link to="/login?role=VOLUNTEER">
            Return to login
          </Link>
        </div>
      </div>
    );
  }

  const active = assigned.filter(item =>
    flow.slice(0, 5).includes(item.status)
  );

  const completed = assigned.filter(
    item => item.status === "RESOLVED"
  );

  return (
    <div className="vol-page">
      {notice && (
        <div className={`vol-toast ${notice.tone}`}>
          <div>
            <strong>{notice.title}</strong>
            <span>{notice.message}</span>
          </div>

          <button onClick={() => setNotice(null)}>
            <XCircle size={17} />
          </button>
        </div>
      )}

      <header className="vol-header">
        <Link to="/" className="vol-brand">
          <span>
            <ShieldCheck size={20} />
          </span>

          <div>
            <strong>RESQ</strong>
            <small>VOLUNTEER RESPONSE NETWORK</small>
          </div>
        </Link>

        <div className="vol-actions">
          <span
            className={`vol-live ${online ? "online" : ""}`}
          >
            <i />
            {online ? "LIVE" : "OFFLINE"}
          </span>

          <button
            className={`vol-pill ${
              volunteer.available ? "available" : "paused"
            }`}
            onClick={toggleAvailability}
          >
            <i />
            {volunteer.available
              ? "Available"
              : "Paused"}
          </button>

          <button
            className={`vol-location ${
              sharing ? "sharing" : ""
            }`}
            onClick={toggleLocation}
          >
            <MapPin size={15} />
            {sharing
              ? "Sharing GPS"
              : "Share GPS"}
          </button>

          <button
            className="vol-logout"
            onClick={logout}
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </header>

      <main className="vol-main">
        <section className="vol-hero">
          <div>
            <span className="vol-kicker">
              FIELD OPERATIONS
            </span>

            <h1>
              Welcome,{" "}
              {volunteer.name.split(" ")[0]}.
            </h1>

            <p>
              See assignments, accept open emergencies
              and move each response through its live
              operational stages.
            </p>

            <div className="vol-skills">
              {(volunteer.skills || []).length ? (
                volunteer.skills.map(skill => (
                  <span key={skill}>{skill}</span>
                ))
              ) : (
                <span>General response</span>
              )}
            </div>
          </div>

          <div className="vol-hero-status">
            <div className="hero-radar">
              <Crosshair size={25} />
            </div>

            <strong>
              {active.length
                ? `${active.length} active`
                : "Standby"}
            </strong>

            <span>
              {volunteer.available
                ? "Available for assignment"
                : "Currently on response"}
            </span>
          </div>
        </section>

        <section className="vol-stats">
          <Stat
            icon={<Siren />}
            label="Active response"
            value={active.length}
          />

          <Stat
            icon={<CheckCircle2 />}
            label="Completed"
            value={completed.length}
          />

          <Stat
            icon={<Radio />}
            label="Network"
            value={online ? "LIVE" : "OFF"}
          />

          <Stat
            icon={<MapPin />}
            label="GPS"
            value={sharing ? "ON" : "OFF"}
          />
        </section>

        <div className="vol-layout">
          <section className="vol-panel">
            <div className="vol-panel-head">
              <div>
                <span>MY RESPONSE QUEUE</span>
                <h2>Assigned emergencies</h2>
              </div>

              <b>{active.length}</b>
            </div>

            {active.length === 0 ? (
              <Empty
                icon={<Clock3 />}
                title="No active assignment"
                text="When RESQ assigns an emergency, it will appear here."
              />
            ) : (
              <div className="vol-list">
                {active.map(item => (
                  <Assignment
                    key={item._id}
                    item={item}
                    updating={
                      updating === item._id
                    }
                    onStatus={updateStatus}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="vol-panel">
            <div className="vol-panel-head">
              <div>
                <span>OPEN RESPONSE QUEUE</span>
                <h2>Emergencies waiting</h2>
              </div>

              <b>{openRequests.length}</b>
            </div>

            {openRequests.length === 0 ? (
              <Empty
                icon={<CheckCircle2 />}
                title="Queue is clear"
                text="No unassigned emergencies are waiting right now."
              />
            ) : (
              <div className="vol-list">
                {openRequests
                  .slice(0, 8)
                  .map(item => (
                    <OpenRequest
                      key={item._id}
                      item={item}
                      claiming={
                        claiming === item._id
                      }
                      onClaim={claim}
                    />
                  ))}
              </div>
            )}
          </section>
        </div>

        <section className="vol-completed">
          <div className="vol-completed-head">
            <div>
              <span>RESPONSE HISTORY</span>
              <h2>Resolved emergencies</h2>
            </div>

            <b>{completed.length}</b>
          </div>

          {completed.length === 0 ? (
            <div className="vol-empty">
              <span>
                <CheckCircle2 />
              </span>

              <strong>No resolved cases yet</strong>

              <p>
                Completed responses will stay here
                for future reference.
              </p>
            </div>
          ) : (
            <div className="vol-completed-list">
              {completed.map(item => (
                <article
                  className="vol-completed-item"
                  key={item._id}
                >
                  <strong>{item.title}</strong>

                  <p>
                    {item.requestType} ·{" "}
                    {item.peopleCount || 1} people
                  </p>

                  <small>COMPLETED</small>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Assignment({
  item,
  updating,
  onStatus
}) {
  const current = flow.indexOf(item.status);
  const next = flow[current + 1];

  return (
    <article className="vol-assignment">
      <div className="vol-assignment-top">
        <span
          className={`priority ${item.priority.toLowerCase()}`}
        >
          {item.priority}
        </span>

        <span>{item.requestType}</span>

        <small>
          {new Date(
            item.createdAt
          ).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          })}
        </small>
      </div>

      <h3>{item.title}</h3>

      <p>
        {item.description ||
          "No additional details provided."}
      </p>

      <div className="vol-assignment-meta">
        <span>
          <UsersIcon
            count={item.peopleCount || 1}
          />
        </span>

        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${item.location?.coordinates?.[1]},${item.location?.coordinates?.[0]}`}
          target="_blank"
          rel="noreferrer"
        >
          <Navigation size={14} />
          Navigate
        </a>
      </div>

      <div className="vol-progress">
        {flow.map((status, index) => (
          <span
            key={status}
            className={
              index < current
                ? "done"
                : index === current
                ? "active"
                : ""
            }
          >
            {labels[status]}
          </span>
        ))}
      </div>

      {next && (
        <div className="vol-buttons">
          <button
            onClick={() =>
              onStatus(item._id, next)
            }
            disabled={updating}
          >
            {updating
              ? "Updating..."
              : `Mark ${labels[next]}`}
          </button>
        </div>
      )}
    </article>
  );
}

function OpenRequest({
  item,
  claiming,
  onClaim
}) {
  return (
    <article className="vol-open">
      <div>
        <span
          className={`priority ${item.priority.toLowerCase()}`}
        >
          {item.priority}
        </span>

        <strong>{item.title}</strong>

        <p>
          {item.requestType} ·{" "}
          {item.peopleCount || 1} people ·{" "}
          {item.description || "No details"}
        </p>
      </div>

      <button
        onClick={() => onClaim(item._id)}
        disabled={claiming}
      >
        {claiming
          ? "Accepting..."
          : "Accept assignment"}
      </button>
    </article>
  );
}

function UsersIcon({ count }) {
  return (
    <span className="people-count">
      <UserRound size={13} /> {count} affected
    </span>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="vol-stat">
      <span>{icon}</span>

      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function Empty({ icon, title, text }) {
  return (
    <div className="vol-empty">
      <span>{icon}</span>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

export default VolunteerDashboard;