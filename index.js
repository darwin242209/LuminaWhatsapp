const { Client } = require('whatsapp-web.js');
const axios = require('axios');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const admin = require('firebase-admin');

const client = new Client();

// Initialize Firebase
const serviceAccount = require('/workspace/LuminaWhatsapp/lumina-ai-7d702-firebase-adminsdk-tltpt-b33ef2b1dd.json');
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
  if (session) {
    fs.writeFileSync('/workspace/LuminaWhatsapp/session.json', JSON.stringify(session));
  } else {
    console.error('Session data is undefined.');
  }
});

client.on('ready', () => {
  console.log('WhatsApp bot is ready.');
});

client.on('message', async (message) => {
  if (message.body) {
    const userMessage = message.body.toLowerCase();

    if (userMessage.startsWith('hi lumina') || userMessage.startsWith('hai lumina')) {
      const prompt = userMessage.replace(/hi lumina|hai lumina/i, '').trim();
      message.reply('🔄 Sila Tunggu Sebentar Sementara Saya Menghubungi Server Lumina…');
      try {
        const openaiResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'system', content: 'You are a helpful assistant.' }, { role: 'user', content: prompt }],
          max_tokens: 100, // Adjust as needed
        }, {
          headers: {
            'Authorization': 'Bearer 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',
          },
        });

        const reply = openaiResponse.data.choices[0].message.content;
        message.reply(reply);
      } catch (error) {
        console.error('Error sending message to OpenAI:', error);
        message.reply('An error occurred while processing your request.');
      }
    } else if (userMessage.includes('gambar') || userMessage.includes('picture')) {
      const prompt = userMessage.replace('gambar', '').replace('picture', '').trim();

      try {
        const dalleResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: 'image-alpha-001',
          messages: [{ role: 'system', content: 'You are a helpful assistant.' }, { role: 'user', content: prompt }],
          max_tokens: 100, // Adjust as needed
        }, {
          headers: {
            'Authorization': 'Bearer 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',
          },
        });

        const imageURL = dalleResponse.data.choices[0].message.content;
        axios.get(imageURL, { responseType: 'stream' }).then((response) => {
          response.data.pipe(fs.createWriteStream('generated-image.png'));
          message.reply('Here is the generated image:');
          message.reply({ url: 'generated-image.png' });
        });
      } catch (error) {
        console.error('Error generating image with DALL-E:', error);
        message.reply('An error occurred while generating the image.');
      }
    } else {
      message.reply({
        url: 'https://drive.google.com/file/d/1xA7mtLroQ8-IbOc1bL_RMR5q3OWkpZQs',
        caption: '📌 Selamat Datang 📌\n\nProjek ini ialah projek prototaip untuk Pertandingan STEM untuk tahun yang akan datang.\nProjek: Lumina Ai\nGuru Pembimbing: Cg Viktoria\nAhli Kumpulan:\n- Darwin [ Developer ]\n- Odelia [ Beta Tester ]\n- Arvina [ Project Planner ]\n——Version: BETA@^0.0.1——\n\n⚠️ Disebabkan penggunaan server yang dihadkan, projek ini akan diluar talian pada masa tertentu. Kami akan akan berusaha untuk mengatasi masalah ini pada masa akan datang:\n\n- Isnin, Selasa, Rabu, Khamis, Jumaat ( Offline )\n- Ahad, Sabtu [8:00PM~10PM]\n——————————————\n[Online Everyday]\nLumina Ai Telegram:\n- t.me/LuminaAiBot',
      });
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
  fs.unlinkSync('/workspace/LuminaWhatsapp/session.json');
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
const { MessageMedia } = require('whatsapp-web.js');
