const { readdirSync } = require("fs");
const { PermissionFlagsBits } = require("discord.js");
const { errorEmbed, customEmbed } = require(`./embed`);
const { COLOURS } = require(`./config.json`);
const fs = require("fs");
const path = require("path");

//? Fetch all JS files function.
const getFiles = function (dir, files_) {
  files_ = files_ || [];
  const files = fs.readdirSync(dir);
  for (const i in files) {
    const name = dir + "/" + files[i];
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files_);
    } else {
      files_.push(path.resolve(name)); // resolve to absolute path
    }
  }
  return files_;
};
//? Command cooldown function.
function cooldown(interaction, collection, userID, client) {
  if (client.cooldowns.has(userID)) {
    let timeWord;
    let cooldownTime;
    if (collection.cooldown >= 60000) {
      if (collection.cooldown == 60000) timeWord = "minute";
      else timeWord = "minutes";
      cooldownTime = collection.cooldown / 60000;
    } else {
      if (collection.cooldown == 1000) timeWord = "second";
      else timeWord = "seconds";
      cooldownTime = collection.cooldown / 1000;
    }
    errorEmbed(
      interaction,
      `You are on a \`${cooldownTime}\` ${timeWord} cooldown.`,
      null,
      true
    );
    return true;
  } else {
    client.cooldowns.set(userID);
    setTimeout(() => {
      client.cooldowns.delete(userID);
    }, collection.cooldown);
  }
}
//? Command permissions function.
function permissions(interaction, collection) {
  if (collection.permissions && collection.permissions.length) {
    let invalidPermissionsFlags = [];
    for (let permission of collection.permissions) {
      // make the permission flag lowercase but keep the first letter uppercase
      permission =
        permission.charAt(0).toUpperCase() + permission.slice(1).toLowerCase();
      if (
        !interaction.member.permissions.has(PermissionFlagsBits[permission])
      ) {
        invalidPermissionsFlags.push(permission);
      } else {
        return false;
      }
    }
    errorEmbed(
      interaction,
      `You do not have the \`${invalidPermissionsFlags}\` permission(s).`,
      null,
      true
    );
    return true;
  }
}

function roles(interaction, collection) {
  if (collection.roles && collection.roles.length) {
    let invalidRoles = [];
    for (const role of collection.roles) {
      if (!interaction.member.roles.cache.has(role)) {
        invalidRoles.push(`<@&${role}>`);
      } else {
        return false;
      }
    }

    const roleString = invalidRoles.join(", ");
    errorEmbed(
      interaction,
      `You are missing one or more roles: ${roleString}`,
      null,
      true
    );
    return true;
  }
}
function convertTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return days + "d"; // Return days if there are any
  } else if (hours > 0) {
    return hours + "h"; // Return hours if there are no days
  } else if (minutes > 0) {
    return minutes + "m"; // Return minutes if there are no hours
  } else {
    return seconds + "s"; // Return seconds if there are no minutes
  }
}

module.exports = { getFiles, cooldown, permissions, roles, convertTime };
