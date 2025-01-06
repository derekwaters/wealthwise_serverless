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
const kafka_transaction_topic = 'transactions'
const kafka_notification_topic = 'notifications'
const kafka_ledger_topic = 'ledger'

const { Kafka } = require('kafkajs')

const kafka = new Kafka({
  clientId: kafka_clientId,
  brokers: [process.env.KAFKA_BROKER_HOST + ':' + process.env.KAFKA_BROKER_PORT]
})


const handle = async (context, body) => {
  // YOUR CODE HERE
  context.log.info("query", context.query);
  context.log.info("body", body);

  var recommendation = None;

  // Search through the transactions for anything affecting balance
  const consumer = kafka.consumer({ groupId: kafka_groupId});

  await consumer.connect();
  await consumer.subscribe({ topic: kafka_notification_topic, fromBeginning: false});

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      if (message.value.userId == body.userId) {
        if (message.messageType == 'balance') {
          if (message.balance > 100000) {
            recommendation = "Consider investing in property!";
          } else if (message.balance > 10000) {
            recommendation = "Consider investing in shares!";
          }
        }
      }
    }
  })

  // If the request is an HTTP POST, the context will contain the request body
  if (recommendation) {

    const producer = kafka.producer();

    await producer.connect();
    await producer.send({
      topic: kafka_notification_topic,
      messages: [
        { userId: body.userId, messageType: 'product_advice', message: recommendation }
      ]
    });
    await producer.disconnect();
  }
  return { result: "ok" };
}

// Export the function
module.exports = { handle };
