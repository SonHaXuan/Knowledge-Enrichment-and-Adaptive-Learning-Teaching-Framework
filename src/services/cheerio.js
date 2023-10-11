import puppeteer from "puppeteer";
import cheerio from "cheerio";

import { removeRewlines } from "../helpers/text";

async function getHtmlByLink(link) {
  const browser = await puppeteer.launch({
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  const page = await browser.newPage({ javascriptEnabled: true });
  await page.goto(link);
  await page.waitForFunction(() => document.readyState === "complete");
  const htmlContent = await page.content();
  await browser.close();

  return htmlContent;
}

async function getContentByLink(link) {
  const html = await getHtmlByLink(link);
  const $ = cheerio.load(html);
  $("body").find("script, style", "iframe").remove();
  const content = $("body").text().trim();

  return removeRewlines(content);
}

export { getContentByLink };
