import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3002";

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket"],
  reconnectionAttempts: 5,
});

/* ================================
   JOIN CHAT ROOM
================================ */

export const joinRoom = (chatId: string) => {
  if (!socket.connected) {
    socket.connect();
  }

  socket.emit("join_chat", chatId);
};

/* ================================
   SEND MESSAGE
================================ */

export const sendMessageSocket = (data: {
  chatId: string;
  text: string;
  sender: string;
  _id?: string;
}) => {
  if (socket.connected) {
    socket.emit("send_message", data);
  }
};