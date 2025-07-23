// backend/services/lineService.js
const line = require('@line/bot-sdk');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

// Send message to user
async function sendMessage(userId, messageText) {
  try {
    await client.pushMessage(userId, {
      type: 'text',
      text: messageText,
    });
    console.log('✅ Message sent to user:', userId);
  } catch (err) {
    console.error('❌ Failed to send LINE message:', err);
  }
}

module.exports = { sendMessage };