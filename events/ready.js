const {
  EmbedBuilder,
  AttachmentBuilder,
  ActivityType,
  AuditLogEvent,
} = require("discord.js");
const config = require("../util/config.json");
const { convertTime } = require("../util/functions");
const os = require("os");
const databaseService = require("../services/databaseService");

const usageMonitor = require("../util/bot_monitors/usageMonitor");

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    client.startTimestamp = Date.now();
    console.log(
      `\x1b[38;2;87;117;144m[Client] \x1b[32m${client.user.username} \u001b[37mis online!`
    );

    client.user.setActivity({
      name: `Arcade Haven |⚡${client.shard.ids[0] + 1}/${client.shard.count}`,
      type: ActivityType.Playing,
    });

    usageMonitor(client);
  },
};
