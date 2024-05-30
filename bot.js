require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Collection,
  Partials,
} = require("discord.js");
const client = new Client({
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember],
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

client.commands = new Collection();
client.buttons = new Collection();
client.selectMenus = new Collection();
client.modals = new Collection();
client.slashCommands = new Collection();
client.cooldowns = new Collection();

["commandHandler.js", "interactionHandler.js", "eventHandler.js"].forEach(
  (handler) => {
    require(`./handlers/${handler}`)(client);
  }
);

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

client.login(process.env.BOT_TOKEN);

module.exports = {
  client,
};