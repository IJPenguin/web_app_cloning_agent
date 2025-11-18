import { chromium } from "playwright";
import { test, expect } from "@playwright/test";
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";

export async function runVisualTests({ originalUrl, generatedUrl, pages }) {
    console.log(chalk.cyan("Setting up visual comparison..."));

    const results = {
        passed: 0,
        failed: 0,
        tests: [],
        accuracy: 0,
    };

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
    });

    try {
        for (const pageName of pages) {
            console.log(chalk.yellow(`\n  Testing ${pageName} page...`));

            const pageTest = await comparePages(
                context,
                originalUrl,
                generatedUrl,
                pageName
            );

            results.tests.push(pageTest);

            if (pageTest.passed) {
                results.passed++;
                console.log(chalk.green(`  ✓ ${pageName} page passed`));
            } else {
                results.failed++;
                console.log(chalk.red(`  ✗ ${pageName} page failed`));
                console.log(
                    chalk.gray(
                        `    Differences: ${pageTest.differences.length}`
                    )
                );
            }
        }

        results.accuracy = (
            (results.passed / (results.passed + results.failed)) *
            100
        ).toFixed(2);

        // Save test results
        const resultsPath = path.join("tests", "visual-test-results.json");
        await fs.ensureDir("tests");
        await fs.writeJson(resultsPath, results, { spaces: 2 });

        return results;
    } finally {
        await browser.close();
    }
}

async function comparePages(context, originalUrl, generatedUrl, pageName) {
    const originalPage = await context.newPage();
    const generatedPage = await context.newPage();

    const pageUrls = {
        home: "/home",
        projects: "/projects",
        tasks: "/tasks",
    };

    const result = {
        page: pageName,
        passed: false,
        differences: [],
        cssMatches: [],
        cssMismatches: [],
    };

    try {
        // Navigate to both pages
        await originalPage.goto(`${originalUrl}${pageUrls[pageName]}`, {
            waitUntil: "networkidle",
            timeout: 30000,
        });

        await generatedPage.goto(`${generatedUrl}${pageUrls[pageName]}`, {
            waitUntil: "networkidle",
            timeout: 30000,
        });

        // Take screenshots
        const screenshotDir = path.join("tests", "screenshots");
        await fs.ensureDir(screenshotDir);

        const originalScreenshot = path.join(
            screenshotDir,
            `${pageName}-original.png`
        );
        const generatedScreenshot = path.join(
            screenshotDir,
            `${pageName}-generated.png`
        );

        await originalPage.screenshot({
            path: originalScreenshot,
            fullPage: true,
        });
        await generatedPage.screenshot({
            path: generatedScreenshot,
            fullPage: true,
        });

        console.log(chalk.gray(`    • Screenshots captured`));

        // Compare key CSS properties
        const cssComparison = await compareCSSProperties(
            originalPage,
            generatedPage
        );
        result.cssMatches = cssComparison.matches;
        result.cssMismatches = cssComparison.mismatches;

        console.log(
            chalk.gray(`    • CSS matches: ${cssComparison.matches.length}`)
        );
        console.log(
            chalk.gray(
                `    • CSS mismatches: ${cssComparison.mismatches.length}`
            )
        );

        // Check if test passed (allow some tolerance)
        const matchPercentage =
            (cssComparison.matches.length /
                (cssComparison.matches.length +
                    cssComparison.mismatches.length)) *
            100;

        result.passed = matchPercentage >= 80; // 80% threshold
        result.matchPercentage = matchPercentage.toFixed(2);
    } catch (error) {
        console.error(
            chalk.red(`    Error testing ${pageName}:`),
            error.message
        );
        result.error = error.message;
    } finally {
        await originalPage.close();
        await generatedPage.close();
    }

    return result;
}

async function compareCSSProperties(originalPage, generatedPage) {
    const selectors = [
        "button",
        "input",
        "a",
        "h1",
        "h2",
        "h3",
        ".card",
        ".header",
        ".sidebar",
        "nav",
    ];

    const matches = [];
    const mismatches = [];

    for (const selector of selectors) {
        try {
            const originalElements = await originalPage.$$(selector);
            const generatedElements = await generatedPage.$$(selector);

            // Compare first element of each type
            if (originalElements.length > 0 && generatedElements.length > 0) {
                const originalStyles = await originalElements[0].evaluate(
                    (el) => {
                        const styles = window.getComputedStyle(el);
                        return {
                            color: styles.color,
                            backgroundColor: styles.backgroundColor,
                            fontSize: styles.fontSize,
                            fontWeight: styles.fontWeight,
                            padding: styles.padding,
                            margin: styles.margin,
                            borderRadius: styles.borderRadius,
                            display: styles.display,
                        };
                    }
                );

                const generatedStyles = await generatedElements[0].evaluate(
                    (el) => {
                        const styles = window.getComputedStyle(el);
                        return {
                            color: styles.color,
                            backgroundColor: styles.backgroundColor,
                            fontSize: styles.fontSize,
                            fontWeight: styles.fontWeight,
                            padding: styles.padding,
                            margin: styles.margin,
                            borderRadius: styles.borderRadius,
                            display: styles.display,
                        };
                    }
                );

                // Compare each CSS property
                for (const [property, originalValue] of Object.entries(
                    originalStyles
                )) {
                    const generatedValue = generatedStyles[property];

                    if (cssValuesMatch(originalValue, generatedValue)) {
                        matches.push({
                            selector,
                            property,
                            value: originalValue,
                        });
                    } else {
                        mismatches.push({
                            selector,
                            property,
                            original: originalValue,
                            generated: generatedValue,
                        });
                    }
                }
            }
        } catch (error) {
            // Element not found or other error, skip
        }
    }

    return { matches, mismatches };
}

function cssValuesMatch(value1, value2) {
    // Normalize and compare CSS values
    const normalize = (val) => {
        if (!val) return "";
        return val.toString().toLowerCase().replace(/\s+/g, " ").trim();
    };

    return normalize(value1) === normalize(value2);
}

// Playwright test configuration
export function generatePlaywrightConfig(outputDir) {
    const config = `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
`;

    return config;
}
