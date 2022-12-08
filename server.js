const path = require("path");
const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const session = require("express-session");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const data = require("./data");
const messageToObject = require("./utils/messages");
const {
  joinUser,
  getCurrentUser,
  leaveUser,
  getOnline,
} = require("./utils/users");
const Pool = require("pg").Pool;
const pool = new Pool({
  user: "me",
  host: "localhost",
  database: "messages",
  password: "password",
  port: 5432,
});
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const sessionMiddleware = session({
  secret: "secret",
  resave: true,
  saveUninitialized: true,
});
app.use(sessionMiddleware);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

io.use(function (socket, next) {
  sessionMiddleware(socket.request, socket.request.res || {}, next);
});

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname + "/public/index.html"));
});

app.post("/login", async (req, res) => {
  var username = req.body.username;
  var password = req.body.password;
  var success = false;
  if (username && password) {
    for (var user of data.getUsers()) {
      if (user.username == username && user.password == password) {
        req.session.loggedin = true;
        req.session.username = username;
        req.session.room = req.body.group + "-" + req.body.channel;
        success = true;
        req.session.save(function (err) {
          res.redirect("/selectChannel");
        });
      }
    }
    if (!success) {
      res.send("Incorrect username or password!");
    }
  } else {
    res.send("Please enter Username and Password!");
  }
});

app.get("/selectChannel", (req, res) => {
  if (req.session.loggedin) {
    res.sendFile(path.join(__dirname + "/public/selectChannel.html"));
  } else {
    res.send("Please login to view this page!");
  }
});

app.post("/chat", (req, res) => {
  if (req.session.loggedin) {
    req.session.room = req.body.group + "-" + req.body.channel;
    res.sendFile(path.join(__dirname + "/public/chat.html"));
  } else {
    res.send("Please login to view this page!");
  }
});

app.post("/direct", (req, res) => {
  if (req.session.loggedin) {
    if (req.body.direct.localeCompare(req.session.username) < 0) {
      req.session.room = req.session.username + "-" + req.body.direct;
    } else {
      req.session.room = req.body.direct + "-" + req.session.username;
    }
    res.sendFile(path.join(__dirname + "/public/chat.html"));
  } else {
    res.send("Please login to view this page!");
  }
});

app.get("/otherusers", (req, res) => {
  if (req.session.loggedin) {
    const allUsers = data.getUsers();
    res.send(allUsers.filter((user) => user.username != req.session.username));
  } else {
    res.send("Please login to view this page!");
  }
});

app.get("/me", (req, res) => {
  if (req.session.loggedin) {
    res.send(req.session.username);
  } else {
    res.send("Please login to view this page!");
  }
});

//client connects
io.on("connection", (socket) => {
  //session info
  const username = socket.request.session.username;
  const room = socket.request.session.room;
  const [group, channel] = room.split("-");

  //join user to the chat
  const user = joinUser(socket.id, username, room);
  socket.join(user.room);

  //inform online users that a user is now online
  socket.broadcast.to(user.room).emit("message", {
    messageObj: messageToObject("BOT", `${user.username} is online.`),
    user: "BOT",
  });

  //when a message is sent
  socket.on("chat_message", (msg) => {
    //convert message to {user,text,time)}
    const messageObj = messageToObject(user.username, msg);
    console.log([group, channel, messageObj.user, messageObj.text]);
    //insert message to db
    pool.query(
      "INSERT INTO messages " +
        "(group_name, channel, username, time, text) VALUES ($1, $2, $3, $4, $5)",
      [group, channel, messageObj.user, messageObj.time, messageObj.text],
      (error, results) => {
        if (error) {
          throw error;
        }
      }
    );
    //emit the message to others
    io.to(user.room).emit("message", {
      messageObj,
      user: socket.request.session.username,
    });
  });

  //emit online people info to front-end (main.js)
  io.to(user.room).emit("online", {
    room: user.room,
    users: getOnline(user.room),
  });

  //query for all messages and emit channel messages to front-end (main.js)
  pool.query(
    "SELECT * FROM messages WHERE group_name = $1 AND channel = $2",
    [group, channel],
    (error, results) => {
      if (error) {
        throw error;
      }
      socket.emit("all_messages", {
        messages: results.rows,
        user: socket.request.session.username,
      });
    }
  );

  socket.on("disconnect", () => {
    const user = leaveUser(socket.id);
    if (user) {
      io.to(user.room).emit("message", {
        messageObj: messageToObject("BOT", `${user.username} is offline.`),
        user: "BOT",
      });
      io.to(user.room).emit("online", {
        room: user.room,
        users: getOnline(user.room),
      });
    }
  });
  console.log("session", socket.request.session);
});

const PORT = process.env.PORT;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
