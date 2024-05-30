const databaseService = require("../services/databaseService");
const embeds = require("../util/embed");
const {
  EmbedBuilder,
  ButtonStyle,
  ButtonBuilder,
  ActionRowBuilder,
  StringSelectMenuOptionBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

const SEND_COMMAND = "-send";
const CREATE_COMMAND = "-create";
const EDIT_COMMAND = "-edit";
const DELETE_COMMAND = "-delete";
const DEV_COMMAND = "-dev";

module.exports = {
  name: "panel",
  description: "Create a panel for your server",
  permissions: ["ADMINISTRATOR"],
  async execute(message, client, args, commandPrefix) {
    const database = await databaseService.getDatabase("DiscordServer");
    const panels = database.collection("IrityPanels");

    const [arg1, arg2] = args;

    switch (arg1) {
      case SEND_COMMAND:
        await handleSendCommand(arg2, panels, message, args, client);
        break;
      case CREATE_COMMAND:
        await handleCreateCommand(panels, message, args, client);
        break;
      case EDIT_COMMAND:
        await handleEditCommand(arg2, panels, message, args, client);
        break;
      case DELETE_COMMAND:
        await handleDeleteCommand(arg2, panels, message, args, client);
        break;
      case DEV_COMMAND:
        await handleDevCommand(message, args, client);
        break;
      default:
        embeds.errorEmbed(
          message,
          `Invalid command. See documentation for help.`,
          null,
          false
        );
        break;
    }
  },
};

async function handleDevCommand(message, args, client) {
  let [panelId, option] = args.slice(1);

  if (option === undefined) {
    option = panelId; // if option is not provided, set it to panelId
  }

  const database = await databaseService.getDatabase("DiscordServer");
  const panels = database.collection("IrityPanels");
  const panel = await panels.findOne({ panelId });

  if (option === "-interactions") {
    if (!panel) {
      embeds.errorEmbed(message, "Panel not found.", null, false);
      return;
    }

    const buttons = panel.buttons || [];
    const dropdowns = panel.dropdown || [];

    let button_list = "";
    let dropdown_list = "";

    for (const button of buttons) {
      button_list += `${button.button_id}\n> Label: \`${
        button.json.label
      }\`\n> Bound to ${`\`${button.panel_bind}\`` || "**Nothing**"}\n`;
    }

    for (const dropdown of dropdowns) {
      dropdown_list += `${dropdown.dropdown_id}\n> Label: \`${
        dropdown.json.label
      }\`\n> Description: \`${
        dropdown.json.description || "None"
      }\`\n> Bound to ${`\`${dropdown.panel_bind}\`` || "**Nothing**"}\n`;
    }

    const embed = new EmbedBuilder()
      .setTitle("Panel Information")
      .addFields(
        {
          name: "Buttons",
          value: button_list || "No buttons",
          inline: true,
        },
        {
          name: "Dropdowns",
          value: dropdown_list || "No dropdowns",
          inline: true,
        }
      )
      .setColor("#7653ff");

    message.reply({ embeds: [embed] });
  } else if (option === "-customize") {
    if (!panel) {
      embeds.errorEmbed(message, "Panel not found.", null, false);
      return;
    }

    let message_json = panel.panelMessage;

    if (message_json.content === undefined) {
      message_json.content = null;
    }

    if (message_json.embeds) {
      for (const embed of message_json.embeds) {
        const footer = embed.footer;
        if (!footer) continue;

        if (footer.icon_url === null) {
          delete footer.icon_url;
        }
      }
    }

    message_json.attachments = [];

    message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Raw Panel JSON")
          .setDescription(
            `Go to [discohook](https://discohook.org/) and paste the following JSON to customize the panel message.\n\`\`\`json\n${JSON.stringify(
              message_json
            )}\n\`\`\``
          )
          .setColor("#7653ff"),
      ],
    });
  } else if (option === "-all") {
    // get all panels
    const all_panels = await panels
      .find({}, { projection: { panelId: 1 } })
      .toArray();
    let panel_list = "";
    let i = 0;
    for (const panel of all_panels) {
      i++;
      panel_list += `**${i}.** \`${panel.panelId}\`\n`;
    }

    const embed = new EmbedBuilder()
      .setTitle("All Panels")
      .setDescription(panel_list || "No panels found.")
      .setColor("#7653ff");

    message.reply({ embeds: [embed] });
  } else {
    embeds.errorEmbed(
      message,
      "Invalid option. Please use `-interactions`, `-customize`, or `-all`.",
      null,
      false
    );
  }
}

