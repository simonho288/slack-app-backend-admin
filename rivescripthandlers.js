const assert = require('assert');
const MongoClient = require('mongodb').MongoClient;
const mongoUrl = 'mongodb://localhost:27017/mydb';
const RiveScript = require('rivescript');

class RsHandler {
  constructor() {
    this._rs = new RiveScript({ utf8: true });
  }

  async init() {
    await this._rs.loadDirectory(__dirname + '/brain');
    this._rs.setSubroutine('subUserRegisterToday', this.subUserRegisterToday);
    this._rs.setSubroutine('subBlockUser', this.subBlockUser);
    this._rs.sortReplies();
  }

  async getReply(user, msg) {
    return await this._rs.reply(user, msg);
  }

  /*
   * Rivescript subroutine to handle 'subUserRegisterToday'
   */
  async subUserRegisterToday(rs, args) {
    let dbc = await MongoClient.connect(mongoUrl, { useNewUrlParser: true });
    let db = dbc.db('demo'); // Create a demo database

    // Mongodb criteria to find how many user register today
    let start = new Date()
    let end = new Date()
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    let colUsers = await db.collection('users');
    let num = await colUsers.countDocuments({
      registered_at: {
        '$gte': start,
        '$lt': end
      }
    });

    dbc.close();

    return `There is ${num} user(s) registered today`;
  }

  /*
   * Rivescript subroutine to handle 'subBlockUser'
   */
  async subBlockUser(rs, args) {
    assert(args.length > 0);

    let userId = parseInt(args[0]);
    let dbc = await MongoClient.connect(mongoUrl, { useNewUrlParser: true });
    let db = dbc.db('demo'); // Create a demo database
    let colUsers = await db.collection('users');

    let user = await colUsers.findOne({ _id: userId });
    dbc.close();

    if (!user) {
      return 'User not found!'
    } else {
      return JSON.stringify({
        // Return the block UI created by Slack Block Kit Builder:
        // https://api.slack.com/tools/block-kit-builder
        "blocks": [
        	{
        		"type": "section",
        		"text": {
        			"type": "mrkdwn",
        			"text": `Are you sure to block user: ${user.name}?`
        		},
        		"accessory": {
        			"type": "button",
        			"text": {
        				"type": "plain_text",
        				"text": "Confirm",
        				"emoji": true
        			},
        			"value": `${user._id}`,
              "action_id": "block_user"
        		}
        	}
        ]
      });
    }
  }
}

module.exports = RsHandler;
