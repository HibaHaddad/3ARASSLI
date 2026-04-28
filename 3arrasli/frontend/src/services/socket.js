import { io } from "socket.io-client";
import { API_BASE_URL } from "./api";

export const connectChatSocket = (token) =>
  io(API_BASE_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
  });

export const joinConversationRoom = (socket, otherUserId) => {
  if (!socket || !socket.connected || !otherUserId) {
    return;
  }

  socket.emit("join_conversation", { other_user_id: Number(otherUserId) });
};

export const emitTypingStatus = (socket, otherUserId, isTyping) => {
  if (!socket || !socket.connected || !otherUserId) {
    return;
  }

  socket.emit("typing_status", {
    other_user_id: Number(otherUserId),
    is_typing: Boolean(isTyping),
  });
};

export const emitRealtimeMessage = (socket, receiverId, content) =>
  new Promise((resolve) => {
    if (!socket || !socket.connected) {
      resolve({ success: false, message: "Socket indisponible." });
      return;
    }

    socket.timeout(5000).emit(
      "send_message",
      {
        receiver_id: Number(receiverId),
        content,
      },
      (error, response) => {
        if (error) {
          resolve({ success: false, message: "Le serveur temps reel ne repond pas." });
          return;
        }
        resolve(response || { success: false, message: "Aucune reponse du serveur socket." });
      }
    );
  });
