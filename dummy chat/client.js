const io = require("socket.io-client");
const readline = require("readline");
const crypto = require("crypto");

const socket = io("http://localhost:3000"); // 3000 berdasarkan port yang sedang running

const rl = readline.createInterface({ // untuk read inputan yang diberikan oleh user menggunakan terminal
    input: process.stdin, 
    output: process.stdout,
    prompt: "> " // prompt yang akan muncul ketika user connected dan enter username
});

let username = ""; // variabel username

function hashMsg(message) {
    return crypto.createHash('sha256').update(message).digest('hex');
}

socket.on("connect", () => { 
    console.log("Connected to the server"); // output yang akan keluar jika user mencoba untuk connect

    rl.question("Enter your username: ", (input) => { // menanyakan username dari user yang ingin chatting
        username = input;
        console.log(`Welcome, ${username} to the chat`); // output yang muncul ketika user telah berhasil masuk chat
        rl.prompt();

        rl.on("line", (message) => { // ketrigger ketika user menekan enter, message adalah inputan dr user
            if (message.trim()) { // untuk menghapus spasi agar message lebih rapi
                const hashedMessage = hashMsg(message);

                socket.emit("message", { username, message, hash: hashedMessage }); // mengirimkan pesannya melalui socket
            }
            rl.prompt();
        });
    });    
});

socket.on("message", (data) => { 
    const { username: senderUsername, message: senderMessage, hash: senderHash } = data;

    if (senderUsername !== username) {
        const hashServer = hashMsg(senderMessage);

        if (hashServer === senderHash) {
            console.log(`${senderUsername}: ${senderMessage}`);
        } else {
            console.log(`${senderUsername} (warning: message modified by server): ${senderMessage}`);
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