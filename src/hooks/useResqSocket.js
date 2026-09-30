import { useEffect } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5001";

function useResqSocket({
  volunteerId,
  onAssignment,
  onEmergencyUpdate,
  onNotification,
  onConnectionChange,
  onSocketReady
}) {
  useEffect(() => {
    if (!volunteerId) return;

    const socket = io(SOCKET_URL);

    socket.on("connect", () => {
      socket.emit("join-volunteer", volunteerId);
      if (onSocketReady) onSocketReady(socket);

      if (onConnectionChange) {
        onConnectionChange(true);
      }
    });

    socket.on("disconnect", () => {
      if (onConnectionChange) {
        onConnectionChange(false);
      }
    });

    socket.on("volunteer-assigned", data => {
      if (onAssignment) onAssignment(data);

      if (onNotification) {
        onNotification({
          title: "New emergency assigned",
          message: data?.request?.title
            ? `Respond to: ${data.request.title}`
            : "A new emergency response has been assigned to you.",
          tone: "assigned"
        });
      }
    });

    socket.on("emergency-updated", data => {
      if (onEmergencyUpdate) onEmergencyUpdate(data);
    });

    return () => {
      socket.disconnect();
    };
  }, [
    volunteerId,
    onAssignment,
    onEmergencyUpdate,
    onNotification,
    onConnectionChange,
    onSocketReady
  ]);
}

export default useResqSocket;


