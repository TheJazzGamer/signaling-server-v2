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

const wss = new WebSocket.Server({ server });

let rooms = {}; // {roomCode: [socket1, socket2] }

wss.on("connection", (socket) => {
    console.log("✅ WebSocket connection received");

    let room = null;

    socket.on("message", (msg) => {
        console.log("📨 Message from client:", msg);
        
        const data = JSON.parse(msg);

        //leave logic
        if (data.leave) {
            const code = data.leave;
            if(rooms[code]) {
                rooms[code].forEach(s => {
                    if(s !== socket) {
                        s.send(JSON.stringify({ left: true }));
                    }
                    s.close();
                });
                delete rooms[code];
                console.log(`Room ${code} closed by host.`);
            }
            return;
        }

        //join logic
        if (data.join) {
            room = data.join;

            if (!rooms[room] && data.host === true) {
                rooms[room] = [];
            }

            // If not host, only allow joining existing room
            if (!rooms[room]) {
                socket.send(JSON.stringify({ error: "room_not_found" }));
                return;
            }

            rooms[room].push(socket);

            if (rooms[room].length === 2) {
                rooms[room].forEach((s) => s.send(JSON.stringify({ ready: true})));
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
        console.log("❌ WebSocket connection closed");
        
        if (room && rooms[room]) {
            rooms[room] = rooms[room].filter((s) => s !== socket);
        }
    });
});

console.log("Signaling server running...");

const port = process.env.PORT;
server.listen(port, () => {
    console.log(`HTTP + WebSocket server running on port ${port}`);
    console.log("HTTP + WebSocket server running");
});
