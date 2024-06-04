import puppeteer from "puppeteer";
import cron from "node-cron";
import "dotenv/config";

const isDevMode = process.env.NODE_ENV !== "production";
const browserConfig = {
  headless: !isDevMode,
};

async function getRecentPostLink(page) {
  await page.goto("https://www.instagram.com/hola_pork", {
    waitUntil: "networkidle2",
  });
  await page.waitForSelector("._aagu");
  return await page.evaluate(
    () => document.querySelector("._aagu").parentElement.href
  );
}

async function extractTextFromPost(page) {
  await page.waitForSelector("._a9zs");
  return await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll("*"));
    const targetElement = elements.find((el) =>
      el.textContent.includes("올라밥집")
    );
    return targetElement ? targetElement.innerText : "";
  });
}

async function getText() {
  const browser = await puppeteer.launch(browserConfig);
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1080 });

  try {
    const recentPostLink = await getRecentPostLink(page);
    await page.goto(recentPostLink, { waitUntil: "networkidle2" });
    const text = await extractTextFromPost(page);
    return text;
  } finally {
    await browser.close();
  }
}

async function loginToWapl(page) {
  await page.goto("https://wapl.ai/spaces", { waitUntil: "networkidle2" });
  await page.waitForSelector('input[name="username"]');
  await page.type('input[name="username"]', process.env.WAPL_USERNAME);
  await page.type('input[name="password"]', process.env.WAPL_PASSWORD);
  await page.click('input[name="login"]');
  await page.waitForNavigation();
}

async function postMenuToWapl(page, menu) {
  const roomUrl = isDevMode
    ? process.env.WAPL_ROOM_DEV
    : process.env.WAPL_ROOM_PROD;
  await page.goto(roomUrl, { waitUntil: "networkidle2" });
  await page.waitForSelector('div[data-placeholder="Enter a message."]');
  await page.evaluate((menu) => {
    const input = document.querySelector(
      'div[data-placeholder="Enter a message."]'
    );
    const month = new Date().getMonth() + 1;
    const date = new Date().getDate();
    input.innerHTML = `<div>🤖올라술고기 메뉴 봇 - ${month}월 ${date}일 점심 메뉴</div><div>${menu}</div>`;
  }, menu);
  await page.waitForSelector("button.sc-kQwWFH");
  await page.click("button.sc-kQwWFH");
  await (() => new Promise((res) => setTimeout(res, 3000)))();
}

async function writeText(menu) {
  const browser = await puppeteer.launch(browserConfig);
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 3080 });

  try {
    await loginToWapl(page);
    await postMenuToWapl(page, menu);
  } finally {
    await browser.close();
  }
}

function extractMenu(text) {
  return text
    .split("\n")
    .filter((line) => line.startsWith("✔"))
    .map((line) => line.replace("✔", "").trim());
}

function checkToday(text) {
  const month = new Date().getMonth() + 1;
  const date = new Date().getDate();
  return (
    text.includes(`${month}월 ${date}일`) ||
    text.includes(`${month}월${date}일`)
  );
}

async function main() {
  try {
    const text = await getText();
    if (!isDevMode && !checkToday(text)) {
      console.log("It's not today's menu");
      return;
    }
    const menu = extractMenu(text);
    console.log(menu);
    await writeText(menu.join(", "));
  } catch (error) {
    console.error("Error occurred:", error);
  }
}

// await main();

cron.schedule("50 10 * * 1-5", async () => {
  console.log("crawling start");
  await main();
  console.log("crawling end");
});
