require('dotenv').config();

const MicroMQ = require('micromq');
const WebSocket = require('ws');
const Keycloak = require('keycloak-connect');
const Express = require('express');
const session = require('express-session');

const memoryStore = new session.MemoryStore();
const app = new Express();

const keycloak = new Keycloak({
  store: memoryStore
});

/**
 * setup session
 */

const sess = {
  secret: '73b409b3-28b5-5827-906c-7937c952a884',
  resave: false,
  saveUninitialized: true,
  store: memoryStore,
  cookie: {
    secure: false,
  }
}

/**
 * prod mode
 */

if (app.get('env') === 'production') {
  sess.cookie.secure = true
}

app.use(session(sess))
app.use(keycloak.middleware());

/**
 * setup rabit
 */

const rabbitAMQPUrl = `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}${process.env.RABBITMQ_VHOST}`;

const microMQ = new MicroMQ({
  name: 'notifications',
  rabbit: {
    url: rabbitAMQPUrl
  },
});
const ws = new WebSocket.Server({
  port: process.env.NOTIFY_WS_PORT,
});

const clients = new Map();

/**
 * WS HANDLER
 */

ws.on('connection', (connection) => {
  connection.on('message', (data) => {
    try {
    console.log(data);
      switch(data.message) {
        case 'connect' : connectHandler(data, connection);
      }
    } catch(err) {
      connection.close();
    }
  });
});

const connectHandler = (data, connection) => {
  clients.set(data.jwt, (clients.has(data.jwt) || []).push(connection));
}

/**
 * WS CLOSE CONNECTIONS
 */

ws.on('close', (connection) => {
  const connections = clients.has(connection.jwt);
  connections = connections.filter(c => c !== connection);
  connection.close();
});

/**
 * RABBITMQ
 */

microMQ.action('notify', (meta) => {
  if (!meta.userId || !meta.text) {
    return [400, { error: 'no user id' }];
  }

  const connections = clients.get(meta.userId);

  if (!connections) {
    return [404, { error: 'user not found' }];
  }

  connections.forEach(c => c.send(meta));
  return { ok: true };
});

microMQ.start();


   
