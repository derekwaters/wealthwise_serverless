const { CloudEvent } = require('cloudevents');

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


/**
 * Your CloudEvent handling function, invoked with each request.
 * This example function logs its input, and responds with a CloudEvent
 * which echoes the incoming event data
 *
 * It can be invoked with 'func invoke'
 * It can be tested with 'npm test'
 *
 * @param {Context} context a context object.
 * @param {object} context.body the request body if any
 * @param {object} context.query the query string deserialzed as an object, if any
 * @param {object} context.log logging object with methods for 'info', 'warn', 'error', etc.
 * @param {object} context.headers the HTTP request headers
 * @param {string} context.method the HTTP request method
 * @param {string} context.httpVersion the HTTP protocol version
 * See: https://github.com/knative/func/blob/main/docs/function-developers/nodejs.md#the-context-object
 * @param {CloudEvent} event the CloudEvent
 */
const handle = async (context, event) => {
  // This function should be triggered by a Kafka event from the transactions topic
  // event is a CloudEvent. Kafka can handle any data, so we'll have to convert
  // the event.data Buffer into an object via JSON.
  //
  context.log.info("query", context.query);
  context.log.info("event", event);
  context.log.info(event);
  var dataBuf = event.data.toString();
  var data = JSON.parse(dataBuf);
  context.log.info(data);

  // Get all the matching events
  var currentBalance = 0;

  // Search through the transactions for anything affecting balance
  const consumer = kafka.consumer({ groupId: kafka_groupId});

  await consumer.connect();
  await consumer.subscribe({ topic: kafka_transaction_topic, fromBeginning: true});

  console.log.info("About to calculate balance for " + data.userId);

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      if (message.value.userId == data.userId) {
        console.log.info("Got a transaction:");
        console.log.info(message);
        if (message.value.type == 'deposit') {
          currentBalance += message.value.amount;
        } else if (message.value.type == 'expense') {
          currentBalance -= message.value.amount;
        }
        console.log.info("   -> Running balance: " + currentBalance);
      }
    }
  })

  console.log.info("Total Balance: " + currentBalance);

  // Add a notification message
  const producer = kafka.producer();

  var newNotification = {
    userId: data.userId,
    messageType: 'balance',
    balance: currentBalance,
    date: Date.now()
  };
  var newBalance = {
    userId: data.userId,
    balance: currentBalance
  };

  await producer.connect();
  await producer.send({
    topic: kafka_notification_topic,
    messages: [
      { value: JSON.stringify(newNotification) }
    ]
  });
  await producer.send({
    topic: kafka_balance_update_topic,
    messages: [
      { value: JSON.stringify(newBalance) }
    ]
  });
  await producer.disconnect();
  return { result: "ok" };
}

// Export the function
module.exports = { handle };
