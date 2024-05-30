const { MessageEmbed, EmbedBuilder } = require("discord.js");
const { COLOURS } = require(`./config.json`);

//? Error Embed.
async function errorEmbed(
  interaction,
  description,
  footer,
  ephemeral,
  returnEmbed
) {
  const errorEmbed = new EmbedBuilder()
    .setDescription(`<:tt_er:1187754755435548742> ${description}`)
    .setColor(COLOURS.red);

  if (footer) {
    errorEmbed.setFooter({ text: `${footer}` });
  }

  if (returnEmbed) {
    return errorEmbed;
  }

  let message;

  if (interaction.deferred || interaction.replied) {
    message = await interaction.editReply({
      embeds: [errorEmbed],
      allowedMentions: { repliedUser: false },
      ephemeral: ephemeral || false,
      components: [],
    });
  } else {
    message = interaction.reply({
      embeds: [errorEmbed],
      allowedMentions: { repliedUser: false },
      ephemeral: ephemeral || false,
      components: [],
    });
  }

  return message;
}
//? Success Embed.
async function successEmbed(
  interaction,
  description,
  footer,
  ephemeral,
  returnEmbed
) {
  footer = footer || " ";
  const successEmbed = new EmbedBuilder()
    .setDescription(`<:tt_ys:1187754951171125249> ${description}`)
    .setColor(COLOURS.green)
    .setFooter({ text: `${footer}` });

  if (returnEmbed) {
    return successEmbed;
  }

  let message;

  if (interaction.deferred || interaction.replied) {
    message = interaction.editReply({
      embeds: [successEmbed],
      allowedMentions: { repliedUser: false },
      ephemeral: ephemeral || false,
      components: [],
    });
  } else {
    message = interaction.reply({
      embeds: [successEmbed],
      allowedMentions: { repliedUser: false },
      ephemeral: ephemeral || false,
      components: [],
    });
  }

  return message;
}
//? Neutral Embed.
async function neutralEmbed(interaction, description, footer, ephemeral, returnEmbed) {
  footer = footer || " ";
  const neutralEmbed = new EmbedBuilder()
    .setDescription(`<:tt_box:1238796231199821916> ${description}`)
    .setColor("#949494")
    .setFooter({ text: `${footer}` });

  if (returnEmbed) {
    return neutralEmbed;
  }

  let message;

  if (interaction.deferred || interaction.replied) {
    message = interaction.editReply({
      embeds: [neutralEmbed],
      allowedMentions: { repliedUser: false },
      ephemeral: ephemeral || false,
      components: [],
    });
  } else {
    message = interaction.reply({
      embeds: [neutralEmbed],
      allowedMentions: { repliedUser: false },
      ephemeral: ephemeral || false,
      components: [],
    });
  }

  return message;
}

//? Custom Embed.
async function customEmbed(description, color, emoji, thumbnail, footer) {
  if (emoji == undefined) emoji = "";
  if (thumbnail == undefined) thumbnail = "";
  footer = footer || " ";
  const customEmbed = new EmbedBuilder()
    .setDescription(emoji + ` ${description}`)
    .setColor(color)
    .setThumbnail(thumbnail)
    .setFooter({ text: `${footer}` });
  return customEmbed;
}
module.exports = { errorEmbed, successEmbed, customEmbed, neutralEmbed };
