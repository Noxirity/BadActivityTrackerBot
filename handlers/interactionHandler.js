require("dotenv").config();
const { getFiles } = require("../util/functions");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const { CLIENT_ID, GUILD_ID } = require("../util/config.json");
const path = require("path");
const fs = require("fs");

module.exports = (client) => {
  const commandArray = [];
  const guildCommandArrays = {};
  //! Slash Command Files.

  const slashCommandFiles = getFiles("./Interactions/slashCommands");
  for (const slashCommand of slashCommandFiles) {
    const absoluteSlashCommand = path.resolve(slashCommand);
    const slashCommandFile = require(absoluteSlashCommand);
    console.log(`Processing command: ${absoluteSlashCommand}`);

    // Check if the command is in a "private" folder
    if (
      absoluteSlashCommand.includes(
        path.join("Interactions", "slashCommands", "private")
      )
    ) {
      // Extract the guild ID from the path
      const pathParts = absoluteSlashCommand.split(path.sep);
      const guildIdIndex = pathParts.indexOf("private") + 1;
      const guildId = pathParts[guildIdIndex];
      console.log(`Guild ID: ${guildId}`);

      if (!guildCommandArrays[guildId]) {
        guildCommandArrays[guildId] = [];
      }

      guildCommandArrays[guildId].push(slashCommandFile.data.toJSON());
    } else {
      commandArray.push(slashCommandFile.data.toJSON());
    }

    client.slashCommands.set(slashCommandFile.data.name, slashCommandFile);
    console.log(`[Slash] ${slashCommandFile.data.name} has been loaded.`);
  }
  //! Context Menu Files.
  const contextMenuFiles = getFiles("./Interactions/contextMenus");
  for (const contextMenu of contextMenuFiles) {
    const contextMenuFile = require(contextMenu);
    client.slashCommands.set(contextMenuFile.data.name, contextMenuFile);
    commandArray.push(contextMenuFile.data.toJSON());
    console.log(
      `\x1b[38;2;248;150;30m[ContextMenu] \x1b[32m${contextMenuFile.data.name}\x1b[0m has been loaded.`
    );
  }
  //! Button Files.
  const buttonFiles = getFiles("./Interactions/buttons");
  for (const button of buttonFiles) {
    let buttonFile = require(button);
    client.buttons.set(buttonFile.name, buttonFile);
    console.log(
      `\x1b[38;2;249;199;79m[Buttons] \x1b[32m${buttonFile.name}\x1b[0m has been loaded.`
    );
  }
  //! Select Menus Files.
  const selectMenuFiles = getFiles("./Interactions/selectMenus");
  for (const selectMenu of selectMenuFiles) {
    let selectMenuFile = require(selectMenu);
    client.selectMenus.set(selectMenuFile.name, selectMenuFile);
    console.log(
      `\x1b[38;2;144;190;109m[SelectMenus] \x1b[32m${selectMenuFile.name}\x1b[0m has been loaded.`
    );
  }
  //! Modal Files.
  const modalFiles = getFiles("./Interactions/modals");
  for (const modal of modalFiles) {
    let modalFile = require(modal);
    client.modals.set(modalFile.name, modalFile);
    console.log(
      `\x1b[38;2;67;170;139m[Modals] \x1b[32m${modalFile.name}\x1b[0m has been loaded.`
    );
  }
  const rest = new REST({ version: "9" }).setToken(process.env.BOT_TOKEN);
  (async () => {
    try {
      // Deploy global commands
      await rest.put(Routes.applicationCommands(CLIENT_ID), {
        body: commandArray,
      });

      // Deploy guild-specific commands
      for (const guildId in guildCommandArrays) {
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, guildId), {
          body: guildCommandArrays[guildId],
        });
      }
    } catch (error) {
      console.error(error);
    }
  })();
};
