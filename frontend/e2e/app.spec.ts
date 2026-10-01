import { expect, test } from "@playwright/test";

test("the full compiler journey restores intermediate graphs and accepts bab", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByText("Every pattern has a path.")).toBeVisible();
  await page.screenshot({
    path: "test-results/landing-dark.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Generate automata" }).click();
  await expect(page.getByText("Compiled successfully")).toBeVisible();
  await page.getByRole("button", { name: "Last step", exact: true }).click();
  await expect(page.locator(".postfix-output")).toHaveText("a b | * a . b .");

  await page.getByRole("button", { name: /Build the ε-NFA/ }).click();
  await expect(page.getByTestId("graph-state-count")).toHaveText("0 states");
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(page.getByTestId("graph-state-count")).toHaveText("2 states");
  await expect(page.locator(".react-flow__edge")).toHaveCount(1);
  await page.getByRole("button", { name: "Last step", exact: true }).click();
  await expect(page.getByTestId("graph-state-count")).toHaveText("12 states");
  await expect(page.locator(".state-node.accepting")).toHaveCount(1);
  const finalEdgeCount = await page.locator(".react-flow__edge").count();
  await page
    .getByRole("button", { name: "Previous step", exact: true })
    .click();
  await expect(page.getByTestId("graph-state-count")).toHaveText("12 states");
  await expect(page.locator(".react-flow__edge")).toHaveCount(
    finalEdgeCount - 1,
  );
  await page
    .getByRole("button", { name: "Previous step", exact: true })
    .click();
  await expect(page.getByTestId("graph-state-count")).toHaveText("10 states");

  await page.getByRole("button", { name: /Construct the DFA/ }).click();
  await expect(page.getByTestId("graph-state-count").nth(1)).toHaveText(
    "0 states",
  );
  await page.getByRole("button", { name: "Last step", exact: true }).click();
  await expect(page.getByTestId("graph-state-count").nth(1)).toHaveText(
    "4 states",
  );
  await expect(page.getByText("DFA → NFA subsets")).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Emerging DFA", exact: true })
      .locator(".react-flow__node"),
  ).toHaveCount(4);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "test-results/dfa-dark.png", fullPage: true });

  await page.getByRole("button", { name: /Minimize the DFA/ }).click();
  await expect(page.getByTestId("graph-state-count")).toHaveText("4 states");
  await page.getByRole("button", { name: "Last step", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Minimized DFA", exact: true })
      .getByTestId("graph-state-count"),
  ).toHaveText("3 states");
  await expect(page.getByText("Original DFA (preserved)")).toBeVisible();
  const minimized = page.getByRole("region", {
    name: "Minimized DFA",
    exact: true,
  });
  await expect
    .poll(() =>
      minimized.evaluate((el) => {
        const bounds = el
          .querySelector(".graph-canvas")!
          .getBoundingClientRect();
        return [...el.querySelectorAll(".react-flow__node")].every((node) => {
          const rect = node.getBoundingClientRect();
          return (
            rect.left >= bounds.left &&
            rect.right <= bounds.right &&
            rect.top >= bounds.top &&
            rect.bottom <= bounds.bottom
          );
        });
      }),
    )
    .toBe(true);
  await page
    .getByRole("button", { name: "State M0, initial", exact: true })
    .click();
  await expect(page.getByText("STATE INSPECTOR")).toBeVisible();
  await page.getByRole("button", { name: "Close state details" }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/minimized-dark.png",
    fullPage: true,
  });

  await page.getByRole("button", { name: /Test the result/ }).click();
  await page.getByLabel("Test string", { exact: true }).fill("bab");
  await page.getByRole("button", { name: "Start simulation" }).click();
  await expect(page.getByTestId("step-count")).toContainText("Step 1");
  await page
    .getByRole("button", { name: "Next character", exact: true })
    .click();
  await expect(page.locator(".input-tape")).toContainText("1 / 3 consumed");
  await page.getByRole("button", { name: "Last step", exact: true }).click();
  await expect(page.locator(".result-badge")).toHaveText("Accepted");
  await expect(page.getByText("All three representations agree")).toBeVisible();
  await page.getByRole("button", { name: /Simulation history/ }).click();
  await page.getByRole("button", { name: /02 Read 'b'/ }).click();
  await expect(page.locator(".input-tape")).toContainText("1 / 3 consumed");
  await page.getByRole("button", { name: "Last step", exact: true }).click();
  await page
    .getByRole("button", { name: "Transition table", exact: true })
    .click();
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(page.locator(".state-node").first()).toHaveCSS(
    "background-color",
    "rgb(253, 254, 251)",
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/simulation-light.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("comparison finds b, replays the witness, and proves an equivalent pair", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Regex comparator", exact: true })
    .click();
  await page.getByRole("button", { name: "Compare languages" }).click();
  await expect(
    page.getByText("These expressions recognize different languages."),
  ).toBeVisible();
  await expect(page.locator(".witness")).toHaveText("b");
  await page.getByRole("button", { name: "Replay counterexample" }).click();
  await page.getByRole("button", { name: "Last step", exact: true }).click();
  await expect(page.locator(".operation h3")).toHaveText("Accepted");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/comparison.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Test with B" }).click();
  await expect(page.getByLabel("Test string", { exact: true })).toHaveValue(
    "b",
  );
  await page.getByRole("button", { name: "Start simulation" }).click();
  await page.getByRole("button", { name: "Last step", exact: true }).click();
  await expect(page.locator(".result-badge")).toHaveText("Rejected");
  await page
    .getByRole("button", { name: "Regex comparator", exact: true })
    .click();
  await page
    .getByRole("button", { name: "(a|b)*ab ↔ (b|a)*ab", exact: true })
    .click();
  await page.getByRole("button", { name: "Compare languages" }).click();
  await expect(
    page.getByText("These expressions are equivalent."),
  ).toBeVisible();
});

