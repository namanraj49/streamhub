require("dotenv").config();

const express = require("express");
const app = express();
const socket = require("socket.io");

var mongoose = require("mongoose");

const session = require("express-session");
const { SESSION_SECRET } = process.env;

const MongoDBStore = require("connect-mongodb-session")(session);

const MONGODB_URI = "mongodb://127.0.0.1:27017/mere";

const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: "sessions",
});

const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.set("views", "./views");
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);

app.use(express.static("public"));

const userRoute = require("./routes/userRoute");
app.use("/", userRoute);

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("server is running http://localhost:3000/");
    return app.listen(3000);
  })
  .then((server) => {
    var io = socket(server);
    io.on("connection", function (socket) {
      console.log("User Connected " + socket.id);

      socket.on("username", function (username) {
        socket.username = username;
        io.emit(
          "is_online",
          "🔵 <i>" + socket.username + " join the chat..</i>"
        );
      });

      socket.on("disconnect", function (username) {
        io.emit(
          "is_online",
          "🔴 <i>" + socket.username + " left the chat..</i>"
        );
      });

      socket.on("chat_message", function (message) {
        io.emit(
          "chat_message",
          "<strong>" + socket.username + "</strong>: " + message
        );
      });

      socket.on("join", function (roomName) {
        var rooms = io.sockets.adapter.rooms;
        console.log(rooms);
        var room = rooms.get(roomName);
        console.log(room);
        if (room == undefined) {
          socket.join(roomName);
          console.log("room created");

          // rooms = io.sockets.adapter.rooms;
          // console.log(rooms);
          socket.emit("created");
        } else if (room.size == 1) {
          socket.join(roomName);

          console.log("room Joined");
          // rooms = io.sockets.adapter.rooms;
          // console.log(rooms);
          socket.emit("joined");
        } else {
          console.log("room is full");
          // rooms = io.sockets.adapter.rooms;
          // console.log(rooms);
          socket.emit("full");
        }
      });
      socket.on("ready", function (roomName) {
        console.log("Ready");
        socket.broadcast.to(roomName).emit("ready");
      });
      socket.on("candidate", function (candidate, roomName) {
        console.log("Candidate");
        // console.log(candidate);
        socket.broadcast.to(roomName).emit("candidate", candidate);
      });
      socket.on("offer", function (offer, roomName) {
        console.log("offer");
        console.log(offer);
        socket.broadcast.to(roomName).emit("offer", offer);
      });
      socket.on("answer", function (answer, roomName) {
        console.log("answer");
        socket.broadcast.to(roomName).emit("answer", answer);
      });

      socket.on("leave", function (roomName) {
        socket.leave(roomName);
        socket.broadcast.to(roomName).emit("leave");
      });
    });
  })
  .catch((err) => {
    console.log(err);
  });
