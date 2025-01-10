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
  // This function should be event triggered based on receiving balance-update Kafka messages
  // event.data. should contain all the 
  context.log.info("query", context.query);
  context.log.info("event", event);

  var recommendation = None;
  if (event.data.balance > 100000) {
    recommendation = "Consider investing in property!";
  } else if (event.data.balance > 10000) {
    recommendation = "Consider investing in shares!";
  }
  
  if (recommendation) {

    var newUserMessage = {
      userId: event.data.userId,
      messageType: 'product_advice',
      message: recommendation,
      date: Date.now()
    };

    const producer = kafka.producer();

    await producer.connect();
    await producer.send({
      topic: kafka_notification_topic,
      messages: [
        { value: JSON.stringify(newUserMessage) }
      ]
    });
    await producer.disconnect();
  }
  return { result: "ok" };
}

// Export the function
module.exports = { handle };
