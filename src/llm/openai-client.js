import { GoogleGenerativeAI } from "@google/generative-ai";
import chalk from "chalk";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL = process.env.LLM_MODEL || "gemini-1.5-flash";

export async function analyzeWithGPT(prompt, systemPrompt, options = {}) {
    const { model = MODEL, temperature = 0.7, maxTokens = 4096 } = options;

    try {
        const geminiModel = genAI.getGenerativeModel({
            model,
            generationConfig: {
                temperature,
                maxOutputTokens: maxTokens,
            },
        });

        // Combine system prompt with user prompt
        const fullPrompt = `${systemPrompt}\n\n${prompt}`;

        const result = await geminiModel.generateContent(fullPrompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error(chalk.red("Gemini API Error:"), error.message);
        throw error;
    }
}

export async function generateComponentCode(
    componentData,
    framework = "react"
) {
    console.log(
        chalk.gray(`  → Generating ${componentData.name} component...`)
    );

    const systemPrompt = `You are an expert frontend developer specializing in ${framework} and Tailwind CSS.
Generate high-quality, production-ready code that matches the exact visual design provided.
Focus on:
- Pixel-perfect styling using Tailwind utility classes
- Proper component structure and hierarchy
- Accessibility (ARIA labels, semantic HTML)
- Clean, readable code with proper naming conventions
- Responsive design
Return ONLY the code, no explanations.`;

    const prompt = `Generate a ${framework} component based on this structure:

Component Name: ${componentData.name}
DOM Structure:
${JSON.stringify(componentData.domStructure, null, 2)}

Interactive Elements:
${JSON.stringify(componentData.interactiveElements, null, 2)}

Requirements:
- Use Tailwind CSS for all styling
- Match the exact colors, spacing, and layout
- Include all interactive elements (buttons, inputs, etc.)
- Use proper semantic HTML
- Add appropriate ARIA labels
- Make it responsive

Generate the complete component code.`;

    const code = await analyzeWithGPT(prompt, systemPrompt, {
        temperature: 0.3,
        maxTokens: 8000,
    });

    return code;
}

export async function inferDataSchema(apiCalls) {
    console.log(chalk.gray("  → Inferring data schema from API responses..."));

    const systemPrompt = `You are a database schema expert. Analyze API responses and infer the underlying database schema.
Generate a SQLite schema that captures:
- All entities and their relationships
- Appropriate data types
- Primary and foreign keys
- Indexes for common queries
- Constraints (NOT NULL, UNIQUE, etc.)

Return ONLY the SQL schema, no explanations.`;

    const prompt = `Analyze these API responses and generate a database schema:

${JSON.stringify(apiCalls.slice(0, 20), null, 2)}

Generate a complete SQLite schema with:
1. CREATE TABLE statements for all entities
2. Proper relationships (foreign keys)
3. Indexes for performance
4. Sample data if helpful

Return only SQL code.`;

    const schema = await analyzeWithGPT(prompt, systemPrompt, {
        temperature: 0.2,
        maxTokens: 8000,
    });

    return schema;
}

export async function generateAPIEndpoint(apiCall) {
    console.log(
        chalk.gray(`  → Generating endpoint: ${apiCall.method} ${apiCall.url}`)
    );

    const systemPrompt = `You are a backend API developer specializing in FastAPI.
Generate production-ready API endpoints that match the observed behavior.
Focus on:
- Proper request/response models using Pydantic
- Input validation and error handling
- RESTful design principles
- Clean, maintainable code
- Docstrings and type hints

Return ONLY the code, no explanations.`;

    const prompt = `Generate a FastAPI endpoint based on this observed API call:

Method: ${apiCall.method}
URL: ${apiCall.url}
Request Headers: ${JSON.stringify(apiCall.headers, null, 2)}
Request Body: ${apiCall.postData || "None"}

Response Status: ${apiCall.response.status}
Response Headers: ${JSON.stringify(apiCall.response.headers, null, 2)}
Response Body: ${JSON.stringify(apiCall.response.body, null, 2)}

Generate:
1. Pydantic models for request/response
2. The FastAPI route handler
3. Proper validation and error handling

Return the complete code for this endpoint.`;

    const code = await analyzeWithGPT(prompt, systemPrompt, {
        temperature: 0.3,
        maxTokens: 4096,
    });

    return code;
}

export async function generateTestCases(apiCall) {
    console.log(chalk.gray(`  → Generating test cases for ${apiCall.url}`));

    const systemPrompt = `You are a QA engineer specializing in API testing.
Generate comprehensive test cases that cover:
- Happy path scenarios
- Edge cases (empty values, null, very long strings)
- Invalid inputs
- Boundary conditions
- Error scenarios

Return test cases as a structured JSON array.`;

    const prompt = `Generate exhaustive test cases for this API endpoint:

Method: ${apiCall.method}
URL: ${apiCall.url}
Request Parameters: ${JSON.stringify(apiCall.postData, null, 2)}
Response: ${JSON.stringify(apiCall.response.body, null, 2)}

Generate test cases covering:
1. Valid inputs with expected responses
2. Missing required fields
3. Invalid data types
4. Empty/null values
5. Very long strings
6. Special characters
7. Boundary values

Return as JSON array with format:
[
  {
    "description": "Test case description",
    "input": { /* test input */ },
    "expectedStatus": 200,
    "expectedResponse": { /* expected output */ }
  }
]`;

    const testCases = await analyzeWithGPT(prompt, systemPrompt, {
        temperature: 0.4,
        maxTokens: 4096,
    });

    try {
        return JSON.parse(testCases);
    } catch {
        return testCases;
    }
}

export async function analyzeUIPatterns(domStructure) {
    console.log(
        chalk.gray("  → Analyzing UI patterns and component hierarchy...")
    );

    const systemPrompt = `You are a UI/UX expert analyzing web application structures.
Identify reusable components, design patterns, and the component hierarchy.
Return your analysis as structured JSON.`;

    const prompt = `Analyze this DOM structure and identify:
1. Reusable components (buttons, cards, forms, etc.)
2. Layout patterns (header, sidebar, main content)
3. Component hierarchy
4. Design system patterns (colors, spacing, typography)

DOM Structure:
${JSON.stringify(domStructure, null, 2)}

Return as JSON:
{
  "components": [
    {
      "name": "ComponentName",
      "type": "button|card|form|etc",
      "occurrences": number,
      "props": []
    }
  ],
  "layout": {
    "type": "sidebar|navbar|etc",
    "structure": {}
  },
  "designSystem": {
    "colors": [],
    "spacing": [],
    "typography": []
  }
}`;

    const analysis = await analyzeWithGPT(prompt, systemPrompt, {
        temperature: 0.5,
        maxTokens: 4096,
    });

    try {
        return JSON.parse(analysis);
    } catch {
        return analysis;
    }
}
