/**
 * Run with an authenticated English-language Playwright page (or Codex tab.playwright).
 * Example: await runDashboardClickRegression(page, url => page.goto(url), baseURL);
 * Requires a farm editor account with at least one pond. Never saves farm records.
 * Sends one diagnostic Orson prompt; use a test company for unattended runs.
 * Throws when a real click/keyboard action fails to produce its visible result.
 */
export async function runDashboardClickRegression(page, navigate, baseURL) {
  const passed = [];
  const readyTimeout = { timeout: 20000, timeoutMs: 20000 };
  const visible = (locator) => locator.waitFor({ state: 'visible', ...readyTimeout });
  const hidden = (locator) => locator.waitFor({ state: 'hidden', ...readyTimeout });

  await navigate(`${baseURL}/dashboard/feed`);
  const feedForm = page.getByRole('heading', { name: 'Add Feed Data', exact: true });
  const newFeed = page.getByRole('button', { name: 'New Feed Log', exact: true });
  await visible(newFeed);
  await newFeed.click();
  await visible(feedForm);
  await page.getByRole('button', { name: 'Close feed entry', exact: true }).click();
  await hidden(feedForm);
  passed.push('Feed: New Feed Log click opens and closes form');

  await page.getByRole('button', { name: 'Log', exact: true }).first().click();
  await visible(feedForm);
  const selectedPond = await page.locator('.feed-log-modal select option:checked').first().getAttribute('value');
  if (!selectedPond) throw new Error('Pond Log did not preselect a pond');
  await page.getByRole('button', { name: 'Close feed entry', exact: true }).click();
  await hidden(feedForm);
  passed.push('Feed: pond Log opens form with pond selected');

  await newFeed.press('Enter');
  await visible(feedForm);
  await page.getByRole('button', { name: 'Close feed entry', exact: true }).click();
  await hidden(feedForm);
  passed.push('Feed: keyboard activation opens form');

  await navigate(`${baseURL}/dashboard/water`);
  const waterForm = page.getByRole('heading', { name: 'Log Parameters', exact: true });
  const newWater = page.getByRole('button', { name: 'New Parameter Log', exact: true });
  await visible(newWater);
  for (const activation of ['click', 'keyboard']) {
    if (activation === 'click') await newWater.click();
    else await newWater.press('Enter');
    await visible(waterForm);
    await page.getByRole('button', { name: 'Close parameter log', exact: true }).click();
    await hidden(waterForm);
    passed.push(`Water Quality: ${activation} opens and closes form`);
  }

  await navigate(`${baseURL}/dashboard/ai`);
  const prompt = `Dashboard click regression ${Date.now()}: reply with OK only.`;
  const composer = page.getByPlaceholder('Type a question for Orson...', { exact: true });
  await visible(composer);
  await composer.fill(prompt);
  await page.getByRole('button', { name: 'Send message', exact: true }).click(readyTimeout);
  await visible(page.locator('.orson-message-row.is-user .orson-bubble').filter({ hasText: prompt }));
  await visible(page.locator('.orson-input:placeholder-shown'));
  passed.push('Orson: Send message adds user message and clears composer');
  return passed;
}
