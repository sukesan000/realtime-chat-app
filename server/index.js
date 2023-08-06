const express = require("express");
const app = express();

// ローカル環境
//const frontendUrl = "http://localhost:3000";
//const mongodbUri = "mongodb://localhost:27017/real_chat";
//商用環境
const frontendUrl = "http://160.248.8.135:3000";
const mongodbUri = "mongodb://160.248.8.135:27017/real_chat";

console.log("frontendUrl: " + frontendUrl);
console.log("mongodbUri: " + mongodbUri);

const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");

const mongoose = require("mongoose");
const { Schema } = mongoose;

const chatSchema = new Schema({
  messages: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Chat = mongoose.model("message", chatSchema);

const maxChatHistory = 10; // チャットを保持する最大件数

const io = new Server(server, {
  cors: {
    origin: frontendUrl,
  },
});

const PORT = 5000;

// MongoDBへの接続
mongoose.connect(mongodbUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

// データベースから過去のチャット履歴を取得する関数
async function getChatHistory() {
  try {
    // データベースから過去のチャット履歴を降順で取得
    const chatHistory = await Chat.find()
      .sort({ _id: -1 })
      .limit(maxChatHistory);

    if (chatHistory.length > maxChatHistory) {
      const oldestChat = chatHistory[chatHistory.length - 1];
      await Chat.deleteMany({ _id: { $lt: oldestChat._id } });
    }
    return chatHistory;
  } catch (err) {
    console.error("Error fetching chat history:", err);
    throw err;
  }
}

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", frontendUrl);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

// APIエンドポイントを追加
app.get("/api/chatHistory", async (req, res) => {
  try {
    const chatHistory = await getChatHistory();
    res.json(chatHistory);
  } catch (err) {
    console.error("Error fetching chat history:", err);
    res.status(500).json({ error: "Error fetching chat history" });
  }
});

//クライアントと通信
io.on("connection", (socket) => {
  console.log("a user connected");

  //クライアントからの受信
  socket.on("chatMessage", async (data) => {
    console.log("message: " + data.messages);

    // IDを付けてデータを送信
    const chatData = new Chat({
      messages: data.messages,
    });

    // データベースに保存
    try {
      await chatData.save();
      console.log("Chat data saved");
    } catch (err) {
      console.error("Error saving chat data:", err);
      return;
    }

    // チャット履歴を取得し、クライアントへ送信
    const chatHistory = await getChatHistory();
    console.log("chatHistory: " + chatHistory);
    io.emit("received_messages", chatHistory);
  });
});

//クライアントと接続が切れた時
io.on("disconnect", () => {
  console.log("user disconnected");
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
