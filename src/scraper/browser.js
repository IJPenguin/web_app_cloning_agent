import { chromium } from "playwright";
import chalk from "chalk";

export async function createBrowser() {
    console.log(chalk.gray("  → Launching browser..."));

    const browser = await chromium.launch({
        headless: false, // Set to false for debugging
        args: ["--start-maximized"],
    });

    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        locale: "en-US",
        timezoneId: "America/New_York",
    });

    return { browser, context };
}

async function dismissDialogs(page) {
    console.log(chalk.gray("  → Checking for dialogs to dismiss..."));

    try {
        // Try to find and click X/close buttons on dialogs
        const closeSelectors = [
            'button[aria-label="Close"]',
            'button[aria-label="Dismiss"]',
            '[role="dialog"] button:has-text("×")',
            '[role="dialog"] button.close',
            '[role="dialog"] [aria-label*="close" i]',
            'button:has-text("Maybe later")',
            'button:has-text("Skip")',
            '.modal button[aria-label="Close"]',
        ];

        for (const selector of closeSelectors) {
            try {
                const button = await page.$(selector);
                if (button && (await button.isVisible())) {
                    await button.click();
                    console.log(chalk.gray("    • Dismissed a dialog"));
                    await page.waitForTimeout(1000);
                }
            } catch (e) {
                // Button not found or not clickable, continue
            }
        }

        // Press Escape key as fallback to close any modals
        await page.keyboard.press("Escape");
        await page.waitForTimeout(500);
    } catch (error) {
        // Ignore errors - dialogs might not exist
        console.log(
            chalk.yellow("    ⚠ Could not dismiss dialogs (might not exist)")
        );
    }
}

export async function loginToAsana(page, email, password) {
    console.log(chalk.gray("  → Logging into Asana..."));

    try {
        // Navigate to login page - use load instead of domcontentloaded for more reliability
        console.log(chalk.gray("  → Navigating to login page..."));
        await page.goto("https://app.asana.com/-/login", {
            waitUntil: "load",
            timeout: 90000, // Increased timeout
        });

        // Wait for the page to be ready
        await page.waitForTimeout(3000);

        // Step 1: Enter email and click Continue
        console.log(chalk.gray("  → Step 1: Entering email..."));
        await page.waitForSelector('input[type="email"]', { timeout: 20000 });
        await page.fill('input[type="email"]', email);

        // Simply press Enter - most reliable method
        console.log(chalk.gray("  → Submitting email (pressing Enter)..."));
        await page.waitForTimeout(500);
        await page.press('input[type="email"]', "Enter");

        // Step 2: Wait for password page and enter password
        console.log(chalk.gray("  → Step 2: Waiting for password field..."));
        await page.waitForSelector('input[type="password"]', {
            timeout: 20000,
        });

        await page.waitForTimeout(1000);
        console.log(chalk.gray("  → Entering password..."));
        await page.fill('input[type="password"]', password);

        // Simply press Enter - most reliable method
        console.log(chalk.gray("  → Submitting password (pressing Enter)..."));
        await page.waitForTimeout(500);
        await page.press('input[type="password"]', "Enter");

        // Wait for navigation to home page
        console.log(chalk.gray("  → Waiting for home page to load..."));
        // Asana uses URLs like /1/[workspace-id]/home, not /0/
        await page.waitForURL("**/app.asana.com/**", { timeout: 60000 });

        // Wait for the page to load
        await page.waitForLoadState("load", { timeout: 30000 });

        // Wait for any initial animations/modals to complete
        await page.waitForTimeout(5000);

        // Dismiss any signup/onboarding dialogs
        await dismissDialogs(page);

        console.log(chalk.green("  ✓ Logged in successfully"));
        return true;
    } catch (error) {
        console.error(chalk.red("  ✗ Login failed:"), error.message);
        console.log(chalk.yellow("  ℹ Current URL:"), page.url());

        // Take a screenshot for debugging
        try {
            await page.screenshot({
                path: "./debug-login-failed.png",
                fullPage: true,
            });
            console.log(
                chalk.yellow("  ℹ Screenshot saved to: debug-login-failed.png")
            );
        } catch (e) {
            // Ignore screenshot errors
        }

        throw new Error(`Login failed: ${error.message}`);
    }
}

export async function navigateToPage(page, pageName) {
    console.log(chalk.gray(`  → Navigating to ${pageName} page...`));

    // Don't hardcode URLs - just navigate based on current workspace
    // After login, we're already in the workspace, so use relative navigation
    const currentUrl = page.url();
    const workspaceMatch = currentUrl.match(/app\.asana\.com\/(\d+)\//);

    let targetUrl;
    if (workspaceMatch) {
        const workspaceId = workspaceMatch[1];
        const pageUrls = {
            home: `https://app.asana.com/${workspaceId}/home`,
            projects: `https://app.asana.com/${workspaceId}/projects`,
            tasks: `https://app.asana.com/${workspaceId}/tasks`,
        };
        targetUrl = pageUrls[pageName.toLowerCase()];
    } else {
        // Fallback to /0/ if we can't detect workspace
        const pageUrls = {
            home: "https://app.asana.com/0/home",
            projects: "https://app.asana.com/0/projects",
            tasks: "https://app.asana.com/0/my-tasks",
        };
        targetUrl = pageUrls[pageName.toLowerCase()];
    }

    if (!targetUrl) {
        throw new Error(`Unknown page: ${pageName}`);
    }

    // Use load for better reliability
    await page.goto(targetUrl, { waitUntil: "load", timeout: 90000 });

    // Wait for content to load
    await page.waitForTimeout(5000);

    // Dismiss any dialogs that appear
    await dismissDialogs(page);

    console.log(chalk.green(`  ✓ Loaded ${pageName} page`));
}
