require("dotenv").config();

const { ShardingManager } = require("discord.js");
const manager = new ShardingManager("./bot.js", {
  token: process.env.BOT_TOKEN,
  totalShards: "auto",
});

manager.on("shardCreate", (shard) => {
  console.log(`Shard Launched: ${shard.id}`);
});

manager.spawn();

// Now we need to monitor 
async function monitorListings() {
}

// monitorListings();