async function handleSendCommand(panelId, panels, message) {
  const panel = await panels.findOne({ panelId });
  if (!panel) {
    message.channel.send("Panel not found.");
    return;
  }

  let { panelMessage, buttons, dropdown } = panel;
  let components = [];
  buttons = buttons || [];
  dropdown = dropdown || [];

  if (buttons.length > 0) {
    const actionRow = new ActionRowBuilder();
    let button_array = [];
    for (const button of buttons) {
      button_array.push(ButtonBuilder.from(button.json));
    }

    actionRow.addComponents(...button_array);
    components.push(actionRow);
  }

  if (dropdown.length > 0) {
    const actionRow = new ActionRowBuilder();
    const dropdown_menu = new StringSelectMenuBuilder()
      .setCustomId(`.panel-bind:${panelId}:dropdown`)
      .setMaxValues(1)
      .setMinValues(1)
      .setPlaceholder("Click here to preview.");
    let dropdown_array = [];
    for (const d of dropdown) {
      dropdown_array.push(StringSelectMenuOptionBuilder.from(d.json));
    }

    console.log(dropdown_array);

    dropdown_menu.addOptions(dropdown_array);
    actionRow.addComponents(dropdown_menu);
    components.push(actionRow);
  }

  // loop through every string in the embeds array and content and replace the placeholders
  const placeholders = {
    "{{ping}}": `<@${message.author.id}>`,
    "{{user}}": message.author.tag,
    "{{server}}": message.guild.name,
  };

  function replacePlaceholdersInText(text, placeholders) {
    if (!text) return;
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

  await message.channel.send({
    content: panelMessage.content || "",
    embeds: panelMessage.embeds,
    components,
  });
  message.react("✅");
}

async function handleCreateCommand(panels, message, args) {
  const panelId = args.slice(1).join(" ");

  if (panelId.includes(" ")) {
    embeds.errorEmbed(
      message,
      "Panel name cannot contain spaces. Please use `-` or `_` instead.",
      null,
      false
    );
    return;
  }

  if (panelId) {
    const panel = await panels.findOne({ panelId: panelId });
    if (panel) {
      embeds.errorEmbed(
        message,
        "A panel with that name already exists.",
        null,
        false
      );
      return;
    }
  } else {
    embeds.errorEmbed(message, "Please provide a panel name.", null, false);
    return;
  }

  const templateMessage = new EmbedBuilder()
    .setTitle("Peekaboo 👀")
    .setDescription(
      `You haven't customised this panel yet.

  Get started by  running the following command:
  > \`>>panel -edit ${panelId}\``
    )
    .setFooter({
      text: "If for some reason you need to use this but haven't been taught how, contact frrazer",
    })
    .setColor("#7653ff");

  await panels.insertOne({
    panelId,
    panelMessage: {
      embeds: [templateMessage.toJSON()],
    },
  });

  embeds.successEmbed(
    message,
    `Panel created! Get started by running \`>>panel -edit ${panelId}\``,
    null,
    false
  );
  return;
}

async function handleEditCommand(panelId, panels, message, args) {
  const panel = await panels.findOne({ panelId });
  if (!panel) {
    embeds.errorEmbed(message, "Panel not found.", null, false);
    return;
  }

  // lets get arg3 and arg4
  const [arg3] = args.slice(2);

  switch (arg3) {
    case "-add-button":
      await handleAddButtonCommand(panelId, panels, message, args);
      break;
    case "-add-dropdown":
      await handleAddDropdownCommand(panelId, panels, message, args);
      break;
    case "-bind":
      await handleBindPanelCommand(panelId, panels, message, args);
      break;
    case "-unbind":
      await handleUnbindPanelCommand(panelId, panels, message, args);
      break;
    case "-del-button":
      await handleDeleteButtonCommand(panelId, panels, message, args);
      break;
    case "-del-dropdown":
      await handleDeleteDropdownCommand(panelId, panels, message, args);
      break;
  }

  if (arg3) {
    return;
  }

  const ask_msg = await embeds.neutralEmbed(
    message,
    "Please provide the new panel message in JSON format. You can use [discohook](https://discohook.org/) to generate messages.",
    false
  );

  const filter = (m) => m.author.id === message.author.id;
  const collector = message.channel.createMessageCollector({
    filter,
    time: 60000,
  });

  let messages_to_delete = [ask_msg];
  collector.on("collect", async (m) => {
    if (m.author.id !== message.author.id) return;
    collector.stop();
    ask_msg.edit({
      embeds: [
        new EmbedBuilder()
          .setDescription("<:tt_box:1238796231199821916> Validating JSON... ")
          .setColor("#242824"),
      ],
    });

    messages_to_delete.push(m);

    try {
      const json = JSON.parse(m.content);
      const msg = await m.channel.send(json);
      msg.delete();

      await panels.updateOne(
        { panelId },
        { $set: { panelMessage: JSON.parse(m.content) } }
      );

      for (const msg of messages_to_delete) {
        msg.delete();
      }
      messages_to_delete = [];

      embeds.successEmbed(message, "Panel message updated.", null, false);
    } catch (error) {
      const invalid_msg = await embeds.errorEmbed(
        message,
        "Invalid JSON. Please run the command again and provide valid JSON.",
        null,
        false
      );

      setTimeout(() => {
        for (const msg of messages_to_delete) {
          msg.delete();
        }
      }, 2000);
    }
  });

  collector.on("end", async (collected, reason) => {
    if (reason === "time") {
      embeds.errorEmbed(
        message,
        "You took too long to respond. Panel message update canceled.",
        null,
        false
      );
      for (const msg of messages_to_delete) {
        msg.delete();
      }
    }
  });
}

async function handleDeleteCommand(panelId, panels, message) {
  const panel = await panels.findOne({ panelId });
  if (!panel) {
    embeds.errorEmbed(message, "Panel not found.", null, false);
    return;
  }

  let messages_to_delete = [];
  const ask_msg = await embeds.errorEmbed(
    message,
    "Are you sure you want to delete this panel? This action cannot be undone. React with ✅ to confirm, or ❌ to cancel.",
    false
  );
  messages_to_delete.push(ask_msg);

  ask_msg.react("✅");
  ask_msg.react("❌");

  const filter = (reaction, user) => {
    return user.id === message.author.id;
  };

  const collector = ask_msg.createReactionCollector({
    filter,
    time: 60000,
  });
  collector.on("collect", async (reaction, user) => {
    if (user.id !== message.author.id) return;

    if (reaction.emoji.name === "✅") {
      await panels.deleteOne({ panelId });
      embeds.successEmbed(message, "Panel deleted.", null, false);
    } else {
      embeds.errorEmbed(message, "Panel deletion canceled.", null, false);
    }

    for (const msg of messages_to_delete) {
      msg.delete();
    }
  });

  collector.on("end", async (collected, reason) => {
    if (reason === "time") {
      embeds.errorEmbed(
        message,
        "You took too long to respond. Panel deletion canceled.",
        null,
        false
      );
      for (const msg of messages_to_delete) {
        msg.delete();
      }
    }
  });
}

async function handleAddButtonCommand(panelId, panels, message) {
  let label;
  let style;
  let url;
  let emoji;

  let messages_to_delete = [];
  const label_msg = await embeds.neutralEmbed(
    message,
    "What should the button text be?",
    false
  );

  let filter = (m) => m.author.id === message.author.id;
  let collector = message.channel.createMessageCollector({
    filter,
    time: 60000,
  });

  messages_to_delete.push(label_msg);

  let resolveLabelPromise;
  const labelPromise = new Promise((resolve) => {
    resolveLabelPromise = resolve;
  });

  collector.on("collect", async (m) => {
    if (m.author.id !== message.author.id) return;

    const content = m.content;
    if (content.length > 80 || content.length < 1) {
      const invalid_msg = await embeds.errorEmbed(
        message,
        "Button text is too long or no text was provided. Please try again.",
        null,
        false
      );
      messages_to_delete.push(invalid_msg);
      return;
    }

    collector.stop();
    messages_to_delete.push(m);
    label = content;
    resolveLabelPromise();
  });

  collector.on("end", resolveLabelPromise);

  // wait until label is not null or the collector ends
  await labelPromise;
  // lets delete the messages
  for (const msg of messages_to_delete) {
    msg.delete();
  }
  messages_to_delete = [];

  // ask for style
  const style_msg = await message.reply({
    embeds: [
      new EmbedBuilder()
        .setDescription(
          "<:tt_box:1238796231199821916> Select a style for the button by replying with one of the following colours."
        )
        .setColor("#242824"),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Primary)
          .setCustomId(".primary")
          .setLabel("Blue"),
        new ButtonBuilder()
          .setStyle(ButtonStyle.Secondary)
          .setCustomId(".secondary")
          .setLabel("Grey"),
        new ButtonBuilder()
          .setStyle(ButtonStyle.Success)
          .setCustomId(".success")
          .setLabel("Green"),
        new ButtonBuilder()
          .setStyle(ButtonStyle.Danger)
          .setCustomId(".danger")
          .setLabel("Red"),
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel("Link")
          .setURL("https://noxirity.com/")
      ),
    ],
  });

  filter = (m) => m.author.id === message.author.id;
  collector = style_msg.channel.createMessageCollector({
    filter,
    time: 60000,
  });

  messages_to_delete.push(style_msg);

  let resolveStylePromise;
  const stylePromise = new Promise((resolve) => {
    resolveStylePromise = resolve;
  });

  const valid_style_choices = {
    blue: ButtonStyle.Primary,
    grey: ButtonStyle.Secondary,
    green: ButtonStyle.Success,
    red: ButtonStyle.Danger,
    link: ButtonStyle.Link,
  };

  collector.on("collect", async (m) => {
    if (m.author.id !== message.author.id) return;
    const content = m.content.toLowerCase();
    if (!valid_style_choices[content]) {
      const invalid_msg = await embeds.errorEmbed(
        message,
        "Invalid style choice. Please try again.",
        null,
        false
      );
      messages_to_delete.push(invalid_msg);
      return;
    }

    collector.stop();
    messages_to_delete.push(m);
    style = valid_style_choices[content];
    resolveStylePromise();
  });

  collector.on("end", resolveStylePromise);
  await stylePromise;

  for (const msg of messages_to_delete) {
    msg.delete();
  }
  messages_to_delete = [];

  // ask for url if style is LINK
  if (style === ButtonStyle.Link) {
    const url_msg = await embeds.neutralEmbed(
      message,
      "Please provide the URL for the link button.",
      false
    );
    filter = (m) => m.author.id === message.author.id;
    collector = message.channel.createMessageCollector({
      filter,
      time: 60000,
    });

    messages_to_delete.push(url_msg);

    let resolveUrlPromise;
    const urlPromise = new Promise((resolve) => {
      resolveUrlPromise = resolve;
    });

    collector.on("collect", async (m) => {
      if (m.author.id !== message.author.id) return;
      const content = m.content;
      if (!content.startsWith("http")) {
        const invalid_msg = await m.reply("Invalid URL.");
        messages_to_delete.push(invalid_msg);
        return;
      }

      collector.stop();
      messages_to_delete.push(m);
      url = content;
      resolveUrlPromise();
    });

    collector.on("end", resolveUrlPromise);
    await urlPromise;

    for (const msg of messages_to_delete) {
      msg.delete();
    }
    messages_to_delete = [];
  }

  // ask for emoji
  const emoji_msg = await embeds.neutralEmbed(
    message,
    "React with an emoji to add an emoji to the button. React with 🚩 if you don't want to add an emoji.",
    false
  );
  filter = (reaction, user) => {
    return user.id === message.author.id;
  };
  collector = emoji_msg.createReactionCollector({
    filter,
    time: 60000,
  });
  messages_to_delete.push(emoji_msg);
  emoji_msg.react("🚩");

  let resolveEmojiPromise;
  const emojiPromise = new Promise((resolve) => {
    resolveEmojiPromise = resolve;
  });

  collector.on("collect", async (reaction, user) => {
    if (user.id !== message.author.id) return;
    if (reaction.emoji.name === "🚩") {
      collector.stop();
      emoji = null;
    } else {
      collector.stop();
      if (reaction.emoji.id === null || reaction.emoji.id === undefined) {
        emoji = reaction.emoji.name;
      } else {
        emoji = `<${reaction.emoji.animated ? "a" : ""}:${
          reaction.emoji.name
        }:${reaction.emoji.id}>`;
      }
    }

    resolveEmojiPromise();
  });

  collector.on("end", resolveEmojiPromise);
  await emojiPromise;

  for (const msg of messages_to_delete) {
    msg.delete();
  }
  messages_to_delete = [];

  const button = new ButtonBuilder().setStyle(style).setLabel(label);

  if (style === ButtonStyle.Link) {
    button.setURL(url);
  } else {
    button.setCustomId(".button");
  }

  if (emoji) {
    button.setEmoji(emoji);
  }

  const preview_msg = await message.reply({
    embeds: [
      new EmbedBuilder()
        .setDescription(
          "<:tt_box:1238796231199821916> Here is the button preview. React with ✅ to confirm or ❌ to cancel."
        )
        .setColor("#242824"),
    ],
    components: [new ActionRowBuilder().addComponents(button)],
  });

  preview_msg.react("✅");
  await preview_msg.react("❌");
  messages_to_delete.push(preview_msg);

  const previewFilter = (reaction, user) => {
    return (
      ["✅", "❌"].includes(reaction.emoji.name) &&
      user.id === message.author.id
    );
  };

  collector = preview_msg.createReactionCollector({
    filter: previewFilter,
    time: 60000,
  });

  let canceled = false;
  let resolveConfirmPromise;
  const confirmPromise = new Promise((resolve) => {
    resolveConfirmPromise = resolve;
  });

  collector.on("collect", async (reaction, user) => {
    if (user.id !== message.author.id) return;
    if (reaction.emoji.name === "✅") {
      collector.stop();
    } else if (reaction.emoji.name === "❌") {
      canceled = true;
      collector.stop();
    }

    resolveConfirmPromise();
  });

  collector.on("end", resolveConfirmPromise);
  await confirmPromise;

  for (const msg of messages_to_delete) {
    msg.delete();
  }
  messages_to_delete = [];

  if (canceled) {
    return embeds.errorEmbed(message, "Button creation canceled.", null, false);
  }

  // ask for button id
  let buttonId;
  const id_msg = await embeds.neutralEmbed(
    message,
    "What should the button name be? (This will be used to bind the button to a panel)",
    "The button name will not be shown to users.",
    false
  );
  filter = (m) => m.author.id === message.author.id;
  collector = message.channel.createMessageCollector({
    filter,
    time: 60000,
  });

  messages_to_delete.push(id_msg);

  let resolveIdPromise;
  const idPromise = new Promise((resolve) => {
    resolveIdPromise = resolve;
  });

  collector.on("collect", async (m) => {
    if (m.author.id !== message.author.id) return;
    const content = m.content;
    if (content.length > 80 || content.length < 1) {
      const invalid_msg = await embeds.errorEmbed(
        message,
        "Button name is too long or no text was provided. Please try again.",
        null,
        false
      );
      messages_to_delete.push(invalid_msg);
      return;
    }

    if (content.includes(" ")) {
      embeds.errorEmbed(
        message,
        "Button name cannot contain spaces. Please use `-` or `_` instead.",
        null,
        false
      );
      return;
    }

    collector.stop();
    messages_to_delete.push(m);
    buttonId = content;
    resolveIdPromise();
  });

  collector.on("end", resolveIdPromise);
  await idPromise;

  for (const msg of messages_to_delete) {
    msg.delete();
  }
  messages_to_delete = [];

  // check if button id already exists
  const panel = await panels.findOne({ panelId });
  const buttons = panel.buttons || [];
  let baseButtonId = buttonId.split("#")[0];
  let buttons_with_same_id = buttons.filter(
    (b) => b.button_id.split("#")[0] === baseButtonId
  );
  if (buttons_with_same_id.length > 0) {
    buttonId = `${baseButtonId}#${buttons_with_same_id.length + 1}`;
  }

  if (style !== ButtonStyle.Link) {
    button.setCustomId(`.panel-bind:${panelId}:${buttonId}`);
  }

  const button_json = button.toJSON();
  panels.updateOne(
    { panelId },
    {
      $push: {
        buttons: {
          json: button_json,
          panel_bind: null,
          button_id: buttonId,
        },
      },
    }
  );

  embeds.successEmbed(
    message,
    `Button created! Button ID: \`${buttonId}\``,
    null,
    false
  );
}

