const { Client } = require('whatsapp-web.js');
const { Configuration, OpenAIApi } = require("openai");
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const axios = require('axios');
const admin = require('firebase-admin');

const client = new Client();

// Initialize the OpenAI API client
const configuration = new Configuration({
  apiKey: process.env.API,
});
const openai = new OpenAIApi(configuration);
module.exports = openai;

// Initialize Firebase
const serviceAccount = require("/Volumes/Darwin's Drive/Devs/Whatsaap Development/lumina wasap/ws-lumina/LuminaWhatsapp/lumina-ai-7d702-firebase-adminsdk-tltpt-b33ef2b1dd.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://lumina-ai-7d702-default-rtdb.firebaseio.com',
});

// Variable to store the admin who is running the broadcast
let adminPhoneNumber = '+601154112429';

client.on('qr', (qrCode) => {
  qrcode.generate(qrCode, { small: true });
  console.log('Scan the QR code with your phone to log in.');
});

client.on('authenticated', (session) => {
  console.log('Authenticated.');
  fs.writeFileSync('./session.json', JSON.stringify(session));
});

client.on('ready', () => {
  console.log('WhatsApp bot is ready.');
});

client.on('message', async (message) => {
  if (message.body) {
    const userMessage = message.body.toLowerCase();

    if (userMessage.startsWith('hi lumina') || userMessage.startsWith('hai lumina')) {
      const prompt = userMessage.replace(/hi lumina|hai lumina/i, '').trim();

      // Send the user's prompt to OpenAI for a response
      try {
        const openaiResponse = await openai.createCompletion({
          model: 'gpt-3.5-turbo',
          prompt,
          max_tokens: 1000, // Adjust as needed
        });

        const reply = openaiResponse.data.choices[0].text;
        message.reply(reply);
      } catch (error) {
        console.error('Error sending message to OpenAI:', error);
        message.reply('An error occurred while processing your request.');
      }
    } else if (userMessage.includes('gambar') || userMessage.includes('picture')) {
      const prompt = userMessage.replace('gambar', '').replace('picture', '').trim();

      // Send the user's prompt to DALL-E for image generation
      try {
        const dalleResponse = await openai.createCompletion({
          model: 'image-alpha-001',
          prompt,
          max_tokens: 1000, // Adjust as needed
        });

        const imageURL = dalleResponse.data.choices[0].text;
        // Send the image URL to the user
        axios.get(imageURL, { responseType: 'stream' }).then((response) => {
          response.data.pipe(fs.createWriteStream('generated-image.png'));
          message.reply('Here is the generated image:');
          message.reply({ url: 'generated-image.png' }); // Send the generated image
        });
      } catch (error) {
        console.error('Error generating image with DALL-E:', error);
        message.reply('An error occurred while generating the image.');
      }
    } else if (userMessage === '!broad') {
      // Admin broadcast command
      adminPhoneNumber = message.from;
      askForBroadcastMessage();
    } else {
      // If the user's message doesn't match any specific patterns, send a welcome message
      message.reply('Welcome to our WhatsApp bot. How can I assist you today?');
    }
  }
});

function askForBroadcastMessage() {
  // Ask the admin for the broadcast message
  client.sendMessage(adminPhoneNumber, 'Please enter the message you want to broadcast:');
}

client.initialize();

client.on('auth_failure', () => {
  console.error('Authentication failed. Please check your credentials.');
});

client.on('disconnected', (reason) => {
  console.error('Client was disconnected:', reason);
  fs.unlinkSync('./session.json');
  client.initialize();
});

// Handle the admin's response to the broadcast message prompt
client.on('message_create', (message) => {
  if (message.from === adminPhoneNumber) {
    // Broadcast the message to users
    broadcastMessageToUsers(message.body);
  }
});

function broadcastMessageToUsers(message) {
  const userRef = admin.database().ref('userContacts');

  // Check if the user's contact already exists in the database
  userRef.once('value', (snapshot) => {
    const userContacts = snapshot.val();

    if (!userContacts) {
      // If there are no contacts, add the first contact
      userRef.push({ phoneNumber: message.from, message });
    } else {
      // Check if the contact already exists
      let contactExists = false;
      Object.values(userContacts).forEach((contact) => {
        if (contact.phoneNumber === message.from) {
          contactExists = true;
        }
      });

      // If the contact does not exist, add it
      if (!contactExists) {
        userRef.push({ phoneNumber: message.from, message });
      }
    }

    // Iterate through user contacts and send the broadcast message
    Object.values(userContacts).forEach((contact) => {
      const phoneNumber = contact.phoneNumber;
      // Send the broadcast message to the user using the WhatsApp bot
      client.sendMessage(phoneNumber, message);
    });
  });
}
