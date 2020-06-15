module.exports = {
  setup: function(wsSendMessageHandler) {
    const amqp = require('amqplib/callback_api');
    const rabbitAMQPUrl = `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}${process.env.RABBITMQ_VHOST}`;
    const { RABBITMQ_EXCHANGE, RABBITMQ_QUEUE } = process.env;
    amqp.connect(rabbitAMQPUrl, function(error0, connection) {
      if (error0) {
        throw error0;
      }
      connection.createChannel(function(error1, channel) {
        if (error1) {
          throw error1;
        }

        channel.assertExchange(RABBITMQ_EXCHANGE, 'fanout', {
          durable: true,
          autoDelete: true
        });

        channel.assertQueue(RABBITMQ_QUEUE, {
          durable: true,
          autoDelete: true
        }, function(error2, q) {
          if (error2) {
            throw error2;
          }

          /* 
            SUBSCRIBER / CONSUMER
          **/

          console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q.queue);
          channel.bindQueue(q.queue, RABBITMQ_EXCHANGE, '');

          channel.consume(q.queue, function(msg) {
            if(msg.content) {
              try {
                wsSendMessageHandler(msg.content.toString());
                console.log("SUCCESS [+] %s", msg.content.toString());

              } catch (err) {
                console.log("ERR: [x] %s", msg.content.toString());
                console.error(err);

              }
            }
          }, {
            noAck: true
          });
        });
      });
    });
  }
}
/**
 * setup rabit
 */

