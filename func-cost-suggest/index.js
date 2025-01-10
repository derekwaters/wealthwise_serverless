const { CloudEvent } = require('cloudevents');

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
  // This function should be triggered by a Kafka event from the transactions topic
  // event.data. will contain the Kafka data
  context.log.info("query", context.query);
  context.log.info("event", event);
  context.log.info(event);
  context.log.info(event.data);
  context.log.info(typeof event.data);

  var recommendation = null;
  if (event.data.type == 'expense') {
    if (event.data.amount < 100) {
      // Recommend a top-up saver
      recommendation = 'Consider a top-up saver account!';
    } else if (event.data.amount > 2000 && event.data.vendor == 'bank') {
      // Recommend a home loan evaluation
      recommendation = 'Consider a review of your current home loan provider'
    }
    if (recommendation) {
      const producer = kafka.producer();

      var newMsg = {
        userId: event.data.userId,
        messageType: 'recommendation',
        message: recommendation,
        date: Date.now()
      };

      await producer.connect();
      await producer.send({
        topic: kafka_notification_topic,
        messages: [
          { value: JSON.stringify(newMsg) }
        ]
      });
      await producer.disconnect();
    }
  }
  return { result: "ok" };
}

// Export the function
module.exports = { handle };
