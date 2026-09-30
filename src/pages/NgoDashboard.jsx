import { useEffect, useState } from "react";
import axios from "axios";
import { Building2, LogOut, MapPin, Package, Plus, Shield } from "lucide-react";
import "./NgoDashboard.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

function NgoDashboard() {
  const [form, setForm] = useState({
    name: "",
    category: "FOOD",
    quantity: 1,
    unit: "units",
    contact: "",
    longitude: "78.4867",
    latitude: "17.385"
  });
  const [supplies, setSupplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState([]);
  const [responding, setResponding] = useState(null);
  const [reserving, setReserving] = useState(null);
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const loadRequests = async () => {
    try {
      const res = await axios.get(`${API}/requests`);
      setRequests((res.data.requests || []).filter(request =>
        request.status === "PENDING" &&
        ["FOOD", "WATER", "MEDICAL", "CLOTHING", "SHELTER", "RESCUE"].includes(request.requestType)
      ));
    } catch (err) {
      console.error("Failed to load NGO requests:", err);
    }
  };

  const loadSupplies = async () => {
    try {
      const res = await axios.get(`${API}/supplies`);
      setSupplies((res.data || []).filter(item => item.provider?._id === user?._id));
    } catch (err) {
      console.error("Failed to load NGO supplies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSupplies();
    void loadRequests();
  }, []);

  const update = e => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const respondToRequest = async request => {
    try {
      setResponding(request._id);

      await axios.patch(`${API}/requests/${request._id}`, {
        status: "IN_PROGRESS"
      });

      await loadRequests();
    } catch (err) {
      alert(err.response?.data?.message || "Unable to respond to request");
    } finally {
      setResponding(null);
    }
  };

  const reserveForRequest = async (request, supply) => {
    const max = Math.min(
      Number(supply.quantity),
      Number(request.peopleCount || 1)
    );

    const raw = window.prompt(
      `How many ${supply.unit} of ${supply.name} should be committed? Max ${max}.`,
      String(max)
    );

    if (raw === null) return;

    const quantity = Number(raw);

    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > max) {
      alert(`Enter a quantity between 1 and ${max}`);
      return;
    }

    try {
      setReserving(supply._id);
      await axios.post(`${API}/supplies/${supply._id}/reserve`, {
        quantity
      });
      await loadSupplies();
    } catch (err) {
      alert(err.response?.data?.message || "Unable to reserve supply");
    } finally {
      setReserving(null);
    }
  };

  const addSupply = async e => {
    e.preventDefault();

    try {
      setSubmitting(true);

      await axios.post(`${API}/supplies`, {
        name: form.name,
        category: form.category,
        quantity: Number(form.quantity),
        unit: form.unit,
        contact: form.contact,
        provider: user._id,
        providerName: user.organizationName || user.name,
        location: {
          type: "Point",
          coordinates: [
            Number(form.longitude),
            Number(form.latitude)
          ]
        }
      });

      setForm({
        ...form,
        name: "",
        quantity: 1
      });
      await loadSupplies();
    } catch (err) {
      alert(err.response?.data?.message || "Unable to add supply");
    } finally {
      setSubmitting(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <div className="ngo-page">
      <header className="ngo-topbar">
        <div className="ngo-brand">
          <div className="brand-mark">
            <Shield size={21} />
          </div>
          <div>
            <h1>RESQ</h1>
            <span>NGO NETWORK</span>
          </div>
        </div>

        <div className="ngo-top-actions">
          <span className="ngo-live">
            <span></span>
            RESOURCE PROVIDER
          </span>
          <button className="ngo-logout" onClick={logout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      <main className="ngo-main">
        <section className="ngo-hero">
          <div>
            <span className="card-label">NGO OPERATIONS</span>
            <h2>{user?.organizationName || user?.name}</h2>
            <p>Register and maintain emergency resources available to the response network.</p>
          </div>
          <div className="ngo-badge">
            <Building2 size={18} />
            REGISTERED NGO
          </div>
        </section>

        <section className="ngo-grid">
          <div className="ngo-card">
            <div className="card-header">
              <div>
                <span className="card-label">RESOURCE INTAKE</span>
                <h3>Add Supply</h3>
              </div>
              <Plus size={18} />
            </div>

            <form className="ngo-form" onSubmit={addSupply}>
              <label>
                Resource
                <input name="name" value={form.name} onChange={update} placeholder="Drinking water" required />
              </label>

              <div className="ngo-row">
                <label>
                  Category
                  <select name="category" value={form.category} onChange={update}>
                    <option value="FOOD">Food</option>
                    <option value="WATER">Water</option>
                    <option value="MEDICAL">Medical</option>
                    <option value="CLOTHING">Clothing</option>
                    <option value="SHELTER">Shelter</option>
                    <option value="RESCUE">Rescue</option>
                    <option value="OTHER">Other</option>
                  </select>
                </label>

                <label>
                  Quantity
                  <input type="number" min="0" name="quantity" value={form.quantity} onChange={update} required />
                </label>
              </div>

              <div className="ngo-row">
                <label>
                  Unit
                  <input name="unit" value={form.unit} onChange={update} placeholder="kits" />
                </label>

                <label>
                  Contact
                  <input name="contact" value={form.contact} onChange={update} placeholder="Helpline" />
                </label>
              </div>

              <div className="ngo-row">
                <label>
                  Longitude
                  <input name="longitude" value={form.longitude} onChange={update} required />
                </label>

                <label>
                  Latitude
                  <input name="latitude" value={form.latitude} onChange={update} required />
                </label>
              </div>

              <button className="ngo-submit" disabled={submitting}>
                <Package size={16} />
                {submitting ? "Registering..." : "Register Resource"}
              </button>
            </form>
          </div>

          <div className="ngo-card">
            <div className="card-header">
              <div>
                <span className="card-label">MY RESOURCES</span>
                <h3>Registered Supplies</h3>
              </div>
              <span className="count">{supplies.length}</span>
            </div>

            {loading ? (
              <div className="ngo-empty">Loading resources...</div>
            ) : supplies.length === 0 ? (
              <div className="ngo-empty">
                <MapPin size={28} />
                <span>No resources registered yet.</span>
              </div>
            ) : (
              <div className="ngo-resource-list">
                {supplies.map(item => (
                  <div className="ngo-resource" key={item._id}>
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.category} · {item.quantity} {item.unit}</span>
                    </div>
                    <small>{item.contact || "No contact added"}</small>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="ngo-card ngo-requests-card">
          <div className="card-header">
            <div>
              <span className="card-label">COMMUNITY NEEDS</span>
              <h3>Open Requests</h3>
            </div>
            <span className="count">{requests.length}</span>
          </div>

          {requests.length === 0 ? (
            <div className="ngo-empty">
              <span>No open resource requests right now.</span>
            </div>
          ) : (
            <div className="ngo-request-list">
              {requests.map(request => {
                const matches = supplies.filter(
                  supply => supply.category === request.requestType && supply.quantity > 0
                );

                return (
                  <div className="ngo-request" key={request._id}>
                    <div>
                      <div className="ngo-request-top">
                        <strong>{request.title}</strong>
                        <span>{request.priority}</span>
                      </div>
                      <p>{request.description || "No additional details provided."}</p>
                      <small>
                        {request.requestType} · {request.peopleCount || 1} people
                      </small>
                    </div>

                    <div className="ngo-request-actions">
                      <button
                        className="ngo-respond"
                        onClick={() => respondToRequest(request)}
                        disabled={responding === request._id}
                      >
                        {responding === request._id ? "Responding..." : "Respond"}
                      </button>

                      {matches.length > 0 && (
                        <select
                          className="ngo-supply-select"
                          defaultValue=""
                          disabled={reserving !== null}
                          onChange={e => {
                            const supply = matches.find(
                              item => item._id === e.target.value
                            );
                            if (supply) {
                              void reserveForRequest(request, supply);
                              e.target.value = "";
                            }
                          }}
                        >
                          <option value="">Commit supply...</option>
                          {matches.map(supply => (
                            <option value={supply._id} key={supply._id}>
                              {supply.name} · {supply.quantity} {supply.unit}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default NgoDashboard;