async function handleBindPanelCommand(panelId, panels, message, args) {
  const button_id = args[3];
  const panel_to_bind_id = args[4];

  const panel = await panels.findOne({ panelId });
  const panel_to_bind = await panels.findOne({ panelId: panel_to_bind_id });
  if (!panel) {
    embeds.errorEmbed(message, "Panel not found.", null, false);
    return;
  }

  if (!panel_to_bind) {
    embeds.errorEmbed(message, "Panel to bind not found.", null, false);
    return;
  }

  const buttons = panel.buttons || [];
  const dropdowns = panel.dropdown || [];

  const button = buttons.find((b) => b.button_id === button_id);
  const dropdown = dropdowns.find((d) => d.dropdown_id === button_id);

  if (!button && !dropdown) {
    embeds.errorEmbed(message, "Interaction not found in panel.", null, false);
    return;
  }

  if (button) {
    panels.updateOne(
      { panelId },
      {
        $set: {
          "buttons.$[elem].panel_bind": panel_to_bind_id,
        },
      },
      {
        arrayFilters: [{ "elem.button_id": button_id }],
      }
    );
  } else {
    panels.updateOne(
      { panelId },
      {
        $set: {
          "dropdown.$[elem].panel_bind": panel_to_bind_id,
        },
      },
      {
        arrayFilters: [{ "elem.dropdown_id": button_id }],
      }
    );
  }

  embeds.successEmbed(
    message,
    `Bound ${button ? "button" : "dropdown"} to \`${panel_to_bind_id}\`.`,
    null,
    false
  );
}

