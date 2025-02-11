/**
 * Your HTTP handling function, invoked with each request. This is an example
 * function that echoes its input to the caller, and returns an error if
 * the incoming request is something other than an HTTP POST or GET.
 *
 * In can be invoked with 'func invoke'
 * It can be tested with 'npm test'
 *
 * @param {Context} context a context object.
 * @param {object} context.body the request body if any
 * @param {object} context.query the query string deserialized as an object, if any
 * @param {object} context.log logging object with methods for 'info', 'warn', 'error', etc.
 * @param {object} context.headers the HTTP request headers
 * @param {string} context.method the HTTP request method
 * @param {string} context.httpVersion the HTTP protocol version
 * See: https://github.com/knative/func/blob/main/docs/function-developers/nodejs.md#the-context-object
 */

const kafka_clientId = 'wealthwise-transact'
const kafka_groupId = 'wealthwise-group'
const kafka_transaction_topic = 'wealthwise-transactions'
const kafka_notification_topic = 'wealthwise-user-notifications'
const kafka_balance_update_topic = 'wealthwise-balance-update'

const { Kafka } = require('kafkajs')

const kafka = new Kafka({
  clientId: kafka_clientId,
  brokers: [process.env.KAFKA_BROKER],
  ssl: false
})

const handle = async (context, event) => {
  context.log.info(context.body);
  context.log.info(context.body.userId);
  context.log.info(context.body.type);
  context.log.info(context.body.amount);
  context.log.info("Using Kafka Broker: " + process.env.KAFKA_BROKER);


  // If the request is an HTTP POST, the context will contain the request body
  if (context.method === 'POST') {
    switch (context.body.type) {
      case 'deposit':
      case 'expense':

        context.log.info("got a transaction type, so let's post a message to Kafka");
        var messageList = [
          {
            value: JSON.stringify(context.body)
          }];
        context.log.info(messageList);

        // Add to the transactions Kafka topic
        const producer = kafka.producer();

        await producer.connect();
        context.log.info("Now connected");
        await producer.send({
          topic: kafka_transaction_topic,
          messages: messageList
        });
        context.log.info("Now sent");
        await producer.disconnect();
        return { result: "ok" };

        // TODO: Move this to a new get-notifications function
        /*
      case 'notification_check':
        // Get any notifications
        const consumer = kafka.consumer({ groupId: kafka_groupId});

        await consumer.connect();
        await consumer.subscribe({ topic: kafka_notification_topic, fromBeginning: false});

        var notifications = [];

        await consumer.run({
          eachMessage: async ({ topic, partition, message }) => {
            notifications.push(message.value);
          }
        })

        return { result: "ok", notifications: notifications };
        */
    }
    return { statusCode: 405, statusMessage: 'Invalid event type' };
  } else {
    return { statusCode: 405, statusMessage: 'Method not allowed' };
  }
}

// Export the function
module.exports = { handle };
