import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:5001";

function useResqSocket({
  volunteerId,
  onAssignment,
  onEmergencyUpdate,
  onNotification,
  onConnectionChange,
  onSocketReady
}) {
  const callbacks = useRef({
    onAssignment,
    onEmergencyUpdate,
    onNotification,
    onConnectionChange,
    onSocketReady
  });

  useEffect(() => {
    callbacks.current = {
      onAssignment,
      onEmergencyUpdate,
      onNotification,
      onConnectionChange,
      onSocketReady
    };
  }, [
    onAssignment,
    onEmergencyUpdate,
    onNotification,
    onConnectionChange,
    onSocketReady
  ]);

  useEffect(() => {
    if (!volunteerId) return;

    const socket = io(SOCKET_URL);

    socket.on("connect", () => {
      socket.emit("join-volunteer", volunteerId);
      callbacks.current.onSocketReady?.(socket);
      callbacks.current.onConnectionChange?.(true);
    });

    socket.on("disconnect", () => {
      callbacks.current.onConnectionChange?.(false);
    });

    socket.on("volunteer-assigned", data => {
      callbacks.current.onAssignment?.(data);
      callbacks.current.onNotification?.({
        title: "New emergency assigned",
        message: data?.request?.title
          ? `Respond to: ${data.request.title}`
          : "A new emergency response has been assigned to you.",
        tone: "assigned"
      });
    });

    socket.on("emergency-updated", data => {
      callbacks.current.onEmergencyUpdate?.(data);
    });

    return () => {
      socket.disconnect();
      callbacks.current.onConnectionChange?.(false);
    };
  }, [volunteerId]);
}

export default useResqSocket;
