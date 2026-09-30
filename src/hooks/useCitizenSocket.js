import { useEffect } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5001";

function useCitizenSocket({
  citizenId,
  reporterToken,
  onUpdate,
  onNotification,
  onConnectionChange,
  onResponderLocation
}) {
  useEffect(() => {
    const identity = citizenId || reporterToken;
    if (!identity) return;

    const socket = io(SOCKET_URL, { transports: ["polling"] });

    socket.on("connect", () => {
      if (citizenId) socket.emit("join-citizen", citizenId);
      else socket.emit("join-reporter", reporterToken);
      onConnectionChange?.(true);
    });

    socket.on("disconnect", () => {
      onConnectionChange?.(false);
    });

    const notify = (title, message, tone = "info") => {
      onNotification?.({ title, message, tone });
    };

    socket.on("responder-location", data => {
      onResponderLocation?.(data);
    });

    socket.on("emergency-updated", request => {
      onUpdate?.(request);

      if (request?.status === "ASSIGNED") {
        notify(
          "Responder assigned",
          request.assignedVolunteer?.name
            ? `${request.assignedVolunteer.name} is responding to your emergency.`
            : "A responder has been assigned.",
          "assigned"
        );
      } else if (request?.status === "IN_PROGRESS") {
        notify("Response started", "Your assigned responder has started the response.", "progress");
      } else if (request?.status === "RESOLVED") {
        notify("Emergency resolved", "The response has been marked as completed.", "resolved");
      }
    });

    return () => socket.disconnect();
  }, [citizenId, reporterToken, onUpdate, onNotification, onConnectionChange, onResponderLocation]);
}

export default useCitizenSocket;
