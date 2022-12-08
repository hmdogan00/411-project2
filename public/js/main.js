const chatForm = document.getElementById("chat-form");
const messages = document.querySelector(".chat-messages");
const sidebar = document.querySelector(".chat-sidebar");
const socket = io();

socket.on("all_messages", ({ messages, user }) => {
  messages.forEach(async (msg) => {
    try {
      if (user === "BOT") throw new Error("BOT");
      const msgObj = JSON.parse(msg.text);
      if (msgObj === null) return;
      const exportedKey = await window.crypto.subtle.importKey(
        "jwk",
        msgObj.key,
        "AES-GCM",
        true,
        ["decrypt"]
      );
      const result = await decrypt(
        unpack(msgObj.encrypted),
        exportedKey,
        unpack(msgObj.iv)
      );
      outputMessage(
        {
          user: msg.username,
          time: msg.time,
          text: result,
        },
        (isSelf = user === msg.username)
      );
    } catch (e) {
      outputMessage(
        {
          user: msg.username,
          time: msg.time,
          text: msg.text,
        },
        (isSelf = user === msg.username)
      );
    }
  });
});

socket.on("online", ({ room, users }) => {
  const path = window.location.pathname.substring(1);
  if (path === "direct") {
    if (sidebar.childElementCount === 0) outputDirectMessage(room);
  } else {
    if (sidebar.childElementCount === 0) {
      outputRoomName(room);
      outputUsers(users);
    }
  }
});

socket.on("message", async ({ messageObj: message, user }) => {
  if (user === "BOT") {
    outputMessage(message);
    return;
  }
  console.log(user);
  const key = await window.crypto.subtle.importKey(
    "jwk",
    message.text.key,
    "AES-GCM",
    true,
    ["decrypt"]
  );
  const result = await decrypt(
    unpack(message.text.encrypted),
    key,
    unpack(message.text.iv)
  );
  message.text = result;

  fetch("/me").then((res) =>
    res.text().then((res) => {
      outputMessage(message, user === res);
    })
  );

  //scroll down
  messages.scrollTop = messages.scrollHeight;
});

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const msg = e.target.elements.msg.value;
  generateKey().then((res) => {
    const key = res;
    window.crypto.subtle.exportKey("jwk", key).then((exportedKey) => {
      encrypt(msg, key).then((res) => {
        const encrypted = {
          iv: pack(res.iv),
          encrypted: pack(res.encrypted),
          key: exportedKey,
        };
        socket.emit("chat_message", encrypted);
        e.target.elements.msg.value = "";
        e.target.elements.msg.focus();
      });
    });
  });
});

function outputMessage(message, isSelf = false) {
  const container = document.createElement("div");
  container.classList.add("message-container");
  const div = document.createElement("div");
  if (isSelf) {
    div.classList.add("self");
    div.innerHTML = `<p class="meta"> You <span style="float: left">${message.time}</span></p><p class="text">${message.text}</p>`;
  } else {
    div.classList.add("message");
    div.innerHTML = `<p class="meta"> ${message.user} <span style="float: right">${message.time}</span></p><p class="text">${message.text}</p>`;
  }
  container.appendChild(div);
  document.querySelector(".chat-messages").appendChild(container);
}

function outputRoomName(room) {
  const [group, channel] = room.split("-");
  const newDiv = document.createElement("div");
  const roomLabel = document.createElement("h3");
  const roomIcon = document.createElement("i");
  roomIcon.classList.add("fas", "fa-comments");
  roomLabel.appendChild(roomIcon);
  roomLabel.appendChild(document.createTextNode(" Group"));
  newDiv.appendChild(roomLabel);

  const roomName = document.createElement("h2");
  roomName.appendChild(document.createTextNode(group));
  newDiv.appendChild(roomName);
  sidebar.appendChild(newDiv);

  const newDiv2 = document.createElement("div");

  const channelLabel = document.createElement("h3");
  const channelIcon = document.createElement("i");
  channelIcon.classList.add("fas", "fa-hashtag");
  channelLabel.appendChild(channelIcon);
  channelLabel.appendChild(document.createTextNode(" Channel"));
  newDiv2.appendChild(channelLabel);

  const channelName = document.createElement("h2");
  channelName.appendChild(document.createTextNode(channel));
  newDiv2.appendChild(channelName);
  sidebar.appendChild(newDiv2);
}

function outputDirectMessage(room) {
  const [user1, user2] = room.split("-");
  const newDiv = document.createElement("div");
  const roomLabel = document.createElement("h3");
  const roomIcon = document.createElement("i");
  roomIcon.classList.add("fas", "fa-user");
  roomLabel.appendChild(roomIcon);
  roomLabel.appendChild(document.createTextNode(" Message to"));
  newDiv.appendChild(roomLabel);

  const roomName = document.createElement("h2");
  fetch("/me").then((res) =>
    res.text().then((res) => {
      if (res === user1) {
        roomName.appendChild(document.createTextNode(user2));
        newDiv.appendChild(roomName);
        sidebar.appendChild(newDiv);
      } else {
        roomName.appendChild(document.createTextNode(user1));
        newDiv.appendChild(roomName);
        sidebar.appendChild(newDiv);
      }
    })
  );
}

function outputUsers(users) {
  const onlineDiv = document.createElement("div");
  const onlineLabel = document.createElement("h3");
  const onlineIcon = document.createElement("i");
  onlineIcon.classList.add("fas", "fa-users");
  onlineLabel.appendChild(onlineIcon);
  onlineLabel.appendChild(document.createTextNode(" Online"));
  onlineDiv.appendChild(onlineLabel);

  const userList = document.createElement("ul");
  userList.innerHTML = `${users
    .map((user) => `<li>${user.username}</li>`)
    .join("")}`;

  onlineDiv.appendChild(userList);
  sidebar.appendChild(onlineDiv);
}

function generateKey() {
  return window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

function encode(str) {
  return new TextEncoder().encode(str);
}

function decode(bytes) {
  return new TextDecoder().decode(bytes);
}

function generateIV() {
  return window.crypto.getRandomValues(new Uint8Array(12));
}

async function encrypt(data, key) {
  const iv = generateIV();
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encode(data)
  );
  return { iv: iv, encrypted: encrypted };
}

function pack(buffer) {
  return window.btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)));
}

function unpack(packed) {
  const string = window.atob(packed);
  const buffer = new ArrayBuffer(string.length);
  const bufferView = new Uint8Array(buffer);

  for (let i = 0; i < string.length; i++) {
    bufferView[i] = string.charCodeAt(i);
  }
  return buffer;
}

async function decrypt(data, key, iv) {
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    data
  );
  return decode(decrypted);
}
