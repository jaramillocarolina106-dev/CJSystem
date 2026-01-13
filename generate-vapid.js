const webpush = require("web-push");

const vapidKeys = webpush.generateVAPIDKeys();

console.log("PUBLIC VAPID KEY:");
console.log(vapidKeys.publicKey);

console.log("\nPRIVATE VAPID KEY:");
console.log(vapidKeys.privateKey);
