const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("private")
    .setDescription("This is a private command."),
  async execute(interaction, client) {
    interaction.reply("The private command was executed!")
  },
};