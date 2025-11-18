# Asana Workflow Scraping

## Complete Flow

The agent performs the following automated workflow:

### 1. **Login** ✅

-   Navigates to https://app.asana.com/-/login
-   Enters email → presses Enter
-   Enters password → presses Enter
-   Lands on home page

### 2. **Home Page** ✅

-   URL: `https://app.asana.com/1/[workspace-id]/home`
-   Scrapes home page DOM, network calls, screenshots
-   Dismisses any dialogs/modals

### 3. **Create Project Flow** ✅

**Step 3a:** Navigate to Create Project

-   Clicks "Projects" in sidebar
-   Clicks "New project" button
-   URL: `https://app.asana.com/1/[workspace-id]/create-project`
-   Scrapes the project creation menu

**Step 3b:** Select Blank Project

-   Clicks "Blank project" option
-   URL: `https://app.asana.com/0/projects/new/blank`
-   Scrapes the blank project form

**Step 3c:** Create Project

-   Fills in project name: "Test Project"
-   Clicks "Continue"
-   Accepts default view options
-   Clicks "Create Project"
-   URL: `https://app.asana.com/1/[workspace-id]/project/[project-id]/list`
-   Scrapes the new project page

### 4. **My Tasks Page** ✅

-   Clicks "My tasks" in sidebar
-   URL: `https://app.asana.com/1/[workspace-id]/project/[tasks-id]/list/...`
-   Scrapes My Tasks page

## What Gets Scraped

For each page/step, the agent captures:

1. **DOM Structure** - Complete HTML hierarchy with computed CSS styles
2. **Interactive Elements** - All buttons, inputs, links with their properties
3. **Network Traffic** - All API calls (requests + responses)
4. **Screenshots** - Full page + individual component screenshots
5. **Page Metadata** - URL, timestamp, element positions

## Output Structure

```
output/
├── scraped-data.json              # Master file with all page data
├── home-full.png                  # Home page screenshot
├── home-api-calls.json            # Home page API calls
├── create-project-menu-full.png   # Create project menu
├── create-project-menu-api-calls.json
├── blank-project-form-full.png    # Blank project form
├── blank-project-form-api-calls.json
├── project-view-full.png          # New project page
├── project-view-api-calls.json
├── my-tasks-full.png              # My Tasks page
├── my-tasks-api-calls.json
└── screenshots/                   # Individual component screenshots
    ├── home-header.png
    ├── home-sidebar.png
    ├── home-main.png
    └── ...
```

## Features Captured

### Home Page

-   My tasks widget
-   Learn Asana section
-   Navigation sidebar
-   Header with search
-   Task list view

### Project Creation Flow

-   Workflow gallery (templates)
-   Blank project option
-   Project name input
-   View selection (List, Board, Timeline, etc.)
-   Default view configurations

### Project Page

-   Project header
-   Task list view
-   Add task functionality
-   Project settings
-   Custom fields

### My Tasks

-   Task list with filters
-   Task details
-   Due dates
-   Assignees
-   Status indicators

## How It Works

The workflow scraper:

1. Uses **multiple fallback selectors** to find buttons/inputs (handles UI changes)
2. **Dismisses dialogs** automatically at each step
3. **Waits appropriately** for page loads and animations
4. **Captures network traffic** to understand API structure
5. **Takes screenshots** for visual reference
6. **Analyzes DOM** to extract component structure

## Running the Agent

```bash
npm start
```

The agent will:

1. Complete the entire workflow (5-10 minutes)
2. Generate code for frontend + backend
3. Create visual tests

All interactions are automated - just watch the browser!
    