async function handleUnbindPanelCommand(panelId, panels, message, args) {
  const button_id = args[3];

  const panel = await panels.findOne({ panelId });
  if (!panel) {
    embeds.errorEmbed(message, "Panel not found.", null, false);
    return;
  }

  const buttons = panel.buttons || [];
  const dropdowns = panel.dropdown || [];

  const button = buttons.find((b) => b.button_id === button_id);
  const dropdown = dropdowns.find((d) => d.dropdown_id === button_id);

  if (!button && !dropdown) {
    embeds.errorEmbed(message, "Interaction not found in panel.", null, false);
    return;
  }

  if (button) {
    panels.updateOne(
      { panelId },
      {
        $set: {
          "buttons.$[elem].panel_bind": null,
        },
      },
      {
        arrayFilters: [{ "elem.button_id": button_id }],
      }
    );
  } else {
    panels.updateOne(
      { panelId },
      {
        $set: {
          "dropdown.$[elem].panel_bind": null,
        },
      },
      {
        arrayFilters: [{ "elem.dropdown_id": button_id }],
      }
    );
  }

  embeds.successEmbed(
    message,
    `Unbound ${button ? "button" : "dropdown"} from \`${panelId}\`.`,
    null,
    false
  );
}

async function handleDeleteButtonCommand(panelId, panels, message, args) {
  const button_id = args[3];

  const panel = await panels.findOne({ panelId });
  if (!panel) {
    embeds.errorEmbed(message, "Panel not found.", null, false);
    return;
  }

  const button = panel.buttons.find((b) => b.button_id === button_id);
  if (!button) {
    embeds.errorEmbed(message, "Button not found.", null, false);
    return;
  }

  panels.updateOne(
    { panelId },
    {
      $pull: {
        buttons: {
          button_id,
        },
      },
    }
  );

  embeds.successEmbed(message, "Button deleted.", null, false);
}