test("invalid input, epsilon, reset, and explicit example generation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Regular expression", { exact: true }).fill("a|");
  await page.getByRole("button", { name: "Generate automata" }).click();
  await expect(page.getByRole("alert")).toContainText("right-hand operand");
  await expect(page.locator(".error-character")).toHaveText("|");
  await page.getByRole("button", { name: "a|ε", exact: true }).click();
  await expect(
    page.getByLabel("Regular expression", { exact: true }),
  ).toHaveValue("a|ε");
  await expect(page.getByText("Compiled successfully")).not.toBeVisible();
  await page.getByRole("button", { name: "Generate automata" }).click();
  await page.getByRole("button", { name: /Test the result/ }).click();
  await page.getByLabel("Test string", { exact: true }).fill("");
  await page.getByLabel("Simulation automaton").selectOption("nfa");
  await page.getByRole("button", { name: "Start simulation" }).click();
  await page.getByRole("button", { name: "Last step", exact: true }).click();
  await expect(page.locator(".result-badge")).toHaveText("Accepted");
  await page.getByRole("button", { name: "Reset workspace" }).click();
  await expect(page.getByText("Every pattern has a path.")).toBeVisible();
});

test("playback responds to speed, pauses on seeking, and resets on stage changes", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Generate automata" }).click();
  await page.getByRole("button", { name: /Build the ε-NFA/ }).click();
  await page.getByLabel("Playback speed").selectOption("2");
  await page.getByRole("button", { name: "Play steps", exact: true }).click();
  await expect(page.getByTestId("graph-state-count")).not.toHaveText(
    "0 states",
  );
  await page.getByLabel("Algorithm step", { exact: true }).fill("1");
  await expect(
    page.getByRole("button", { name: "Play steps", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("graph-state-count")).toHaveText("2 states");
  await page.getByRole("button", { name: /Construct the DFA/ }).click();
  await expect(page.getByTestId("step-count")).toContainText("Step 1 /");
});

test("exports complete SVG and PNG and works on a narrow screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Generate automata" }).click();
  await page.getByRole("button", { name: /Minimize the DFA/ }).click();
  await page.getByRole("button", { name: "Last step", exact: true }).click();
  await page.getByLabel("Export Minimized DFA", { exact: true }).click();
  const svgPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download SVG" }).click();
  const svg = await svgPromise;
  expect(svg.suggestedFilename()).toBe("minimized.svg");
  const pngPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PNG" }).click();
  const png = await pngPromise;
  expect(png.suggestedFilename()).toBe("minimized.png");
  await expect(
    page
      .getByRole("region", { name: "Minimized DFA", exact: true })
      .getByTestId("graph-state-count"),
  ).toHaveText("3 states");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel("Export Minimized DFA", { exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
});

