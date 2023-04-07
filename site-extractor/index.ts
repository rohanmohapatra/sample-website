import axios from "axios";
import fs from "fs";
import Logger from "@ptkdev/logger";

const pages = [
  "home",
  "team",
  "projects",
  "publications",
  "resources",
  "join-us",
  "codedata",
];

const logger = new Logger();

const site = "https://sites.google.com/view/micosyslab";

pages.forEach((page) => {
  axios
    .get(`${site}/${page}`)
    .then((response) => {
      logger.info(`Starting build for ${page} page`);
      // Remove redirects
      const redirectUrl = `${site}/${page}`;
      let htmlPage: string = response.data;
      htmlPage = htmlPage.replaceAll(redirectUrl, "");
      logger.info("Removing redirects to Google Sites");
      // Remove redirect links
      htmlPage = htmlPage.replaceAll(
        new RegExp(/"\/view\/micosyslab\/.+?\"/g),
        (match) => {
          const lastIndex = match.lastIndexOf("/");
          return `"${match.substring(lastIndex, match.length - 1)}.html"`;
        }
      );
      logger.info("Adjusting Navigation links");
      // TODO: Pretty it later
      logger.warning("HTML is not pretty yet");

      fs.writeFileSync(`../pages/${page}.html`, htmlPage);
      logger.info("Wrote to html file");

      // Create index.html for home page
      if (page == "home") {
        fs.writeFileSync(`../pages/index.html`, htmlPage);
      }

      logger.sponsor(`Successful Build for ${page}`);
    })
    .catch((error) => {
      console.error(error);
    });
});
