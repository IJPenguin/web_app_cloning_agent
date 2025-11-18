import fs from "fs-extra";
import path from "path";
import chalk from "chalk";

export async function captureNetworkTraffic(page, outputDir) {
    const apiCalls = [];
    const requestMap = new Map();

    console.log(chalk.gray("  → Setting up network capture..."));

    // Capture requests
    page.on("request", (request) => {
        const url = request.url();
        const method = request.method();

        // Only capture API calls (filter out static assets)
        if (isApiCall(url)) {
            const requestData = {
                id: generateId(),
                url,
                method,
                headers: request.headers(),
                postData: request.postData(),
                timestamp: Date.now(),
            };

            requestMap.set(request, requestData);
        }
    });

    // Capture responses
    page.on("response", async (response) => {
        const request = response.request();
        const requestData = requestMap.get(request);

        if (requestData && isApiCall(response.url())) {
            try {
                const responseBody = await response.text().catch(() => null);
                const contentType = response.headers()["content-type"] || "";

                const apiCall = {
                    ...requestData,
                    response: {
                        status: response.status(),
                        headers: response.headers(),
                        body:
                            contentType.includes("application/json") &&
                            responseBody
                                ? JSON.parse(responseBody)
                                : responseBody,
                        contentType,
                    },
                };

                apiCalls.push(apiCall);

                // Log captured API call
                console.log(
                    chalk.gray(
                        `    • ${apiCall.method} ${getPathFromUrl(
                            apiCall.url
                        )} [${apiCall.response.status}]`
                    )
                );
            } catch (error) {
                console.error(
                    chalk.red(
                        `    ✗ Error capturing response: ${error.message}`
                    )
                );
            }

            requestMap.delete(request);
        }
    });

    return {
        getApiCalls: () => apiCalls,
        saveToFile: async (filename) => {
            const filepath = path.join(outputDir, filename);
            await fs.ensureDir(outputDir);
            await fs.writeJson(filepath, apiCalls, { spaces: 2 });
            console.log(
                chalk.green(
                    `  ✓ Saved ${apiCalls.length} API calls to ${filename}`
                )
            );
            return apiCalls;
        },
    };
}

function isApiCall(url) {
    // Filter for actual API calls
    const apiPatterns = ["/api/", "/graphql", "/rest/", "app.asana.com/api"];

    const excludePatterns = [
        ".js",
        ".css",
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".svg",
        ".woff",
        ".woff2",
        ".ttf",
        ".ico",
        "analytics",
        "tracking",
        "segment.io",
        "google-analytics",
    ];

    const lowerUrl = url.toLowerCase();

    // Check if it matches API patterns
    const isApi = apiPatterns.some((pattern) => lowerUrl.includes(pattern));

    // Check if it's not in exclude list
    const isNotExcluded = !excludePatterns.some((pattern) =>
        lowerUrl.includes(pattern)
    );

    return isApi && isNotExcluded;
}

function getPathFromUrl(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.pathname + urlObj.search;
    } catch {
        return url;
    }
}

function generateId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
