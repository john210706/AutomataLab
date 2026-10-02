import { expect, test } from "@playwright/test";

test("core compiler and lexical analyzer work across browser engines", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Generate automata" }).click();
  await expect(page.getByText("Compiled successfully")).toBeVisible();
  await page.getByRole("button", { name: /Minimize the DFA/ }).click();
  await page.getByRole("button", { name: "Last step", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Minimized DFA", exact: true })
      .getByTestId("graph-state-count"),
  ).toHaveText("3 states");

  await page
    .getByRole("button", { name: "Lexical analysis", exact: true })
    .click();
  await page.getByRole("button", { name: "Compile and scan" }).click();
  await expect(
    page.getByRole("region", { name: "Recognized tokens" }),
  ).toContainText("if");
});
