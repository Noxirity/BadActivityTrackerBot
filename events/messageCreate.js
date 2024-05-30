const { cooldown, permissions } = require("../util/functions");
const { PREFIX: prefix } = require(`../util/config.json`);
const databaseService = require("../services/databaseService");

module.exports = {
  name: "messageCreate",
  once: false,
  async execute(message, client) {
    let commandPrefix = prefix;
    const mentionRegex = message.content.match(
      new RegExp(`^<@!?(${client.user.id})>`, "gi")
    );
    if (mentionRegex) commandPrefix = `${mentionRegex[0]} `;

    const args = message.content.slice(commandPrefix.length).split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command =
      client.commands.get(commandName) ||
      client.commands.find(
        (command) => command.aliases && command.aliases.includes(commandName)
      );

    if (!command) {
      if (message.author.bot) return;
      const database = await databaseService.getDatabase("DiscordServer");
      const collection = await databaseService.getCollection(
        "SpikeyMessages",
        database
      );

      const date = new Date();
      const dateString = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

      const newMessage = {
        userId: message.author.id,
        content: message.content,
        timestamp: date.getTime(),
      };

      await collection.updateOne(
        { _id: message.author.id },
        { $push: { [dateString]: newMessage } },
        { upsert: true }
      );
    }

    if (command.permissions && command.permissions.length) {
      if (permissions(message, command)) {
        return;
      }
    }

    if (command.cooldown) {
      if (cooldown(message, command, message.author.id, client)) {
        return;
      }
    }

    try {
      await command.execute(message, client, args, commandPrefix);
    } catch (error) {
      console.error(error);
      await message.reply({
        content: "`An error has occurred while executing this command.`",
        ephemeral: true,
        allowedMentions: { repliedUser: false },
      });
    }
  },
};
