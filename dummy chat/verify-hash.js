const crypto = require("crypto");

/**
 * First of all, the RECIPIENT obtains MESSAGE and HASH
 * (can be MD5, SHA1, or SHA256) from the SENDER
 */
const message = "this is a fake secret";
const senderHash = "2321c6d320b84c6eeb1c8b88aa44e636284c9afb"; // SHA 1 hash

// the RECIPIENT need to create their own version of the hash
const recipientHash = crypto.createHash("SHA1").update(message).digest("hex");
const isValid = (senderHash == recipientHash);
console.log("SHA-1 verification result is:", isValid);