const io = require("socket.io-client");
const readline = require("readline");
const crypto = require("crypto");

const socket = io("http://localhost:3000");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
});

let registeredUsername = "";
let username = "";
const users = new Map();

// Generate RSA key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

// Export keys in the correct format
const exportedPublicKey = publicKey.export({ type: "spki", format: "pem" });
const exportedPrivateKey = privateKey.export({ type: "pkcs8", format: "pem" });

socket.on("connect", () => {
  console.log("Connected to the server");

  rl.question("Enter your username: ", (input) => {
    username = input;
    registeredUsername = input;
    console.log(`Welcome, ${username} to the chat`);

    socket.emit("registerPublicKey", {
      username,
      publicKey: exportedPublicKey,
    });
    rl.prompt();

    rl.on("line", (message) => {
      if (message.trim()) {
        if ((match = message.match(/^!impersonate (\w+)$/))) { // command khusus untuk menyamar jadi user lain
          username = match[1]; // username dari impersonate menggunakan array
          console.log(`Now impersonating as ${username}`);

        } else if (message.match(/^!exit$/)) { // command untuk berhenti menyamar
          username = registeredUsername;
          console.log(`Now you are ${username}`);

        } else {
          // Sign the message
          const signature = crypto.sign("sha256", Buffer.from(message), privateKey);

          socket.emit("message", { 
            username, 
            message,
            signature: signature.toString("base64"),
          });
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

socket.on("newUser", (data) => { // untuk menginfokan user yang join ke chat
  const { username, publicKey } = data;
  users.set(username, publicKey);
  console.log(`${username} join the chat`);
  rl.prompt();
});

socket.on("message", (data) => {
  const { username: senderUsername, message: senderMessage, signature } = data;

  // Validate message signature
  const senderPublicKey = users.get(senderUsername);
  if (!senderPublicKey) {
    console.log(`Warning: Received message from unknown user: ${senderUsername}`);
  } else {
    const isValid = crypto.verify(
      "sha256",
      Buffer.from(senderMessage),
      {
        key: senderPublicKey,
        format: "pem",
        type: "spki",
      },
      Buffer.from(signature, "base64")
    );

    if (isValid) {
      if (senderUsername !== username) {
        console.log(`${senderUsername}: ${senderMessage}`);
        rl.prompt();
      }
    } else {
      console.log(`${senderUsername}: ${senderMessage}. Warning: This user is fake! (${senderUsername})`);
    }
  }
  rl.prompt();
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