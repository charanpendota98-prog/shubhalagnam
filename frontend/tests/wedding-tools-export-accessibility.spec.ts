import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";

for (const lang of ["en", "te"] as const) for (const width of [390, 1280]) {
  test(`wedding tools names and readable actual export ${lang} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.addInitScript((language) => localStorage.setItem("tsap_lang", language), lang);
    await page.route("**/api/**", (route) => route.fulfill({ json: { success: true, items: [] } }));
    for (const route of ["/pelli-choopulu", "/lagna-patrika"]) {
      await page.goto(route);
      const share = page.locator('main a[href^="https://wa.me/"]').first();
      await expect(share).toBeVisible();
      const visible = (await share.innerText()).trim();
      expect(await share.getAttribute("aria-label")).toContain(visible);
      const axe = await new AxeBuilder({ page }).withRules(["label-content-name-mismatch"]).analyze();
      expect(axe.violations).toEqual([]);
    }
    const venue = lang === "en"
      ? "Fictional Sri Lakshmi Narasimha Convention Centre, Hall Two, Road Twelve, Near Community Park, Jubilee Hills, Hyderabad, Telangana, India 500033. Use the eastern entrance beside the garden."
      : "పరీక్ష శ్రీ లక్ష్మీ నరసింహ కళ్యాణ మండపం, రెండవ హాలు, పన్నెండవ రోడ్డు, కమ్యూనిటీ పార్కు దగ్గర, జూబ్లీ హిల్స్, హైదరాబాద్, తెలంగాణ, భారతదేశం. తూర్పు వైపు ప్రవేశ ద్వారం ఉపయోగించండి.";
    const longName = (lang === "en" ? "FictionalLongFamilyName" : "పరీక్షకుటుంబంపేరుచాలాపొడవు").repeat(8);
    const invocation = lang === "en" ? "Fictional invocation first line\nFictional second line" : "పరీక్ష ప్రార్థన మొదటి పంక్తి\nపరీక్ష రెండవ పంక్తి";
    await page.locator("#patrika-brideName").fill(longName);
    await page.locator("#patrika-groomName").fill(lang === "en" ? "Fictional Groom" : "పరీక్ష వరుడు");
    await page.locator("#patrika-venue").fill(venue);
    await page.locator("textarea").first().fill(invocation);
    const calls: { text: string; x: number; y: number; measured: number; max?: number; canvasHeight: number }[] = [];
    await page.exposeFunction("recordInvitationText", (call: (typeof calls)[number]) => calls.push(call));
    await page.evaluate(() => {
      const original = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (text, x, y, max) {
        void (window as unknown as { recordInvitationText: (call: unknown) => void }).recordInvitationText({ text, x, y, max, measured: this.measureText(text).width, canvasHeight: this.canvas.height });
        if (max === undefined) return original.call(this, text, x, y);
        return original.call(this, text, x, y, max);
      };
    });
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: lang === "en" ? "Download HD card" : "HD కార్డ్ డౌన్‌లోడ్", exact: true }).click(),
    ]);
    const output = path.resolve("artifacts", "patrika-wrapping");
    fs.mkdirSync(output, { recursive: true });
    await download.saveAs(path.join(output, `${lang}-${width}.jpg`));
    expect(await download.failure()).toBeNull();
    await expect.poll(() => calls.length).toBeGreaterThan(20);
    expect(calls.every((call) => call.max === undefined)).toBeTruthy();
    expect(calls.every((call) => call.measured <= 920.1)).toBeTruthy();
    expect(calls.every((call) => call.x - call.measured / 2 >= 79.9 && call.x + call.measured / 2 <= 1000.1)).toBeTruthy();
    expect(calls.every((call) => call.y >= 50 && call.y < call.canvasHeight - 50)).toBeTruthy();
    const text = calls.map((call) => call.text).join(" ");
    const normalize = (value: string) => value.replace(/\s/g, "");
    expect(normalize(text)).toContain(normalize(venue));
    expect(normalize(text)).toContain(normalize(longName));
    expect(normalize(text)).toContain(normalize(invocation));
    expect(calls.filter((call) => call.text.includes("Fictional invocation") || call.text.includes("పరీక్ష ప్రార్థన")).length).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
  });
}
