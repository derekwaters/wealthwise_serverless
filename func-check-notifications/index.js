
const { Client } = require('pg');

const database_table_create = 'CREATE TABLE IF NOT EXISTS public.usernotifications (userId integer, date bigint, data text)';
const database_get_notifications = 'SELECT data from public.usernotifications where userId = $1 and date > $2 ORDER BY date ASC';
const database_clear_notifications = 'DELETE from public.usernotifications where userId = $1';

// REQUIRED ENV VARS:
// PGUSER
// PGPASSWORD
// PGHOST
// PGPORT = 5432
// PGDATABASE

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

const handle = async (context, event) => {
  // This function should be called directly from a POST request (with a userId)
  context.log.info(context);


  // If the request is an HTTP POST, the context will contain the request body
  if (context.method === 'POST') {
    var userId = context.body.userId;
    // Should use a topic per userId, but I'm too lazy to do so now
    var fromDate = context.body.fromDate || 0;
    var newMessages = [];

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
      const result = await client.query(database_get_notifications, [userId, fromDate]);
      context.log.info(result);
      result.rows.forEach((rowData) => {
        newMessages.push(JSON.parse(rowData.data));
      });

      await client.query(database_clear_notifications, [userId]);
      
    } catch (err) {
      context.log.error(err);
    }
    await client.end();
    
    // Now delete them


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
