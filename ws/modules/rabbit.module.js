/**
 * setup rabit
 */

module.exports = {
  setup: function (wsSendMessageHandler) {
    const amqp = require('amqplib/callback_api');
    const rabbitAMQPUrl = `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}${process.env.RABBITMQ_VHOST}`;
    const { RABBITMQ_EXCHANGE, RABBITMQ_QUEUE } = process.env;
    amqp.connect(rabbitAMQPUrl, function (error0, connection) {
      if (error0) {
        throw error0;
      }
      connection.createChannel(function (error1, channel) {
        if (error1) {
          throw error1;
        }

        channel.assertExchange(RABBITMQ_EXCHANGE, 'fanout', {
          durable: true,
        });

        channel.assertQueue(RABBITMQ_QUEUE, {
          durable: true,
        }, function (error2, q) {
          if (error2) {
            throw error2;
          }
          console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q.queue);

          // добавить роутинг
          channel.bindQueue(q.queue, RABBITMQ_EXCHANGE, '');

          channel.consume(q.queue, function (msg) {

          /* 
            SUBSCRIBER / CONSUMER
          **/
            if (msg.content) {
              console.log('consumerTag', msg.fields.consumerTag);
              
              try {
                wsSendMessageHandler(msg.content.toString());
                // channel.ack(msg);
              } catch (err) {
                console.log("ERR: [x] %s", msg.content.toString());
                console.error(err);
                // channel.nack(msg);

              } finally {
                console.log("SUCCESS [+] %s", msg.content.toString());
                console.log('msg acked')
                channel.ack(msg);
              }
            }
          });
        });
      });
    });
  }
}

