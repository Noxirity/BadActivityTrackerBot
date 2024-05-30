function montiorSales(client, message) {
  const ROBUX_CHANNEL_ID = "1201249045771984936";
  const CASH_CHANNEL_ID = "1112734635210846310";

  const sale_type = message.channel.id === ROBUX_CHANNEL_ID ? "robux" : "cash";
  if (sale_type === "robux") {
    const embed = message.embeds[0];
    if (!embed) return;
    const getField = (name) =>
      embed.fields.find((field) => field.name === name);

    const buyer_field = getField("Buyer");
    const seller_field = getField("Seller");
    const sale_price_field = getField("Sale Price");
    const item_value_field = getField("Item Value");
    const item_name = embed.title;

    const emoji = "<:robux:1201873435652010045>";
    const sale_price = parseFloat(
      sale_price_field.value
        .replace(new RegExp(emoji, "g"), "")
        .replace(/[^0-9.]/g, "")
    );
    const item_value = parseFloat(
      item_value_field.value.replace(/[\$, ]/g, "")
    );
  }
}

module.exports = montiorSales;
