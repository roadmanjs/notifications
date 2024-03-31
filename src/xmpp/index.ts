import {log} from '@roadmanjs/logs';
import xmpp from 'node-xmpp-client';

const jid = process.env.XMPP_JID;
const password = process.env.XMPP_PASSWORD;
const host = process.env.XMPP_HOST;
const port = +process.env.XMPP_PORT || 5222;
let xmppClient: xmpp.Client | null = null;

export const getXmppClient = (): xmpp.Client | null => {
    if (!jid || !password || !host) {
        log(
            'No XMPP credentials found, please set XMPP_JID, XMPP_PASSWORD, and XMPP_HOST in your .env file.'
        );
        return null;
    }
    if (!xmppClient) {
        xmppClient = new xmpp.Client({
            jid,
            password,
            host,
            port,
        });

        // Event listener for successful connection
        xmppClient.on('online', () => {
            console.log('Connected to XMPP server');
        });

        // Event listener for errors
        xmppClient.on('error', (err) => {
            console.error('Error:', err);
        });

        // Event listener for disconnection
        xmppClient.on('offline', () => {
            console.log('Disconnected from XMPP server');
        });

        // Event listener for receiving messages
        xmppClient.on('stanza', (stanza) => {
            console.log('Received:', stanza.toString());
        });
    }
    return xmppClient;
};

export const sendXmppMessage = (to: string, message: string): void => {
    const client = getXmppClient();
    if (client) {
        // @ts-ignore
        client.send(new xmpp.Element('message', {to, type: 'chat'}).c('body').t(message));
    }
};
