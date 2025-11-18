import chalk from "chalk";

export async function analyzeDOMStructure(page) {
    console.log(chalk.gray("  → Analyzing DOM structure..."));

    const domData = await page.evaluate(() => {
        // Recursive function to extract element data
        function extractElement(element, depth = 0) {
            if (depth > 15 || !element) return null; // Prevent infinite recursion

            const computedStyle = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();

            // Get relevant CSS properties
            const styles = {
                display: computedStyle.display,
                position: computedStyle.position,
                width: computedStyle.width,
                height: computedStyle.height,
                margin: computedStyle.margin,
                padding: computedStyle.padding,
                backgroundColor: computedStyle.backgroundColor,
                color: computedStyle.color,
                fontSize: computedStyle.fontSize,
                fontFamily: computedStyle.fontFamily,
                fontWeight: computedStyle.fontWeight,
                borderRadius: computedStyle.borderRadius,
                border: computedStyle.border,
                boxShadow: computedStyle.boxShadow,
                flexDirection: computedStyle.flexDirection,
                justifyContent: computedStyle.justifyContent,
                alignItems: computedStyle.alignItems,
                gridTemplateColumns: computedStyle.gridTemplateColumns,
            };

            // Get attributes
            const attributes = {};
            for (let attr of element.attributes || []) {
                attributes[attr.name] = attr.value;
            }

            // Extract children
            const children = [];
            for (let child of element.children || []) {
                // Skip script and style elements
                if (child.tagName === "SCRIPT" || child.tagName === "STYLE")
                    continue;

                // Only include visible elements
                const childRect = child.getBoundingClientRect();
                if (childRect.width > 0 && childRect.height > 0) {
                    const childData = extractElement(child, depth + 1);
                    if (childData) children.push(childData);
                }
            }

            return {
                tag: element.tagName.toLowerCase(),
                id: element.id || null,
                classes: Array.from(element.classList),
                attributes,
                styles,
                textContent:
                    element.childNodes.length === 1 &&
                    element.childNodes[0].nodeType === 3
                        ? element.textContent.trim()
                        : null,
                position: {
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height,
                },
                children,
            };
        }

        // Find main app container
        const appRoot =
            document.querySelector('[role="main"]') ||
            document.querySelector("#root") ||
            document.querySelector(".app") ||
            document.body;

        return {
            title: document.title,
            url: window.location.href,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
            },
            structure: extractElement(appRoot),
        };
    });

    console.log(chalk.green("  ✓ DOM structure analyzed"));
    return domData;
}

export async function extractInteractiveElements(page) {
    console.log(chalk.gray("  → Extracting interactive elements..."));

    const interactions = await page.evaluate(() => {
        const elements = [];

        // Find all buttons
        document.querySelectorAll('button, [role="button"]').forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                elements.push({
                    type: "button",
                    text: el.textContent.trim(),
                    ariaLabel: el.getAttribute("aria-label"),
                    classes: Array.from(el.classList),
                    position: {
                        x: rect.x,
                        y: rect.y,
                        width: rect.width,
                        height: rect.height,
                    },
                });
            }
        });

        // Find all inputs
        document.querySelectorAll("input, textarea").forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                elements.push({
                    type: "input",
                    inputType: el.type,
                    placeholder: el.placeholder,
                    name: el.name,
                    classes: Array.from(el.classList),
                    position: {
                        x: rect.x,
                        y: rect.y,
                        width: rect.width,
                        height: rect.height,
                    },
                });
            }
        });

        // Find all links
        document.querySelectorAll("a").forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                elements.push({
                    type: "link",
                    text: el.textContent.trim(),
                    href: el.href,
                    classes: Array.from(el.classList),
                    position: {
                        x: rect.x,
                        y: rect.y,
                        width: rect.width,
                        height: rect.height,
                    },
                });
            }
        });

        return elements;
    });

    console.log(
        chalk.green(`  ✓ Found ${interactions.length} interactive elements`)
    );
    return interactions;
}
