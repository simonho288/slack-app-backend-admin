const MongoClient = require('mongodb').MongoClient;
const mongoUrl = 'mongodb://localhost:27017/demo';

async function main() {
  let dbc = await MongoClient.connect(mongoUrl, { useNewUrlParser: true });
  let db = dbc.db('demo'); // Create a demo database

  let colUsers = await db.createCollection('users');

  // Delete all records at the beginning
  colUsers.deleteMany({});

  // Insert 4 demo user records
  colUsers.insertMany([
    {
      _id: 1,
      name: 'Mary',
      registered_at: new Date(),
      is_active: true
    },
    {
      _id: 2,
      name: 'John',
      registered_at: new Date(),
      is_active: true
    },
    {
      _id: 3,
      name: 'Peter',
      registered_at: new Date(),
      is_active: true
    },
    {
      _id: 4,
      name: 'Betty',
      registered_at: new Date(),
      is_active: true
    },
  ]);

  dbc.close();
}

main();
