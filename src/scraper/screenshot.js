import fs from "fs-extra";
import path from "path";
import chalk from "chalk";

export async function takeScreenshot(page, filename, outputDir) {
    const filepath = path.join(outputDir, "screenshots", filename);
    await fs.ensureDir(path.dirname(filepath));

    await page.screenshot({
        path: filepath,
        fullPage: true,
    });

    console.log(chalk.gray(`  • Screenshot saved: ${filename}`));
    return filepath;
}

export async function takeElementScreenshots(page, outputDir, pageName) {
    console.log(chalk.gray("  → Capturing element screenshots..."));

    const screenshots = [];

    // Capture main sections
    const selectors = [
        { name: "header", selector: 'header, [role="banner"]' },
        { name: "sidebar", selector: '[role="navigation"], aside, .sidebar' },
        { name: "main", selector: 'main, [role="main"]' },
        { name: "content", selector: ".content, .main-content" },
    ];

    for (const { name, selector } of selectors) {
        try {
            const element = await page.$(selector);
            if (element) {
                const filepath = path.join(
                    outputDir,
                    "screenshots",
                    `${pageName}-${name}.png`
                );
                await fs.ensureDir(path.dirname(filepath));
                await element.screenshot({ path: filepath });

                screenshots.push({
                    name,
                    selector,
                    path: filepath,
                });

                console.log(chalk.gray(`  • Captured ${name}`));
            }
        } catch (error) {
            console.log(
                chalk.yellow(`  ⚠ Could not capture ${name}: ${error.message}`)
            );
        }
    }

    return screenshots;
}
