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
const kafka_ledger_topic = 'wealthwise-ledger'
const kafka_balance_update_topic = 'wealthwise-balance-update'

const { Kafka } = require('kafkajs')

const kafka = new Kafka({
  clientId: kafka_clientId,
  brokers: [process.env.KAFKA_BROKER],
  ssl: false
})

const handle = async (context, event) => {
  // This function should be called directly from a POST request (with a userId)
  context.log.info("query", context.query);
  context.log.info("event", event);

  context.log.info("query", context.query);
  context.log.info("context", context);
  context.log.info(context);
  context.log.info("Using Kafka Broker: " + process.env.KAFKA_BROKER);


  // If the request is an HTTP POST, the context will contain the request body
  if (context.method === 'POST') {
    var userId = context.body.userId;
    // Should use a topic per userId, but I'm too lazy to do so now
    var fromDate = context.body.fromDate;
    var newMessages = [];

    // Search through the transactions for anything affecting balance
    const consumer = kafka.consumer({ groupId: kafka_groupId});

    await consumer.connect();
    await consumer.subscribe({ topic: kafka_notification_topic, fromBeginning: true});

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        if (message.value.userId == userId &&
            message.value.date > fromDate) {
          newMessages.push(message.value);
        }
      }
    })

    return {
      status: "ok",
      notifications: newMessages
    };
  } else {
    return { statusCode: 405, statusMessage: 'Method not allowed' };
  }
}

// Export the function
module.exports = { handle };