test("empty witnesses, exact input characters, and comparison validation", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Regex comparator", exact: true })
    .click();
  await page.getByLabel("Expression A", { exact: true }).fill("a*");
  await page.getByLabel("Expression B", { exact: true }).fill("a");
  await page.getByRole("button", { name: "Compare languages" }).click();
  await expect(page.locator(".witness")).toHaveText("ε");
  await page.getByRole("button", { name: "Replay counterexample" }).click();
  await page.getByRole("button", { name: "Last step", exact: true }).click();
  await expect(page.locator(".operation h3")).toHaveText("Accepted");
  await page.getByRole("button", { name: "Test with A" }).click();
  await expect(page.getByLabel("Test string", { exact: true })).toHaveValue("");
  await page.getByLabel("Test string", { exact: true }).fill("😀");
  await page.getByRole("button", { name: "Start simulation" }).click();
  await page.getByRole("button", { name: "Last step", exact: true }).click();
  await expect(page.locator(".result-badge")).toHaveText("Rejected");
  await expect(
    page.getByText("1 character consumed", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Regex comparator", exact: true })
    .click();
  await page.getByLabel("Expression B", { exact: true }).fill("a|");
  await page.getByRole("button", { name: "Compare languages" }).click();
  await expect(page.getByRole("alert")).toContainText("Expression B:");
});

test("minimization merges one class at a time and states support keyboard inspection", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Regular expression", { exact: true })
    .press("Control+Enter");
  await page.getByRole("button", { name: /Minimize the DFA/ }).click();
  await page.getByRole("button", { name: /Execution history/ }).click();
  await page.getByRole("button", { name: /Merge \{D0, D2\} into M0/ }).click();
  await expect(
    page
      .getByRole("region", { name: "Original DFA", exact: true })
      .getByTestId("graph-state-count"),
  ).toHaveText("4 states");
  await expect(
    page
      .getByRole("region", { name: "Minimized DFA", exact: true })
      .getByTestId("graph-state-count"),
  ).toHaveText("1 states");
  await page.getByRole("button", { name: "Last step", exact: true }).click();
  const state = page.getByRole("button", {
    name: "State M0, initial",
    exact: true,
  });
  await state.focus();
  await state.press("Enter");
  await expect(page.getByText("STATE INSPECTOR")).toBeVisible();
  const beforeMove = await state.getAttribute("style");
  await state.press("ArrowDown");
  await expect.poll(() => state.getAttribute("style")).not.toBe(beforeMove);
  const movedPosition = await state.getAttribute("style");
  await page
    .getByRole("button", { name: "Previous step", exact: true })
    .click();
  await page.getByRole("button", { name: "Last step", exact: true }).click();
  await expect(state).toHaveAttribute("style", movedPosition!);
  await page
    .getByRole("button", { name: "Expand Minimized DFA", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
    .toBe(true);
  await page
    .getByRole("button", { name: "Expand Minimized DFA", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
    .toBe(false);
});
