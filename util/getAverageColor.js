const nv = require("node-vibrant");

function getAverageColorFromURL(imageUrl) {
  return require("axios")
    .get(imageUrl, { responseType: "arraybuffer" })
    .then((response) => {
      const buffer = Buffer.from(response.data, "binary");
      const vibrant = new nv(buffer);

      return new Promise((resolve) => {
        vibrant.getPalette((err, palette) => {
          if (err) {
            console.error("Error:", err);
            resolve("Green");
          } else {
            const averageColor = palette.Vibrant.hex;
            console.log(averageColor);
            resolve(averageColor);
          }
        });
      });
    })
    .catch((error) => {
      console.error("Error fetching the image", error);
      return "Green";
    });
}

module.exports = getAverageColorFromURL;
