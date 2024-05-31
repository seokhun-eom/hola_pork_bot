import puppeteer from "puppeteer";
import "dotenv/config";

const isDevMode = process.env.NODE_ENV === "development";
const browserConfig = isDevMode
  ? {
      headless: false,
    }
  : {};

async function getText() {
  const browser = await puppeteer.launch(browserConfig);
  const page = await browser.newPage();

  await page.goto("https://www.instagram.com/", { waitUntil: "networkidle2" });
  await page.type('input[name="username"]', process.env.INSTAGRAM_USERNAME);
  await page.type('input[name="password"]', process.env.INSTAGRAM_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForNavigation();

  await page.goto(`https://www.instagram.com/hola_pork`, {
    waitUntil: "networkidle2",
  });

  const recentPost = await page.evaluate(
    () => document.querySelector("._aagu").parentElement.href
  );

  await page.goto(recentPost, {
    waitUntil: "networkidle2",
  });

  const text = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll("span"));
    const hola = elements.filter((el) => el.textContent.includes("올라밥집"));
    if (!hola[0]) return "";
    return hola[0].innerText;
  });

  await browser.close();

  return text;
}

async function writeText(str) {
  const browser = await puppeteer.launch(browserConfig);
  const page = await browser.newPage();
  await page.goto("https://wapl.ai/spaces", {
    waitUntil: "networkidle2",
  });

  await page.type('input[name="username"]', process.env.WAPL_USERNAME);
  await page.type('input[name="password"]', process.env.WAPL_PASSWORD);
  await page.click('input[name="login"]');
  await page.waitForNavigation();

  await page.goto(
    isDevMode ? process.env.WAPL_ROOM_DEV : process.env.WAPL_ROOM_PROD,
    {
      waitUntil: "networkidle2",
    }
  );
  await page.waitForSelector('div[data-placeholder="Enter a message."]');

  await page.evaluate((menu) => {
    const input = document.querySelector(
      'div[data-placeholder="Enter a message."]'
    );
    const month = new Date().getMonth() + 1;
    const date = new Date().getDate();

    input.innerHTML = `<div>🤖올라술고기 메뉴 봇 - ${month}월 ${date}일 점심 메뉴</div><div>${menu}</div>`;
  }, str);
  await page.click('button[class="sc-kQwWFH dGAtdu"]');

  await browser.close();
}

function extractMenu(str) {
  const lines = str.split("\n");

  const menu = lines
    .filter((line) => line.startsWith("✔"))
    .map((line) => line.replace("✔", "").trim());

  return menu;
}

function checkToday(str) {
  const month = new Date().getMonth() + 1;
  const date = new Date().getDate();

  return (
    str.includes(`${month}월 ${date}일`) || str.includes(`${month}월${date}일`)
  );
}

async function main() {
  const text = await getText();
  const isToday = checkToday(text);
  if (!isToday) return;
  const menu = extractMenu(text);
  await writeText(menu.join(", "));
}

await main();
