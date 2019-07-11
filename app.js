const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;
const { WebClient } = require('@slack/web-api');
const MongoClient = require('mongodb').MongoClient;
const mongoUrl = 'mongodb://localhost:27017/mydb';

const CONFIG = require('./config.json')
const RsHandler = require('./rivescripthandlers');
const slackWeb = new WebClient(CONFIG.Slack.BotUserOAuthToken);

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())

// app.get('/', (req, res) => res.send('Hello World!'));

async function HandleSlackEvents(req, res) {
  let payload = req.body
  // console.log('******* payload *******')
  // console.log(payload)
  let text = payload.event.text
  let user = '<@' + payload.event.user + '>'
  text = text.replace(/ *\<[^)]*\> */g, ''); // remove <???>

  let rs = new RsHandler();
  await rs.init();
  let reply = await rs.getReply(payload.event.user, text);
  // Examine the reply is Block UI or normal text
  if (reply.substring(0, 9) === '{"blocks"') {
    let json = JSON.parse(reply)
    // Send the blocks to the channel
    await slackWeb.chat.postMessage({
      channel: payload.event.channel,
      blocks: json.blocks
    })
  } else {
    // Send reply message to the channel
    await slackWeb.chat.postMessage({
      channel: payload.event.channel,
      text: user + ' ' + reply
    })
  }
}

async function HandleSlackAction(req, res, payload, action) {
  let returnMsg = null
  if (action.type === 'button' && action.action_id === 'block_user') {
    let userId = parseInt(action.value);

    let dbc = await MongoClient.connect(mongoUrl, { useNewUrlParser: true });
    let db = dbc.db('demo'); // Create a demo database
    let colUsers = await db.collection('users');

    // Update the record to set the is_active value to false
    let r = await colUsers.updateOne({ _id: userId }, {
      $set: {
        is_active: false
      }
    });

    if (r.result.n === 1) {
      returnMsg = `user ${userId} blocked successfully`
    } else {
      returnMsg = `user ${userId} not found!`
    }
  } else {
    returnMsg = 'Unknown action';
  }

  // Build the response message and send back to Slack
  let user = '<@' + payload.user.id + '>'
  await slackWeb.chat.postMessage({
    channel: payload.channel.id,
    type: 'mrkdwn',
    text: user + ' ' + returnMsg
  });
}

// API to handle Slack events such as app.mentioned
app.post('/slack/events', async (req, res) => {
  let payload = req.body;

  if (payload.challenge) { // Called by Slack to verify this webhook    
    res.setHeader('content-type', 'application/json')
    res.status(200).json({ challenge: payload.challenge })
  } else if (payload.event && payload.event.type === 'app_mention') {
    console.log(payload.event);
    if (payload.event.subtype !== 'bot_message') {
      await HandleSlackEvents(req, res);
    }
    res.status(200).end();
  }
});

// API to handle Slack interactive component actions such as button
app.post('/slack/actions', async (req, res) => {
  let payload = req.body;

  if (payload.challenge) { // Called by Slack to verify this webhook    
    res.setHeader('content-type', 'application/json')
    res.status(200).json({ challenge: payload.challenge })
  } else if (payload.payload && typeof payload.payload === 'string') {
    payload = JSON.parse(payload.payload)
    if (payload.type && payload.type === 'block_actions' ) {
      for (let i = 0; i < payload.actions.length; ++i) {
        let action = payload.actions[i];
        await HandleSlackAction(req, res, payload, action);
      }
    }
    res.status(200).end();
  }
});

app.listen(port, () => console.log(`Server App listening on port ${port}`));
