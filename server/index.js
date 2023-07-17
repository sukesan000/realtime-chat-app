const express = require("express");
const app = express();

const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");

let nextChatId = 1;

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
  },
});

const PORT = 5000;

//クライアントと通信
io.on("connection", (socket) => {
  console.log("a user connected");

  //クライアントからの受信
  socket.on("chatMessage", (data) => {
    console.log("message: " + data.messages);

    // IDを付けてデータを送信
    const chatData = {
      id: nextChatId++,
      messages: data.messages,
    };

    //クライアントへ送信
    io.emit("received_messages", chatData);
  });
});

//クライアントと接続が切れた時
io.on("disconnect", () => {
  console.log("user disconnected");
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
