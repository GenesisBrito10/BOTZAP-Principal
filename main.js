const qrcode = require('qrcode-terminal');
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const INIT_SESSION_ROUTE = '/initSession/:phone';


const sessionManager = (sessionId) => {
    try {
        const client = new Client({
            authStrategy: new LocalAuth({
                clientId: sessionId,
            }),
            puppeteer: {
                headless: "new",
                args: [
                    '--no-sandbox'
                 
                ],
            },
        });

        client.on('authenticated', () => {
            console.log(`Client: ${sessionId} is Authenticated`);
        });

        client.on('qr', code => {
            console.log(`QR Code for ${sessionId}:`);
            qrcode.generate(code, { small: true });
        });

        client.on('ready', () => {
            console.log(`Client: ${sessionId} is ready.`);
        });

        client.on('message', async message => {
            console.log(`Client: ${sessionId} received a message`, message.from);
            if (message.body.toLowerCase() === '!grupo') {
                console.log(`Client: ${sessionId} received a message`, message.from);
            }
        });

        client.on('disconnected', (reason) => {
            console.log(`Client: ${sessionId} disconnected. Reason: ${reason}`);
        });

        client.on('error', (error) => {
            console.error(`Client: ${sessionId} encountered an error:`, error);
        });

        client.initialize();

        return client;
    } catch (error) {
        console.error(`Error creating client for session ${sessionId}:`, error.message);
        throw error;
    }
};




async function logar() {
    const pastaAuth = '.wwebjs_auth';

    try {
        const stat = await fs.stat(pastaAuth);

        if (stat.isDirectory()) {
            const pastas = await fs.readdir(pastaAuth);

            for (const pasta of pastas) {
                const caminhoPasta = path.join(pastaAuth, pasta);

                try {
                    const statPasta = await fs.stat(caminhoPasta);

                    if (statPasta.isDirectory()) {
                        const numeroPastaString = pasta.split('-')[1];

                        clientSessionStore[numeroPastaString] = sessionManager(numeroPastaString);
                    }
                } catch (error) {
                    console.error('Erro ao processar uma pasta:', error);
                }
            }
        } else {
            console.log('O diretório ".wwebjs_auth" não existe.');
        }
    } catch (error) {
        console.error('Erro durante o login:', error.message);
    }
}

const clientSessionStore = {};
logar();
app.post(INIT_SESSION_ROUTE, (req, res) => {
    try {
        const phoneNumber = req.params.phone;

        if (!clientSessionStore[phoneNumber]) {
            const clientInstance = sessionManager(phoneNumber);
            clientSessionStore[phoneNumber] = clientInstance;
        }

        res.send("positive");
    } catch (error) {
        console.log("initSession error", error);
        res.send("negative");
    }
});


const SEND_MESSAGE_ROUTE = '/sendMessage/:phone/:group';

app.post(SEND_MESSAGE_ROUTE, async (req, res) => {
    try {
        const phoneNumber = req.params.phone;
        const group = req.params.group;
        const message = req.body.message;

        if (!clientSessionStore[phoneNumber]) {
            res.status(400).send("Session not found for the provided phone number.");
            return;
        }

        const client = clientSessionStore[phoneNumber];

        await client.sendMessage(`${group}@g.us`, message);

        res.send("Message sent successfully to the group.");
    } catch (error) {
        console.log("sendMessage error", error);
        res.status(500).send("Error sending message to the group.");
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


