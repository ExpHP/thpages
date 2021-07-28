// This file contains regression tests for CSS bugs that have occurred at
// some point during the construction of the website.
// (e.g. where a selector was changed to be more specific and this accidentally
// made it begin to override something else.)
//
// It does contain some hardcoded values copied from CSS, including e.g. colors.
// This does make the tests a bit fragile. This is a price we're willing to pay
// for *some* sense of protection against repeating past mistakes.


import { Builder, By, Key, until, WebDriver } from 'selenium-webdriver';
import rgba from 'color-rgba';

jest.setTimeout(30000);


describe('browser tests', function() {
  let driver: WebDriver = null as any as WebDriver;

  async function waitForElement(selector: By) {
    await driver.wait(until.elementLocated(selector), 15000);
    return await driver.findElement(selector);
  }

  async function visitPage(path: string) {
    await driver.get(`http://localhost:1234/#${path}`);
  }

  // use for the initial navigation event in a test to prevent tests from
  // affecting each other
  async function startAtPage(path: string) {
    await visitPage(path);
    await driver.navigate().refresh();
  }

  async function getMaxPageScrollYByActuallyScrolling() {
    return await driver.executeScript(`
      window.scrollBy(0, document.body.scrollHeight);
      return window.scrollY;
    `) as number;
  }

  beforeAll(async function() {
    driver = await new Builder().forBrowser('chrome').build();
  });
  afterAll(async function() {
    await driver.quit();
  });

  test('ref color', async function() {
    await startAtPage("/anm/ins");
    await driver.manage().window().setRect({width: 1920, height: 1000});

    const element = await waitForElement(By.css("code.language-anm .isref"));
    const color = rgba(await element.getCssValue("color"));
    expect(color).toEqual([245, 227, 156, 1]);
  });

  test('can scroll', async function() {
    await startAtPage("/anm/stages-of-rendering");
    await driver.manage().window().setRect({width: 1920, height: 1000});

    await waitForElement(By.css("img[src*='koishi']"));
    const maxScrollY = await getMaxPageScrollYByActuallyScrolling();
    expect(maxScrollY).toBeGreaterThan(1000);
  });

  async function checkStructBgFillsScreen() {
    const maxHeight = await driver.executeScript(`return document.body.scrollHeight;`);
    const bgElement = await waitForElement(By.css("[data-testid='darken-bg']"));
    const actualHeight = (await bgElement.getRect()).height;
    expect(actualHeight).toBe(maxHeight);
  }

  test('struct page bg fills screen', async function() {
    // Pick a tiny struct that won't force scrolling
    await startAtPage("/struct?t=zAnmId&v=th10.v1.00a");
    await driver.manage().window().setRect({width: 1920, height: 1000});

    // wait for the struct to render by looking for the `int32_t` or `i32` token
    await waitForElement(By.css(".type.primitive"));

    // Verify that the content is smaller than the viewport, so that the test is actually meaningful.
    const maxScrollY = await getMaxPageScrollYByActuallyScrolling();
    expect(maxScrollY).toBe(0);

    await checkStructBgFillsScreen();
  });

  test('struct page bg can grow past screen', async function() {
    // Pick a biiiig struct that won't force scrolling
    await startAtPage("/struct?t=zAnmVm&v=th11.v1.00a");
    await driver.manage().window().setRect({width: 1920, height: 1000});

    // FIXME: would be more robust to search for the text "0x434" (the end offset)
    //        but the xpath-based solution for text searching didn't work for me.
    //
    //        The nth child picked here is one that's reasonably far while giving wiggle room.
    await waitForElement(By.css(".struct-view >.row:nth-child(46)"));

    // Verify that the content is large enough that the test is actually meaningful.
    const maxScrollY = await getMaxPageScrollYByActuallyScrolling();
    expect(maxScrollY).toBeGreaterThan(0);

    await checkStructBgFillsScreen();
  });
});
