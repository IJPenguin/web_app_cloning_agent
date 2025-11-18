import {
    generateComponentCode,
    analyzeUIPatterns,
    inferDataSchema,
} from "../llm/openai-client.js";
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";

export async function generateFrontend(scrapedData, outputDir) {
    await fs.ensureDir(outputDir);

    console.log(chalk.cyan("  Analyzing UI patterns..."));

    // Analyze all pages to identify common components
    const allComponents = [];
    const designPatterns = [];

    for (const page of scrapedData.pages) {
        const patterns = await analyzeUIPatterns(page.domStructure);
        designPatterns.push(patterns);

        // Generate component for each page
        const componentCode = await generateComponentCode({
            name: `${capitalize(page.name)}Page`,
            domStructure: page.domStructure,
            interactiveElements: page.interactiveElements,
        });

        allComponents.push({
            name: `${capitalize(page.name)}Page`,
            code: componentCode,
            path: `src/pages/${page.name}.jsx`,
        });
    }

    // Create project structure
    await createReactProject(outputDir, allComponents, designPatterns);

    console.log(chalk.green(`  ✓ Frontend generated in ${outputDir}`));
}

async function createReactProject(outputDir, components, designPatterns) {
    // Create directory structure
    const dirs = [
        "src/pages",
        "src/components",
        "src/hooks",
        "src/utils",
        "src/styles",
        "public",
    ];

    for (const dir of dirs) {
        await fs.ensureDir(path.join(outputDir, dir));
    }

    // Generate package.json
    const packageJson = {
        name: "asana-clone",
        version: "1.0.0",
        private: true,
        scripts: {
            dev: "next dev",
            build: "next build",
            start: "next start",
            test: "playwright test",
        },
        dependencies: {
            react: "^18.2.0",
            "react-dom": "^18.2.0",
            next: "^14.0.0",
            "@heroicons/react": "^2.0.18",
        },
        devDependencies: {
            "@playwright/test": "^1.40.0",
            autoprefixer: "^10.4.16",
            postcss: "^8.4.32",
            tailwindcss: "^3.3.6",
        },
    };

    await fs.writeJson(path.join(outputDir, "package.json"), packageJson, {
        spaces: 2,
    });

    // Generate tailwind.config.js
    const tailwindConfig = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        asana: {
          primary: '#f06a6a',
          secondary: '#ffc2c2',
          dark: '#151b26',
          gray: '#9ca6af'
        }
      }
    },
  },
  plugins: [],
}`;

    await fs.writeFile(
        path.join(outputDir, "tailwind.config.js"),
        tailwindConfig
    );

    // Generate postcss.config.js
    const postcssConfig = `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;

    await fs.writeFile(
        path.join(outputDir, "postcss.config.js"),
        postcssConfig
    );

    // Generate global styles
    const globalStyles = `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`;

    await fs.writeFile(
        path.join(outputDir, "src/styles/globals.css"),
        globalStyles
    );

    // Write component files
    for (const component of components) {
        const filePath = path.join(outputDir, component.path);
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, component.code);
        console.log(chalk.gray(`    • Created ${component.path}`));
    }

    // Generate App.jsx
    const appCode = `import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/home';
import ProjectsPage from './pages/projects';
import TasksPage from './pages/tasks';
import './styles/globals.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex space-x-8">
                <Link to="/" className="inline-flex items-center px-1 pt-1 text-gray-900">
                  Home
                </Link>
                <Link to="/projects" className="inline-flex items-center px-1 pt-1 text-gray-500 hover:text-gray-900">
                  Projects
                </Link>
                <Link to="/tasks" className="inline-flex items-center px-1 pt-1 text-gray-500 hover:text-gray-900">
                  Tasks
                </Link>
              </div>
            </div>
          </div>
        </nav>
        
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;`;

    await fs.writeFile(path.join(outputDir, "src/App.jsx"), appCode);

    // Generate README
    const readme = `# Asana Clone - Frontend

Generated React + Tailwind frontend clone of Asana.

## Setup

\`\`\`bash
npm install
npm run dev
\`\`\`

Visit http://localhost:3000

## Pages

- Home: /
- Projects: /projects
- Tasks: /tasks

## Testing

\`\`\`bash
npm test
\`\`\`
`;

    await fs.writeFile(path.join(outputDir, "README.md"), readme);
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