async function handleDeleteDropdownCommand(panelId, panels, message, args) {
  const dropdown_id = args[3];

  const panel = await panels.findOne({ panelId });
  if (!panel) {
    embeds.errorEmbed(message, "Panel not found.", null, false);
    return;
  }

  const dropdown = panel.dropdown.find((d) => d.dropdown_id === dropdown_id);
  if (!dropdown) {
    embeds.errorEmbed(message, "Dropdown not found.", null, false);
    return;
  }

  panels.updateOne(
    { panelId },
    {
      $pull: {
        dropdown: {
          dropdown_id,
        },
      },
    }
  );

  embeds.successEmbed(message, "Dropdown deleted.", null, false);
}

async function handleAddDropdownCommand(panelId, panels, message) {
  let label;
  let description; // optional
  let emoji; // optional

  let messages_to_delete = [];
  const label_msg = await embeds.neutralEmbed(
    message,
    "What should the dropdown label be?",
    false
  );

  let filter = (m) => m.author.id === message.author.id;
  let collector = message.channel.createMessageCollector({
    filter,
    time: 60000,
  });

  messages_to_delete.push(label_msg);

  let resolveLabelPromise;
  const labelPromise = new Promise((resolve) => {
    resolveLabelPromise = resolve;
  });

  collector.on("collect", async (m) => {
    if (m.author.id !== message.author.id) return;

    const content = m.content;
    if (content.length > 80 || content.length < 1) {
      const invalid_msg = await embeds.errorEmbed(
        message,
        "Dropdown label is too long or no text was provided. Please try again.",
        null,
        false
      );
      messages_to_delete.push(invalid_msg);
      return;
    }

    collector.stop();
    messages_to_delete.push(m);
    label = content;
    resolveLabelPromise();
  });

  collector.on("end", resolveLabelPromise);
  await labelPromise;

  for (const msg of messages_to_delete) {
    msg.delete();
  }
  messages_to_delete = [];

  // ask for description
  const description_msg = await embeds.neutralEmbed(
    message,
    "What should the dropdown description be? Reply with `none` if you don't want a description.",
    false
  );
  filter = (m) => m.author.id === message.author.id;
  collector = message.channel.createMessageCollector({
    filter,
    time: 60000,
  });

  messages_to_delete.push(description_msg);

  let resolveDescriptionPromise;
  const descriptionPromise = new Promise((resolve) => {
    resolveDescriptionPromise = resolve;
  });

  collector.on("collect", async (m) => {
    if (m.author.id !== message.author.id) return;
    const content = m.content;
    if (content == "none") {
      description = null;
    } else {
      if (content.length > 80 || content.length < 1) {
        const invalid_msg = await embeds.errorEmbed(
          message,
          "Dropdown description is too long. Please try again.",
          null,
          false
        );
        messages_to_delete.push(invalid_msg);
        return;
      }
    }

    collector.stop();
    messages_to_delete.push(m);
    description = content;
    resolveDescriptionPromise();
  });

  collector.on("end", resolveDescriptionPromise);
  await descriptionPromise;

  for (const msg of messages_to_delete) {
    msg.delete();
  }
  messages_to_delete = [];

  const emoji_msg = await embeds.neutralEmbed(
    message,
    "React with an emoji to add an emoji to the dropdown. React with 🚩 if you don't want to add an emoji.",
    false
  );

  await emoji_msg.react("🚩");

  filter = (reaction, user) => {
    return user.id === message.author.id;
  };
  collector = emoji_msg.createReactionCollector({
    filter,
    time: 60000,
  });
  messages_to_delete.push(emoji_msg);

  let resolveEmojiPromise;
  const emojiPromise = new Promise((resolve) => {
    resolveEmojiPromise = resolve;
  });

  collector.on("collect", async (reaction, user) => {
    if (user.id !== message.author.id) return;
    if (reaction.emoji.name === "🚩") {
      collector.stop();
      emoji = null;
    } else {
      collector.stop();
      if (reaction.emoji.id === null || reaction.emoji.id === undefined) {
        emoji = reaction.emoji.name;
      } else {
        emoji = `<${reaction.emoji.animated ? "a" : ""}:${
          reaction.emoji.name
        }:${reaction.emoji.id}>`;
      }
    }

    resolveEmojiPromise();
  });

  collector.on("end", resolveEmojiPromise);
  await emojiPromise;

  for (const msg of messages_to_delete) {
    msg.delete();
  }
  messages_to_delete = [];

  console.log("creating dropdown");
  const option = new StringSelectMenuOptionBuilder()
    .setLabel(label)
    .setValue("1");
  console.log("set label");

  if (description) {
    option.setDescription(description);
    console.log("set description");
  }

  if (emoji) {
    console.log("setting emoji", emoji);
    option.setEmoji(emoji);
    console.log("set emoji");
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(".dropdown")
    .setPlaceholder("Click here to preview.")
    .addOptions(option);

  const row = new ActionRowBuilder().addComponents(select);

  const preview_msg = await message.reply({
    embeds: [
      new EmbedBuilder()
        .setDescription(
          "<:tt_box:1238796231199821916> Here is the dropdown preview. React with ✅ to confirm or ❌ to cancel."
        )
        .setColor("#242824"),
    ],
    components: [row],
  });

  preview_msg.react("✅");
  await preview_msg.react("❌");
  messages_to_delete.push(preview_msg);

  const previewFilter = (reaction, user) => {
    return (
      ["✅", "❌"].includes(reaction.emoji.name) &&
      user.id === message.author.id
    );
  };

  collector = preview_msg.createReactionCollector({
    filter: previewFilter,
    time: 60000,
  });

  let canceled = false;
  let resolveConfirmPromise;
  const confirmPromise = new Promise((resolve) => {
    resolveConfirmPromise = resolve;
  });

  collector.on("collect", async (reaction, user) => {
    if (user.id !== message.author.id) return;
    if (reaction.emoji.name === "✅") {
      collector.stop();
    } else if (reaction.emoji.name === "❌") {
      canceled = true;
      collector.stop();
    }

    resolveConfirmPromise();
  });

  collector.on("end", resolveConfirmPromise);
  await confirmPromise;

  for (const msg of messages_to_delete) {
    msg.delete();
  }
  messages_to_delete = [];

  if (canceled) {
    return embeds.errorEmbed(
      message,
      "Dropdown creation canceled.",
      null,
      false
    );
  }

  // ask for dropdown id
  let dropdownId;
  const id_msg = await embeds.neutralEmbed(
    message,
    "What should the dropdown name be? (This will be used to bind the dropdown to a panel)",
    "The dropdown name will not be shown to users.",
    false
  );

  filter = (m) => m.author.id === message.author.id;
  collector = message.channel.createMessageCollector({
    filter,
    time: 60000,
  });

  messages_to_delete.push(id_msg);

  let resolveIdPromise;
  const idPromise = new Promise((resolve) => {
    resolveIdPromise = resolve;
  });

  collector.on("collect", async (m) => {
    if (m.author.id !== message.author.id) return;
    const content = m.content;
    if (content.length > 80 || content.length < 1) {
      const invalid_msg = await embeds.errorEmbed(
        message,
        "Dropdown name is too long or no text was provided. Please try again.",
        null,
        false
      );
      messages_to_delete.push(invalid_msg);
      return;
    }

    if (content.includes(" ")) {
      embeds.errorEmbed(
        message,
        "Dropdown name cannot contain spaces. Please use `-` or `_` instead.",
        null,
        false
      );
      return;
    }

    collector.stop();
    messages_to_delete.push(m);
    dropdownId = content;
    resolveIdPromise();
  });

  collector.on("end", resolveIdPromise);
  await idPromise;

  for (const msg of messages_to_delete) {
    msg.delete();
  }
  messages_to_delete = [];

  option.setValue(`.panel-bind:${panelId}:${dropdownId}`);

  panels.updateOne(
    { panelId },
    {
      $push: {
        dropdown: {
          json: option.toJSON(),
          panel_bind: null,
          dropdown_id: dropdownId,
        },
      },
    }
  );

  embeds.successEmbed(
    message,
    `Dropdown created! Dropdown ID: \`${dropdownId}\``,
    null,
    false
  );
}
