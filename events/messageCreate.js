const { cooldown, permissions } = require("../util/functions");
const { PREFIX: prefix } = require(`../util/config.json`);

module.exports = {
  name: "messageCreate",
  once: false,
  async execute(message, client) {
    const CHANNEL_IDS = ["1201249045771984936", "1112734635210846310"];
    const BOT_ID = "1092037151119654913";

    if (
      CHANNEL_IDS.includes(message.channel.id) &&
      message.author.id === BOT_ID
    ) {
      require("../util/bot_monitors/newSale")(client, message);
    }

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

    if (!command) return;

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
