require('dotenv').config();
const WebSocket = require('ws');
const Express = require('express');
const session = require('express-session');
const rabbit = require('./modules/rabbit.module');
const app = new Express();

/**
 * PROD / DEV MODE
 */

if (app.get('env') === 'production') {
  sess.cookie.secure = true
}

/**
 * SESSION
 */

const memoryStore = new session.MemoryStore();

const sess = {
  secret: '73b409b3-28b5-5827-906c-7937c952a884',
  resave: false,
  saveUninitialized: true,
  store: memoryStore,
  cookie: {
    secure: false,
  }
}

app.use(session(sess))

/**
 * KEYCLOAK
 */

const KeycloakModule = require('./modules/keycloak.module');

app.use(KeycloakModule.getKeyCloak(memoryStore).middleware());


/**
 * WS HANDLER
 */

const clients = new Map();

const ws = new WebSocket.Server({
  port: process.env.NOTIFY_WS_PORT,
});

ws.on('connection', (connection) => {
  connection.on('message', (dataJSON) => {
    try {
      const data = JSON.parse(dataJSON);
      switch(data.message) {
        case 'connect' : connectHandler(data, connection);
      }
    } catch(err) {
      connection.close();
    }
  });
});

const connectHandler = (data, connection) => {
  const connections = clients.get(data.jwt) || [];
  clients.set(data.jwt, [...connections, connection]);
  console.log('connect handler data', clients);
}

const wsSendMessageHandler = function(content) {
  const rabbitMsg = JSON.parse(content);
  const { recipient, type } = rabbitMsg;
  const connections = clients.get(recipient);

  switch(rabbitMsg.type) {
    case 'NOTIFICATION_NEW': sendToConnections(connections, content);
      break;
    case 'NOTIFICATION_READ': sendToConnections(connections, content);
      break;
  }
};

sendToConnections = (connections, data) => {
  console.log('sendToConnections', connections, data);
  connections.forEach(c => c.send(data));
}

/**
 * WS CLOSE CONNECTIONS
 */

ws.on('close', (connection) => {
  console.log(connection);
  const connections = clients.has(connection.jwt);
  connections = connections.filter(c => c !== connection);
  connection.close();
});


/**
 * RABBITMQ
 */

rabbit.setup(wsSendMessageHandler);



