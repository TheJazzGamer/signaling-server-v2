const WebSocket = require("ws");
const server = new WebSocket.Server({ port: process.env.PORT || 10000 });

let rooms = {}; // {roomCode: [socket1, socket2] }

server.on("connection", (socket) => {
    let room = null;

    socket.on("message", (msg) => {
        const data = JSON.parse(msg);

        if (data.join) {
            room = data.join;
            rooms[room] = rooms[room] || [];
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

    socket.on("colse", () => {
        if (room && rooms[room]) {
            rooms[room] = rooms[room].filter((s) => !== socket);
        }
    });
});

console.log("Signaling server running...");