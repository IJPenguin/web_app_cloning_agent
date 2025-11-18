import chalk from "chalk";

/**
 * Helper function to dismiss any dialogs/modals
 */
async function dismissDialogs(page) {
    try {
        const closeSelectors = [
            'button[aria-label="Close"]',
            'button[aria-label="Dismiss"]',
            '[role="dialog"] button:has-text("×")',
            'button:has-text("Maybe later")',
            'button:has-text("Skip")',
        ];

        for (const selector of closeSelectors) {
            try {
                const button = await page.$(selector);
                if (button && (await button.isVisible())) {
                    await button.click();
                    await page.waitForTimeout(1000);
                }
            } catch (e) {
                // Continue
            }
        }

        await page.keyboard.press("Escape");
        await page.waitForTimeout(500);
    } catch (error) {
        // Ignore
    }
}

/**
 * Navigate to home page and scrape it
 */
export async function scrapeHomePage(page, outputDir) {
    console.log(chalk.cyan("\n📄 Scraping Home page..."));

    // Already on home page after login, just wait for it to load
    await page.waitForTimeout(3000);
    await dismissDialogs(page);

    const url = page.url();
    console.log(chalk.gray(`  → Current URL: ${url}`));

    return {
        name: "home",
        url: url,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Click on Projects in sidebar and open the create project flow
 */
export async function navigateToCreateProject(page) {
    console.log(chalk.cyan("\n📄 Navigating to Create Project..."));

    try {
        // Click on Projects in sidebar to open menu
        console.log(chalk.gray("  → Clicking Projects in sidebar..."));

        // Try multiple selectors for Projects
        const projectsSelectors = [
            'text="Projects"',
            '[aria-label*="Projects"]',
            'a:has-text("Projects")',
            'button:has-text("Projects")',
        ];

        let clicked = false;
        for (const selector of projectsSelectors) {
            try {
                await page.click(selector, { timeout: 3000 });
                clicked = true;
                console.log(
                    chalk.gray(`    ✓ Clicked Projects using: ${selector}`)
                );
                break;
            } catch (e) {
                // Try next selector
            }
        }

        if (!clicked) {
            throw new Error("Could not find Projects button");
        }

        await page.waitForTimeout(2000);

        // Look for "New project" or "Create project" button
        console.log(chalk.gray("  → Looking for Create/New Project button..."));

        const createProjectSelectors = [
            'button:has-text("New project")',
            'div[role="button"]:has-text("New project")',
            '[role="button"]:has-text("New project")',
            'text="New project"',
            '[aria-label*="New project"]',
            'button:has-text("Create project")',
            'div[role="button"]:has-text("Create project")',
            // Look for + button that might create project
            "button:has(.PlusIcon)",
            '[aria-label*="Create"]',
        ];

        clicked = false;
        for (const selector of createProjectSelectors) {
            try {
                const element = await page.locator(selector).first();
                if (await element.isVisible()) {
                    await element.click();
                    console.log(
                        chalk.gray(
                            `    ✓ Clicked create button using: ${selector}`
                        )
                    );
                    clicked = true;
                    break;
                }
            } catch (e) {
                // Try next selector
                continue;
            }
        }

        if (!clicked) {
            // Try JavaScript approach as last resort
            console.log(
                chalk.yellow("  → Trying JavaScript click for New Project...")
            );
            clicked = await page.evaluate(() => {
                const elements = Array.from(
                    document.querySelectorAll(
                        'button, div[role="button"], [role="button"]'
                    )
                );
                const newProjectButton = elements.find(
                    (el) =>
                        el.textContent?.toLowerCase().includes("new project") ||
                        el.textContent?.toLowerCase().includes("create project")
                );
                if (newProjectButton) {
                    newProjectButton.click();
                    return true;
                }
                return false;
            });

            if (clicked) {
                console.log(chalk.gray("    ✓ Clicked using JavaScript"));
            }
        }

        if (!clicked) {
            // Save debug screenshot
            await page.screenshot({
                path: "./debug-create-project-button.png",
                fullPage: true,
            });
            console.log(
                chalk.yellow(
                    "  ℹ Screenshot saved to: debug-create-project-button.png"
                )
            );
            throw new Error(
                "Could not find or click New/Create Project button"
            );
        }

        await page.waitForTimeout(3000);
        console.log(chalk.gray(`  → Current URL: ${page.url()}`));

        return page.url();
    } catch (error) {
        console.error(
            chalk.red("  ✗ Error navigating to create project:"),
            error.message
        );
        throw error;
    }
}

/**
 * Scrape the create project page
 */
export async function scrapeCreateProjectPage(page, outputDir) {
    console.log(chalk.cyan("\n📄 Scraping Create Project page..."));

    // await dismissDialogs(page);
    const url = page.url();
    console.log(chalk.gray(`  → Current URL: ${url}`));

    return {
        name: "create-project",
        url: url,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Click on "Blank project" option
 */
export async function selectBlankProject(page) {
    console.log(chalk.cyan("\n📄 Selecting Blank Project..."));

    try {
        // Click on "Blank project" button
        console.log(chalk.gray("  → Looking for Blank project option..."));

        // Wait for the modal/dialog to appear first
        await page.waitForTimeout(3000);

        // Take a screenshot to debug
        await page.screenshot({
            path: "./debug-before-blank-click.png",
            fullPage: true,
        });
        console.log(
            chalk.gray(
                "  → Debug screenshot saved: debug-before-blank-click.png"
            )
        );

        // DIAGNOSTIC: Log all visible button-like elements
        const availableButtons = await page.evaluate(() => {
            const buttons = Array.from(
                document.querySelectorAll(
                    'button, div[role="button"], [role="button"]'
                )
            );
            return buttons
                .filter((el) => el.offsetParent !== null) // visible elements only
                .map((el) => ({
                    text: el.textContent?.trim().substring(0, 50),
                    tag: el.tagName,
                    role: el.getAttribute("role"),
                    classes: el.className,
                }))
                .slice(0, 20); // First 20 buttons
        });
        console.log(chalk.gray("  → Available buttons on page:"));
        availableButtons.forEach((btn) => {
            console.log(
                chalk.gray(`     - ${btn.tag} [${btn.role}]: "${btn.text}"`)
            );
        });

        // Try a simple text-based approach first
        let clicked = false;

        // Strategy 1: Wait for any element containing "Blank project" to be visible
        try {
            console.log(
                chalk.gray(
                    "  → Waiting for Blank project button to be visible..."
                )
            );
            await page.waitForSelector(':text("Blank project")', {
                timeout: 5000,
                state: "visible",
            });
            await page.click(':text("Blank project")');
            clicked = true;
            console.log(
                chalk.green("  ✓ Clicked Blank project using text selector")
            );
        } catch (e) {
            console.log(
                chalk.yellow("  → Text selector failed, trying alternatives...")
            );
        }

        // Strategy 2: Try specific class-based selectors
        if (!clicked) {
            const blankProjectSelectors = [
                'div[role="button"]:has-text("Blank project")',
                'button:has-text("Blank project")',
                '.ButtonPrimaryPresentation:has-text("Blank")',
                '[role="button"].ButtonThemeablePresentation:has-text("Blank")',
            ];

            for (const selector of blankProjectSelectors) {
                try {
                    const element = page.locator(selector).first();
                    if (await element.isVisible({ timeout: 2000 })) {
                        await element.click();
                        clicked = true;
                        console.log(
                            chalk.green(`  ✓ Clicked using: ${selector}`)
                        );
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }
        }

        // Strategy 3: JavaScript click
        if (!clicked) {
            console.log(chalk.yellow("  → Trying JavaScript click..."));
            clicked = await page.evaluate(() => {
                // Find all clickable elements
                const allElements = Array.from(document.querySelectorAll("*"));
                const blankButton = allElements.find((el) => {
                    const text = el.textContent || "";
                    const isVisible = el.offsetParent !== null;
                    const isClickable =
                        el.tagName === "BUTTON" ||
                        (el.tagName === "DIV" &&
                            el.getAttribute("role") === "button") ||
                        el.onclick !== null;

                    return (
                        isVisible &&
                        isClickable &&
                        text.includes("Blank project")
                    );
                });

                if (blankButton) {
                    blankButton.click();
                    return true;
                }
                return false;
            });

            if (clicked) {
                console.log(chalk.green("  ✓ Clicked using JavaScript"));
            }
        }

        if (!clicked) {
            await page.screenshot({
                path: "./debug-blank-project-not-found.png",
                fullPage: true,
            });
            throw new Error("Could not find or click Blank project button");
        }

        // Wait for form to load
        console.log(chalk.gray("  → Waiting for project creation form..."));
        await page.waitForTimeout(3000);

        // Verify we're on the form
        try {
            await page.waitForSelector(
                'input[placeholder*="Project name"], input[placeholder*="Name"], input[name*="name"]',
                { timeout: 5000 }
            );
            console.log(chalk.green("  ✓ Project creation form loaded"));
        } catch (e) {
            console.log(
                chalk.yellow(
                    "  ⚠ Form input not detected, proceeding anyway..."
                )
            );
        }

        await page.waitForTimeout(1000);
        console.log(chalk.gray(`  → Current URL: ${page.url()}`));

        return page.url();
    } catch (error) {
        console.error(
            chalk.red("  ✗ Error selecting blank project:"),
            error.message
        );

        // Take screenshot for debugging
        try {
            await page.screenshot({
                path: "./debug-blank-project.png",
                fullPage: true,
            });
            console.log(
                chalk.yellow("  ℹ Screenshot saved to: debug-blank-project.png")
            );
        } catch (e) {
            // Ignore
        }

        throw error;
    }
}

/**
 * Fill in project name and continue
 */
export async function createNewProject(page, projectName = "New Project") {
    console.log(chalk.cyan("\n📄 Creating New Project..."));

    try {
        // Find project name input and fill it
        console.log(chalk.gray(`  → Entering project name: ${projectName}...`));

        const nameInputSelectors = [
            'input[placeholder*="Project name"]',
            'input[placeholder*="Name"]',
            'input[name*="name"]',
            'input[type="text"]',
        ];

        for (const selector of nameInputSelectors) {
            try {
                const input = await page.$(selector);
                if (input && (await input.isVisible())) {
                    await input.fill(projectName);
                    break;
                }
            } catch (e) {
                // Try next selector
            }
        }

        await page.waitForTimeout(1000);

        // Click Continue button
        console.log(chalk.gray("  → Clicking Continue..."));

        const continueSelectors = [
            'button:has-text("Continue")',
            'button[type="submit"]',
            'button:has-text("Next")',
        ];

        for (const selector of continueSelectors) {
            try {
                await page.click(selector, { timeout: 3000 });
                break;
            } catch (e) {
                // Try next selector
            }
        }

        await page.waitForTimeout(3000);

        // On the views selection page, click "Create Project" with default options
        console.log(
            chalk.gray("  → Clicking Create Project with default views...")
        );

        const createSelectors = [
            'button:has-text("Create project")',
            'button:has-text("Create Project")',
            'button[type="submit"]',
        ];

        for (const selector of createSelectors) {
            try {
                await page.click(selector, { timeout: 3000 });
                break;
            } catch (e) {
                // Try next selector
            }
        }

        await page.waitForTimeout(5000);
        await dismissDialogs(page);

        console.log(chalk.gray(`  → Project created! URL: ${page.url()}`));

        return page.url();
    } catch (error) {
        console.error(chalk.red("  ✗ Error creating project:"), error.message);
        throw error;
    }
}

/**
 * Scrape the project page
 */
export async function scrapeProjectPage(page, outputDir) {
    console.log(chalk.cyan("\n📄 Scraping Project page..."));

    await dismissDialogs(page);
    const url = page.url();
    console.log(chalk.gray(`  → Current URL: ${url}`));

    return {
        name: "project",
        url: url,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Navigate to My Tasks from sidebar
 */
export async function navigateToMyTasks(page) {
    console.log(chalk.cyan("\n📄 Navigating to My Tasks..."));

    try {
        // Click on "My tasks" in sidebar
        console.log(chalk.gray("  → Clicking My tasks in sidebar..."));

        const myTasksSelectors = [
            'text="My tasks"',
            'a:has-text("My tasks")',
            '[aria-label*="My tasks"]',
            'button:has-text("My tasks")',
        ];

        for (const selector of myTasksSelectors) {
            try {
                await page.click(selector, { timeout: 3000 });
                break;
            } catch (e) {
                // Try next selector
            }
        }

        await page.waitForTimeout(5000);
        await dismissDialogs(page);

        console.log(chalk.gray(`  → Current URL: ${page.url()}`));

        return page.url();
    } catch (error) {
        console.error(
            chalk.red("  ✗ Error navigating to My Tasks:"),
            error.message
        );
        throw error;
    }
}

/**
 * Scrape My Tasks page
 */
export async function scrapeMyTasksPage(page, outputDir) {
    console.log(chalk.cyan("\n📄 Scraping My Tasks page..."));

    await dismissDialogs(page);
    const url = page.url();
    console.log(chalk.gray(`  → Current URL: ${url}`));

    return {
        name: "my-tasks",
        url: url,
        timestamp: new Date().toISOString(),
    };
}
