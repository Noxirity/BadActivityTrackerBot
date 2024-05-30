const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const databaseService = require("./databaseService");
const { COLOURS } = require(`../util/config.json`);

module.exports = async function (interaction, client) {
  const database = await databaseService.getDatabase("DiscordServer");
  const collection = database.collection("IrityPanels");
  const ids = interaction.customId.split(":");
  const panelId = ids[1];
  const buttonId = ids[2];
  const panel = await collection.findOne({ panelId });

  if (!panel) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setDescription(
            `<:tt_mp:1182425203679170600> This button's panel has been deleted.`
          )
          .setColor(COLOURS.red),
      ],
      ephemeral: true,
    });
  }

  let panel_bind_id = null;
  if (buttonId !== "dropdown") {
    const all_buttons = panel.buttons;
    const button = all_buttons.find((button) => button.button_id === buttonId);

    if (!button) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `<:tt_mp:1182425203679170600> This button has been deleted.`
            )
            .setColor(COLOURS.red),
        ],
        ephemeral: true,
      });
    }

    panel_bind_id = button.panel_bind;
  } else {
    // Dropdown
    const selected_id = interaction.values[0].split(":")[2];
    const all_dropdowns = panel.dropdown;
    const dropdown = all_dropdowns.find(
      (dropdown) => dropdown.dropdown_id === selected_id
    );

    if (!dropdown) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `<:tt_mp:1182425203679170600> This dropdown has been deleted.`
            )
            .setColor(COLOURS.red),
        ],
        ephemeral: true,
      });
    }

    panel_bind_id = dropdown.panel_bind;
  }

  if (!panel_bind_id) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setDescription(
            `<:tt_mp:1182425203679170600> This ${
              buttonId !== "dropdown" ? "button" : "dropdown"
            } has no panel bind.`
          )
          .setColor(COLOURS.red),
      ],
      ephemeral: true,
    });
  }

  const panel_bind = await collection.findOne({ panelId: panel_bind_id });
  if (!panel_bind) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setDescription(
            `<:tt_mp:1182425203679170600> This ${
              buttonId !== "dropdown" ? "button" : "dropdown"
            }'s panel bind has been deleted.`
          )
          .setColor(COLOURS.red),
      ],
      ephemeral: true,
    });
  }

  let { panelMessage, buttons } = panel_bind;
  let components = [];
  buttons = buttons || [];

  if (buttons.length > 0) {
    const actionRow = new ActionRowBuilder();
    let button_array = [];
    for (const button of buttons) {
      button_array.push(ButtonBuilder.from(button.json));
    }

    actionRow.addComponents(...button_array);
    components.push(actionRow);
  }

  const placeholders = {
    "{{ping}}": `<@${interaction.user.id}>`,
    "{{user}}": interaction.user.tag,
    "{{server}}": interaction.guild.name,
  };

  function replacePlaceholdersInText(text, placeholders) {
    for (const key in placeholders) {
      text = text.replace(new RegExp(key, "g"), placeholders[key]);
    }
    return text;
  }

  function replacePlaceholdersInEmbed(embed, placeholders) {
    embed.description = replacePlaceholdersInText(
      embed.description,
      placeholders
    );

    if (embed.fields) {
      for (const field of embed.fields) {
        field.name = replacePlaceholdersInText(field.name, placeholders);
        field.value = replacePlaceholdersInText(field.value, placeholders);
      }
    }

    if (embed.footer) {
      embed.footer.text = replacePlaceholdersInText(
        embed.footer.text,
        placeholders
      );
    }

    if (embed.author) {
      embed.author.name = replacePlaceholdersInText(
        embed.author.name,
        placeholders
      );
    }

    if (embed.title) {
      embed.title = replacePlaceholdersInText(embed.title, placeholders);
    }
  }

  for (const key in placeholders) {
    if (panelMessage.content) {
      panelMessage.content = replacePlaceholdersInText(
        panelMessage.content,
        placeholders
      );
    }

    if (panelMessage.embeds) {
      for (const embed of panelMessage.embeds) {
        replacePlaceholdersInEmbed(embed, placeholders);
      }
    }
  }

  await interaction.reply({
    content: panelMessage.content || "",
    embeds: panelMessage.embeds,
    components,
    ephemeral: true,
  });
};
