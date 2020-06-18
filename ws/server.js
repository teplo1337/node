require('dotenv').config();
const WebSocket = require('ws');
const Express = require('express');
const session = require('express-session');
const rabbit = require('./modules/rabbit.module');
const app = new Express();
const jwtDecode = require('jwt-decode');
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
const keycloak = KeycloakModule.getKeyCloak(memoryStore);
app.use(keycloak.middleware());


/**
 * WS HANDLER
 */

const clients = new Map();

const ws = new WebSocket.Server({
  port: process.env.NOTIFY_WS_PORT,
});

// TODO: добавить keycloak.protect()

ws.on('connection', (connection) => {
  connection.on('message', (dataJSON) => {
    try {
      const meta = JSON.parse(dataJSON);
      switch(meta.message) {
        case 'connect' : connectHandler(meta.data, connection);
      }
    } catch(err) {
      console.error(err);
      connection.close();
    }
  });
});

const connectHandler = (data, connection) => {
  const { preferred_username } = jwtDecode(data.token);
  console.log(preferred_username);

  const connections = clients.get(preferred_username) || [];
  if (!connections.find(c => c === connection)) {
    clients.set(preferred_username, [...connections, connection]);
  }
  console.log('connect handler data', clients.get(preferred_username));
}

const wsSendMessageHandler = function(content) {
  const rabbitMsg = JSON.parse(content);
  const { data, type } = rabbitMsg;
  const connections = data && clients.get(data.recipient) || [];

  switch(type) {
    case 'NOTIFICATION_NEW': sendToConnections(connections, content);
      break;
    case 'NOTIFICATION_READ': sendToConnections(connections, content);
      break;
  }
};

sendToConnections = (connections, data) => {
  console.log('sendToConnections', data);
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



