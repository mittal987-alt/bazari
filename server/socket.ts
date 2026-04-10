import { Server } from "socket.io";
import { createServer } from "http";

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("⚡ New Connection:", socket.id);

  // User logs in and registers their personal notification room
  socket.on("register_user", (userId: string) => {
    socket.join(userId);
    console.log(`User ${userId} joined their personal room`);
  });

  // join chat room
  socket.on("join_chat", (chatId: string) => {
    socket.join(chatId);
    console.log("User joined room:", chatId);
  });

  // send message
  socket.on("send_message", (data) => {
    // 1. Send to the active chat room
    socket.to(data.chatId).emit("receive_message", data);
    console.log("Message relayed in room", data.chatId);

    // 2. Send notification to the recipient's personal room
    if (data.recipientId) {
      socket.to(data.recipientId).emit("new_notification", data);
      console.log(`Notification sent to user ${data.recipientId}`);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

httpServer.listen(3002, () => {
  console.log("🚀 Socket server running on http://localhost:3002");
});