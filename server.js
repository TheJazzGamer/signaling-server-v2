const http = require("http");
const WebSocket = require("ws");

// Create basic HTTP server for wake-up ping
const server = http.createServer((req, res) => {
    if (req.url === "/ping") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("pong");
    } else {
        res.writeHead(404);
        res.end();
    }
});

// Attach WebSocket server to HTTP server
const wss = new WebSocket.Server({ server });

let rooms = {}; // {roomCode: [socket1, socket2]}

wss.on("connection", (socket) => {
    console.log("✅ WebSocket connection received");
    let room = null;

    socket.on("message", (msg) => {
        console.log("📨 Message from client:", msg);
        const data = JSON.parse(msg);

        // Leave logic
        if (data.leave) {
            const code = data.leave;
            if (rooms[code]) {
                rooms[code].forEach(s => {
                    if (s !== socket) {
                        s.send(JSON.stringify({ left: true }));
                    }
                    s.close();
                });
                delete rooms[code];
                console.log(`❌ Room ${code} closed by host.`);
            }
            return;
        }

        // Join logic
        if (data.join) {
            room = data.join;

            // Create room if host
            if (!rooms[room] && data.host === true) {
                rooms[room] = [];
            }

            // Block if room doesn't exist and not host
            if (!rooms[room]) {
                socket.send(JSON.stringify({ error: "room_not_found" }));
                return;
            }

            rooms[room].push(socket);

            if (rooms[room].length === 2) {
                rooms[room].forEach((s) => s.send(JSON.stringify({ ready: true })));
            }
        } 
        // Signal relay
        else if (data.signal && room && rooms[room]) {
            rooms[room].forEach((s) => {
                if (s !== socket) {
                    s.send(JSON.stringify({ signal: data.signal }));
                }
            });
        }
    });

    socket.on("close", () => {
        console.log("❌ WebSocket connection closed");
        if (room && rooms[room]) {
            rooms[room] = rooms[room].filter((s) => s !== socket);
            if (rooms[room].length === 0) {
                delete rooms[room];
            }
        }
    });
});

console.log("📡 Signaling server starting...");

// Use port from Render or default to 3000 locally
const port = process.env.PORT || 3000;
server.listen(port, '0.0.0.0', () => {
    console.log(`✅ HTTP + WebSocket server running on port ${port}`);
});
