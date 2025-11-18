import "dotenv/config";
import { scrapeAsana } from "./scraper/index.js";
import { generateFrontend, generateBackend } from "./generators/index.js";
import { runVisualTests } from "./testing/visual-test.js";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";

const OUTPUT_DIR = process.env.OUTPUT_DIR || "./output";
const PAGES = (process.env.PAGES_TO_CLONE || "home,projects,tasks").split(",");

async function main() {
    const command = process.argv[2] || "scrape"; // Changed default from "all" to "scrape"

    console.log(chalk.blue.bold("\n🤖 Clooney - Web Cloning Agent\n"));

    try {
        // Ensure output directory exists
        await fs.ensureDir(OUTPUT_DIR);

        switch (command) {
            case "scrape":
                await runScraping();
                break;
            case "generate":
                await runGeneration();
                break;
            case "generate:home":
                await runGenerationForPage("home");
                break;
            case "generate:projects":
                await runGenerationForPage(
                    "create-project-menu",
                    "blank-project-form",
                    "project-view"
                );
                break;
            case "generate:tasks":
                await runGenerationForPage("my-tasks");
                break;
            case "test":
                await runTesting();
                break;
            case "all":
                await runFullPipeline();
                break;
            default:
                await runScraping();
                break;
        }

        console.log(chalk.green.bold("\n✅ Agent completed successfully!\n"));
    } catch (error) {
        console.error(chalk.red.bold("\n❌ Agent failed:"), error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

async function runScraping() {
    console.log(chalk.yellow("📡 Stage 1: Scraping Asana..."));

    const scrapeData = await scrapeAsana({
        targetUrl: process.env.TARGET_URL || "https://app.asana.com",
        email: process.env.ASANA_EMAIL,
        password: process.env.ASANA_PASSWORD,
        pages: PAGES,
        outputDir: OUTPUT_DIR,
    });

    console.log(chalk.green("✓ Scraping complete"));
    console.log(chalk.gray(`  - Captured ${scrapeData.pages.length} pages`));
    console.log(chalk.gray(`  - Recorded ${scrapeData.apiCalls} API calls`));
    console.log(chalk.gray(`  - Saved ${scrapeData.screenshots} screenshots`));

    return scrapeData;
}

async function runGeneration() {
    console.log(chalk.yellow("\n🔨 Stage 2: Generating Code..."));

    // Load scraped data
    const scrapedDataPath = path.join(OUTPUT_DIR, "scraped-data.json");
    if (!(await fs.pathExists(scrapedDataPath))) {
        throw new Error('No scraped data found. Run "npm run scrape" first.');
    }

    const scrapedData = await fs.readJson(scrapedDataPath);

    // Generate frontend
    console.log(chalk.cyan("  → Generating React frontend..."));
    const frontendPath = path.join(OUTPUT_DIR, "frontend");
    await generateFrontend(scrapedData, frontendPath);
    console.log(chalk.green("  ✓ Frontend generated"));

    // Generate backend
    console.log(chalk.cyan("  → Generating FastAPI backend..."));
    const backendPath = path.join(OUTPUT_DIR, "backend");
    await generateBackend(scrapedData, backendPath);
    console.log(chalk.green("  ✓ Backend generated"));

    console.log(chalk.green("✓ Code generation complete"));
}

async function runGenerationForPage(...pageNames) {
    console.log(
        chalk.yellow(`\n🔨 Generating Code for: ${pageNames.join(", ")}...`)
    );

    // Load scraped data
    const scrapedDataPath = path.join(OUTPUT_DIR, "scraped-data.json");
    if (!(await fs.pathExists(scrapedDataPath))) {
        throw new Error('No scraped data found. Run "npm start scrape" first.');
    }

    const scrapedData = await fs.readJson(scrapedDataPath);

    // Filter to only include specified pages
    const filteredData = {
        ...scrapedData,
        pages: scrapedData.pages.filter((page) =>
            pageNames.includes(page.name)
        ),
    };

    if (filteredData.pages.length === 0) {
        throw new Error(`No pages found matching: ${pageNames.join(", ")}`);
    }

    console.log(
        chalk.gray(`  → Found ${filteredData.pages.length} page(s) to generate`)
    );

    // Generate frontend for selected pages
    console.log(chalk.cyan("  → Generating React components..."));
    const frontendPath = path.join(OUTPUT_DIR, "frontend");
    await generateFrontend(filteredData, frontendPath);
    console.log(chalk.green("  ✓ Components generated"));

    // Generate backend for selected pages
    console.log(chalk.cyan("  → Generating FastAPI endpoints..."));
    const backendPath = path.join(OUTPUT_DIR, "backend");
    await generateBackend(filteredData, backendPath);
    console.log(chalk.green("  ✓ Endpoints generated"));

    console.log(
        chalk.green(`✓ Code generation complete for: ${pageNames.join(", ")}`)
    );
}

async function runTesting() {
    console.log(chalk.yellow("\n🧪 Stage 3: Running Visual Tests..."));

    const testResults = await runVisualTests({
        originalUrl: process.env.TARGET_URL,
        generatedUrl: "http://localhost:3000",
        pages: PAGES,
    });

    console.log(chalk.green("✓ Testing complete"));
    console.log(chalk.gray(`  - Passed: ${testResults.passed}`));
    console.log(chalk.gray(`  - Failed: ${testResults.failed}`));
    console.log(chalk.gray(`  - Accuracy: ${testResults.accuracy}%`));

    return testResults;
}

async function runFullPipeline() {
    const startTime = Date.now();

    // Stage 1: Scrape
    await runScraping();

    // Stage 2: Generate
    await runGeneration();

    // Stage 3: Test
    console.log(
        chalk.yellow("\n💡 Run visual tests after starting the generated apps:")
    );
    console.log(
        chalk.gray("  1. cd output/frontend && npm install && npm run dev")
    );
    console.log(
        chalk.gray(
            "  2. cd output/backend && pip install -r requirements.txt && uvicorn main:app"
        )
    );
    console.log(chalk.gray("  3. npm run test\n"));

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(chalk.blue(`⏱️  Total time: ${duration}s`));
}

// Run the agent
main();
