import axios from "axios";
import fs from "fs";
import Logger from "@ptkdev/logger";
import puppeteer from "puppeteer";
import https from "https";

interface UrlName {
  url: string;
  name: string;
}

const pages = [
  "home",
  "team",
  "projects",
  "publications",
  "resources",
  "join-us",
  "codedata",
];

const buildImagesForSite = async (pageName: string) => {
  const browser = await puppeteer.launch();
  const [page] = await browser.pages();
  await page.goto(`https://sites.google.com/view/micosyslab/${pageName}`);
  let imageUrls = await page.evaluate(() =>
    Array.from(document.querySelectorAll("img"), ({ src }) => src)
  );

  const backgroundImages = await page.evaluate(() => {
    let backgroundImages = Array.from(
      document.querySelectorAll("div"),
      (el) => el.style.backgroundImage
    );
    backgroundImages = backgroundImages.filter((bg) => !!bg);
    backgroundImages = backgroundImages.map((bg) => bg.split('"')[1]);
    return backgroundImages;
  });
  imageUrls = imageUrls.concat(backgroundImages);

  await browser.close();

  // Create images directory
  if (!fs.existsSync("../pages/images")) {
    fs.mkdirSync("../pages/images");
  }

  const promises: Promise<UrlName>[] = [];
  const images = new Map<string, string>();

  imageUrls.forEach((imageUrl, i) => {
    const promise = new Promise<UrlName>((resolve, reject) => {
      https.get(imageUrl, (response) => {
        const imageName = `../pages/images/${pageName}_${i}.jpg`;
        response.pipe(fs.createWriteStream(imageName));
        resolve({ url: imageUrl, name: `images/${pageName}_${i}.jpg` });
      });
    });
    promises.push(promise);
  });

  const values = await Promise.all(promises);
  return values;
};

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

      // Use Local Images
      buildImagesForSite(page).then((images: UrlName[]) => {
        images.forEach(({ url, name }) => {
          htmlPage = htmlPage.replaceAll(url, name);
        });

        fs.writeFileSync(`../pages/${page}.html`, htmlPage);
        logger.info("Wrote to html file");

        // Create index.html for home page
        if (page == "home") {
          fs.writeFileSync(`../pages/index.html`, htmlPage);
        }

        logger.sponsor(`Successful Build for ${page}`);
      });
    })
    .catch((error) => {
      console.error(error);
    });
});
