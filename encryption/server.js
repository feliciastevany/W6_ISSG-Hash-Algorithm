const http = require("http");
const socketIo = require("socket.io");

const server = http.createServer();
const io = socketIo(server);

const users = new Map();

io.on("connection", (socket) => {
  console.log(`Client ${socket.id} connected`);

  socket.emit("init", Array.from(users.entries())); // mengirim data user lama ke user yang baru join menggunakan array

  socket.on("registerPublicKey", (data) => {
    const { username, publicKey } = data;
    users.set(username, { publicKey, socketId: socket.id });
    console.log(`${username} registered with public key.`);

    io.emit("newUser  ", { username, publicKey }); // mengirim user baru yang join dengan public key nya
  });

  socket.on("message", (data) => {
    const { username, targetUsername, message } = data;

    const Usertarget  = users.get(targetUsername);
    if (Usertarget ) {
      io.to(Usertarget .socketId).emit("message", { username, message, targetUsername });
    }

    for (const [user, { socketId }] of users.entries()) {
      if (user !== targetUsername && user !== username) {
        io.to(socketId).emit("message", { username, message });
      }
    }
  });

  socket.on("disconnect", () => {
    for (const [username, { socketId }] of users.entries()) {
      if (socketId === socket.id) {
        users.delete(username);
        console.log(`${username} disconnected`);
        break;
      }
    }
  });
});

const port = 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});