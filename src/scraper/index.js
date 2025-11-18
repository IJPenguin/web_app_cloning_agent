import { createBrowser, loginToAsana } from "./browser.js";
import { captureNetworkTraffic } from "./network-capture.js";
import {
    analyzeDOMStructure,
    extractInteractiveElements,
} from "./dom-analyzer.js";
import { takeScreenshot, takeElementScreenshots } from "./screenshot.js";
import {
    scrapeHomePage,
    navigateToCreateProject,
    scrapeCreateProjectPage,
    selectBlankProject,
    createNewProject,
    scrapeProjectPage,
    navigateToMyTasks,
    scrapeMyTasksPage,
} from "./workflow.js";
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";

export async function scrapeAsana({
    targetUrl,
    email,
    password,
    pages,
    outputDir,
}) {
    if (!email || !password) {
        throw new Error(
            "ASANA_EMAIL and ASANA_PASSWORD must be set in .env file"
        );
    }

    const { browser, context } = await createBrowser();
    const page = await context.newPage();

    try {
        // Login
        await loginToAsana(page, email, password);

        const scrapedData = {
            timestamp: new Date().toISOString(),
            targetUrl,
            pages: [],
        };

        let totalApiCalls = 0;
        let totalScreenshots = 0;

        // Step 1: Scrape Home Page (already on it after login)
        console.log(chalk.blue.bold("\n=== Step 1: Home Page ==="));
        await scrapeHomePage(page, outputDir);
        await capturePageData(page, "home", outputDir, scrapedData);

        // Step 2: Navigate to Create Project
        console.log(chalk.blue.bold("\n=== Step 2: Create Project Flow ==="));
        await navigateToCreateProject(page);
        await scrapeCreateProjectPage(page, outputDir);
        await capturePageData(
            page,
            "create-project-menu",
            outputDir,
            scrapedData
        );

        // Step 3: Select Blank Project
        await selectBlankProject(page);
        await capturePageData(
            page,
            "blank-project-form",
            outputDir,
            scrapedData
        );

        // Step 4: Create the project
        await createNewProject(page, "Test Project");
        await scrapeProjectPage(page, outputDir);
        await capturePageData(page, "project-view", outputDir, scrapedData);

        // Step 5: Navigate to My Tasks
        console.log(chalk.blue.bold("\n=== Step 3: My Tasks Page ==="));
        await navigateToMyTasks(page);
        await scrapeMyTasksPage(page, outputDir);
        await capturePageData(page, "my-tasks", outputDir, scrapedData);

        // Calculate totals
        scrapedData.pages.forEach((p) => {
            totalApiCalls += p.apiCalls;
            totalScreenshots += 1 + (p.screenshots.elements?.length || 0);
        });

        // Save complete scraped data
        const scrapedDataPath = path.join(outputDir, "scraped-data.json");
        await fs.writeJson(scrapedDataPath, scrapedData, { spaces: 2 });

        console.log(chalk.green(`\n✓ All data saved to ${outputDir}`));

        return {
            pages: scrapedData.pages,
            apiCalls: totalApiCalls,
            screenshots: totalScreenshots,
        };
    } finally {
        await browser.close();
    }
}

/**
 * Helper function to capture page data
 */
async function capturePageData(page, pageName, outputDir, scrapedData) {
    console.log(chalk.cyan(`\n📸 Capturing ${pageName} data...`));

    // Setup network capture
    const networkCapture = await captureNetworkTraffic(page, outputDir);

    // Wait for page to load and capture network traffic
    await page.waitForTimeout(3000);

    // Analyze DOM
    console.log(chalk.gray("  → Analyzing DOM structure..."));
    const domStructure = await analyzeDOMStructure(page);
    const interactiveElements = await extractInteractiveElements(page);

    // Take screenshots
    console.log(chalk.gray("  → Capturing screenshots..."));
    const mainScreenshot = await takeScreenshot(
        page,
        `${pageName}-full.png`,
        outputDir
    );
    const elementScreenshots = await takeElementScreenshots(
        page,
        outputDir,
        pageName
    );

    // Save API calls
    const apiCalls = await networkCapture.saveToFile(
        `${pageName}-api-calls.json`
    );

    const pageData = {
        name: pageName,
        url: page.url(),
        domStructure,
        interactiveElements,
        apiCalls: apiCalls.length,
        screenshots: {
            main: mainScreenshot,
            elements: elementScreenshots,
        },
    };

    scrapedData.pages.push(pageData);
    console.log(chalk.green(`✓ Completed ${pageName}`));

    return pageData;
}
