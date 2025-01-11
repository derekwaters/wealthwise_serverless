const { CloudEvent } = require('cloudevents');

const { Client } = require('pg');

const database_table_create = 'CREATE TABLE IF NOT EXISTS public.userbalance (userId integer, balance real)';
const database_get_balance = 'SELECT balance from public.userbalance where userId = $1';
const database_insert_balance = 'INSERT INTO public.userbalance VALUES ($1, $2)';
const database_update_balance = 'UPDATE public.userbalance SET balance = $2 WHERE userId = $1';

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

// REQUIRED ENV VARS:
// PGUSER
// PGPASSWORD
// PGHOST
// PGPORT = 5432
// PGDATABASE


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
  var addBalance = 0;
  if (data.type == 'deposit') {
    addBalance = data.amount;
  } else if (data.type == 'expense') {
    addBalance = -data.amount;
  }

  context.log.info("About to find current balance for " + data.userId);
  const client = new Client({
    ssl: false
  });
  context.log.info("About to connect to " + process.env.PGHOST);
  await client.connect()
  context.log.info("Connected...");

  // Ensure the database table exists
  try {
    await client.query(database_table_create);
  } catch (err) {
    context.log.error(err);
  }
  // Then get the user's balance
  try {
    const result = await client.query(database_get_balance, [data.userId]);
    context.log.info(result);
    if (result.rowCount == 0) {
      // No currentBalance yet!
      currentBalance = addBalance;
      await client.query(database_insert_balance, [data.userId, currentBalance]);
    } else {
      // Amend the balance
      currentBalance = result.rows[0].balance;
      currentBalance += addBalance;
      await client.query(database_update_balance, [data.userId, currentBalance]);
    }
  } catch (err) {
    context.log.error(err);
  }
  await client.end();
  
  context.log.info("Total Balance: " + currentBalance);

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
