const { CloudEvent } = require('cloudevents');

const { Client } = require('pg');

const database_table_create = 'CREATE TABLE IF NOT EXISTS public.usernotifications (userId integer, date bigint, data text)';
const database_insert_notification = 'INSERT INTO public.usernotifications VALUES ($1, $2, $3)';

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
  context.log.info("Connecting to the database");

  // Then write the new message
  try {
    await client.query(database_insert_notification, [data.userId, data.date, JSON.stringify(data)]);
  } catch (err) {
    context.log.error(err);
  }
  await client.end();
  return { result: "ok" };
}

// Export the function
module.exports = { handle };
