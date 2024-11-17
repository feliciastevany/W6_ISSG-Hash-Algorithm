const io = require("socket.io-client");
const readline = require("readline");
const crypto = require("crypto");

const socket = io("http://localhost:3000");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
});

let targetUsername = "";
let username = "";
const users = new Map();

// Generate RSA key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

// Export keys in the correct format
const exportedPublicKey = publicKey.export({ type: "spki", format: "pem" });

function encryptMessage(message, targetPublicKeyPem) {
  const targetPublicKey = crypto.createPublicKey(targetPublicKeyPem);
  const encrypted = crypto.publicEncrypt(targetPublicKey, Buffer.from(message));
  return encrypted.toString("base64");
}

function decryptMessage(encryptedMessage) {
  const decrypted = crypto.privateDecrypt(privateKey, Buffer.from(encryptedMessage, "base64"));
  return decrypted.toString("utf8");
}

socket.on("connect", () => {

  console.log("Connected to the server");

  rl.question("Enter your username: ", (input) => {
    username = input;
    console.log(`Welcome, ${username} to the chat`);
    socket.emit("registerPublicKey", {
      username,
      publicKey: exportedPublicKey,
    });
    rl.prompt();

    rl.on("line", (message) => {
      if (message.trim()) {
        if ((match = message.match(/^!secret (\w+)$/))) { // command khusus untuk melakukan secret chat
          targetUsername = match[1];
          console.log(`Now secretly chatting with ${targetUsername}`);

        } else if (message.match(/^!exit$/)) {
          console.log(`No more secretly chatting with ${targetUsername}`);
          targetUsername = "";

        } else {
          if (targetUsername) {
            const targetPublicKey = users.get(targetUsername);

            if (targetPublicKey) {
              const encryptedMessage = encryptMessage(message, targetPublicKey);
              socket.emit("message", { username, targetUsername, message: encryptedMessage }); 

            } else {
              console.log(`User ${targetUsername} not found.`);

            }
          } else {
            socket.emit("message", { username, message });

          }
        }
      }
      rl.prompt();
    });
  });
});

socket.on("init", (keys) => { // menerima data user lama untuk user yang baru join
  keys.forEach(([user, key]) => users.set(user, key));
  console.log(`\nThere are currently ${users.size} users in the chat`);
  rl.prompt();
});

socket.on("newUser  ", (data) => { // untuk menginfokan user yang join ke chat
  const { username, publicKey } = data;
  users.set(username, publicKey);
  console.log(`${username} joined the chat`);
  rl.prompt();
});

socket.on("message", (data) => {
  const { username: senderUsername, message: senderMessage, targetUsername } = data;

  if (senderUsername !== username) {
    if (targetUsername === username) {
      const decryptedMessage = decryptMessage(senderMessage);
      console.log(`${senderUsername}: ${decryptedMessage}`);
    } else {
      console.log(`${senderUsername}: ${senderMessage}`);
    }
    rl.prompt();
  }
});

socket.on("disconnect", () => {
  console.log("Server disconnected, Exiting...");
  rl.close();
  process.exit(0);
});

rl.on("SIGINT", () => {
  console.log("\nExiting...");
  socket.disconnect();
  rl.close();
  process.exit(0);
});