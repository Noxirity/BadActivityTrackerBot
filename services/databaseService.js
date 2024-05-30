const getDatabase = async (databaseName) => {
  const { MongoClient } = require("mongodb");
  const config = require("../util/config.json");

  const uri = process.env.MONGODB_URI
  const client = new MongoClient(uri);

  try {
    const database = await client.db(databaseName);
    return database;
  } catch (error) {
    console.error(error);
  }
};

module.exports = {
  getDatabase,
};
