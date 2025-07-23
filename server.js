const http = require("http");
const WebSocket = require("ws");

const server = http.createServer((req, res) => {
  if (req.url === "/ping") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("pong");
  } else {
    res.writeHead(404);
    res.end();
  }
});

const wss = new WebSocket.Server({ noServer: true });
let rooms = {}; // roomCode: [socket1, socket2]

wss.on("connection", (socket) => {
  console.log("✅ WebSocket connected");
  let room = null;

  socket.on("message", (msg) => {
    console.log("📨 Message from client:", msg);
    const data = JSON.parse(msg);

    if (data.leave) {
      const code = data.leave;
      if (rooms[code]) {
        rooms[code].forEach((s) => {
          if (s !== socket) s.send(JSON.stringify({ left: true }));
          s.close();
        });
        delete rooms[code];
        console.log(`Room ${code} closed by host.`);
      }
      return;
    }

    if (data.join) {
      room = data.join;

      if (!rooms[room] && data.host === true) {
        rooms[room] = [];
      }

      if (!rooms[room]) {
        socket.send(JSON.stringify({ error: "room_not_found" }));
        return;
      }

      rooms[room].push(socket);
      if (rooms[room].length === 2) {
        rooms[room].forEach((s) =>
          s.send(JSON.stringify({ ready: true }))
        );
      }
    } else if (data.signal && room && rooms[room]) {
      rooms[room].forEach((s) => {
        if (s !== socket) {
          s.send(JSON.stringify({ signal: data.signal }));
        }
      });
    }
  });

  socket.on("close", () => {
    console.log("❌ WebSocket closed");
    if (room && rooms[room]) {
      rooms[room] = rooms[room].filter((s) => s !== socket);
      if (rooms[room].length === 0) {
        delete rooms[room];
      }
    }
  });
});

// Handle WebSocket upgrade manually for Render routing
server.on("upgrade", (req, socket, head) => {
  if (req.url === "/ws") {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  } else {
    socket.destroy();
  }
});

if (!process.env.PORT) {
  throw new Error("❌ process.env.PORT is not set");
}

const port = process.env.PORT;
server.listen(port, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${port}`);
});
