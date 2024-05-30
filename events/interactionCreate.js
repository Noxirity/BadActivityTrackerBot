const { cooldown, permissions, roles } = require("../util/functions");

module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(interaction, client) {
    if (interaction.isCommand() || interaction.isContextMenuCommand())
      slashInteraction(interaction, client);
    else if (interaction.isButton()) buttonInteraction(interaction, client);
    else if (interaction.isStringSelectMenu())
      selectMenuInteraction(interaction, client);
    else if (interaction.isModalSubmit()) modalInteraction(interaction, client);
    else if (interaction.isAutocomplete()) autocomplete(interaction, client);
  },
};

//! Slash Commands / Context Menus.
async function slashInteraction(interaction, client) {
  const slashCommand = client.slashCommands.get(interaction.commandName);
  if (!slashCommand) {
    return interaction.reply({
      content: "`An error has occurred.`",
      ephemeral: true,
    });
  }
  //? Slash Command Permissions.
  if (slashCommand.permissions && slashCommand.permissions.length) {
    if (permissions(interaction, slashCommand)) {
      return;
    }
  }

  //? Slash Command Roles.
  if (slashCommand.roles && slashCommand.roles.length) {
    if (roles(interaction, slashCommand)) {
      return;
    }
  }

  //? Slash Command Cooldown.
  if (slashCommand.cooldown) {
    if (cooldown(interaction, slashCommand, interaction.user.id, client)) {
      return;
    }
  }
  //- Execute Slash Command.
  try {
    await slashCommand.execute(interaction, client);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "`An error has occurred while executing this command.`",
      ephemeral: true,
    });
  }
}

//! Buttons.
async function buttonInteraction(interaction, client) {
  if (interaction.customId.startsWith(".panel")) {
    return require("../services/panelService")(interaction, client);
  } else if (interaction.customId.startsWith(".")) {
    return interaction.deferUpdate();
  }

  const button =
    client.buttons.get(interaction.customId) ||
    client.buttons.find(
      (button) =>
        button.aliases && button.aliases.includes(interaction.customId)
    );
  if (!button) {
    return interaction.reply({
      content: "`An error has occurred.`",
      ephemeral: true,
    });
  }

  if (button.permissions && button.permissions.length) {
    if (permissions(interaction, button)) {
      return;
    }
  }
  if (button.roles && button.roles.length) {
    if (roles(interaction, button)) {
      return;
    }
  }
  if (button.cooldown) {
    if (cooldown(interaction, button, interaction.user.id, client)) {
      return;
    }
  }

  //- Execute Button.
  try {
    await button.execute(interaction, client);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "`An error has occurred while executing this command.`",
      ephemeral: true,
    });
  }
}

//! Select Menus.
async function selectMenuInteraction(interaction, client) {
  if (interaction.customId.startsWith(".panel")) {
    return require("../services/panelService")(interaction, client);
  } else if (interaction.customId.startsWith(".")) {
    return interaction.deferUpdate();
  }

  const selectMenu = client.selectMenus.get(interaction.customId);
  if (!selectMenu) {
    return interaction.reply({
      content: "`An error has occurred.`",
      ephemeral: true,
    });
  }
  try {
    await selectMenu.execute(interaction, client);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "`An error has occurred while executing this command.`",
      ephemeral: true,
    });
  }
}

//! Modals.
async function modalInteraction(interaction, client) {
  const modal =
    client.modals.get(interaction.customId) ||
    client.modals.find(
      (modal) => modal.aliases && modal.aliases.includes(interaction.customId)
    );
  if (!modal) {
    return interaction.reply({
      content: "`An error has occurred.`",
      ephemeral: true,
    });
  }
  try {
    await modal.execute(interaction, client);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "`An error has occurred while executing this command.`",
      ephemeral: true,
    });
  }
}

//? Autocomplete
async function autocomplete(interaction, client) {
  const command = client.slashCommands.get(interaction.commandName);
  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.autocomplete(interaction);
  } catch (error) {
    console.error(error);
  }
}
