import { useState } from "react";
import axios from "axios";
import { CheckCircle, Navigation } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

function RequestStatusButton({ request, onUpdated }) {
  const [loading, setLoading] = useState(false);

  const updateStatus = async status => {
    try {
      setLoading(true);

      await axios.patch(`${API}/requests/${request._id}`, {
        status
      });

      onUpdated();
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Unable to update request"
      );
    } finally {
      setLoading(false);
    }
  };

  if (request.status === "ASSIGNED") {
    return (
      <button
        className="assign-button"
        onClick={() => updateStatus("IN_PROGRESS")}
        disabled={loading}
      >
        <Navigation size={14} />
        {loading ? "Starting..." : "Start Response"}
      </button>
    );
  }

  if (request.status === "IN_PROGRESS") {
    return (
      <button
        className="assign-button resolve-button"
        onClick={() => updateStatus("RESOLVED")}
        disabled={loading}
      >
        <CheckCircle size={14} />
        {loading ? "Resolving..." : "Mark Resolved"}
      </button>
    );
  }

  return null;
}

export default RequestStatusButton;


