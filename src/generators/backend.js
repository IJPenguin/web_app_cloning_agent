import {
    generateAPIEndpoint,
    generateTestCases,
    inferDataSchema,
} from "../llm/openai-client.js";
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";

export async function generateBackend(scrapedData, outputDir) {
    await fs.ensureDir(outputDir);

    console.log(chalk.cyan("  Collecting API calls..."));

    // Collect all API calls from all pages
    const allApiCalls = [];
    for (const page of scrapedData.pages) {
        const apiCallsFile = path.join(
            process.env.OUTPUT_DIR || "./output",
            `${page.name}-api-calls.json`
        );
        if (await fs.pathExists(apiCallsFile)) {
            const apiCalls = await fs.readJson(apiCallsFile);
            allApiCalls.push(...apiCalls);
        }
    }

    console.log(chalk.gray(`  Found ${allApiCalls.length} API calls`));

    // Generate database schema
    console.log(chalk.cyan("  Generating database schema..."));
    const schema = await inferDataSchema(allApiCalls);
    await fs.writeFile(path.join(outputDir, "schema.sql"), schema);
    console.log(chalk.green("  ✓ Generated schema.sql"));

    // Create FastAPI project structure
    await createFastAPIProject(outputDir, allApiCalls);

    console.log(chalk.green(`  ✓ Backend generated in ${outputDir}`));
}

async function createFastAPIProject(outputDir, apiCalls) {
    // Create directory structure
    const dirs = ["app/api", "app/models", "app/schemas", "app/db", "tests"];

    for (const dir of dirs) {
        await fs.ensureDir(path.join(outputDir, dir));
    }

    // Generate requirements.txt
    const requirements = `fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
sqlalchemy==2.0.23
aiosqlite==0.19.0
python-dotenv==1.0.0
pytest==7.4.3
httpx==0.25.2`;

    await fs.writeFile(path.join(outputDir, "requirements.txt"), requirements);

    // Generate main.py
    const mainPy = `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import tasks, projects, home
from app.db.database import init_db

app = FastAPI(
    title="Asana Clone API",
    description="Backend API for Asana clone",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
@app.on_event("startup")
async def startup():
    await init_db()

# Include routers
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(home.router, prefix="/api/home", tags=["home"])

@app.get("/")
async def root():
    return {"message": "Asana Clone API"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
`;

    await fs.writeFile(path.join(outputDir, "main.py"), mainPy);

    // Generate database.py
    const databasePy = `from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./asana_clone.db")

engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

async def init_db():
    async with engine.begin() as conn:
        # Read and execute schema.sql
        with open("schema.sql", "r") as f:
            schema = f.read()
            # Split by semicolon and execute each statement
            for statement in schema.split(";"):
                if statement.strip():
                    await conn.execute(statement)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
`;

    await fs.writeFile(path.join(outputDir, "app/db/database.py"), databasePy);

    // Generate empty __init__.py files
    const initDirs = [
        "app",
        "app/api",
        "app/models",
        "app/schemas",
        "app/db",
        "tests",
    ];
    for (const dir of initDirs) {
        await fs.writeFile(path.join(outputDir, dir, "__init__.py"), "");
    }

    // Generate sample API routes
    await generateSampleRoutes(outputDir, apiCalls);

    // Generate OpenAPI spec
    await generateOpenAPISpec(outputDir, apiCalls);

    // Generate test cases
    await generateTestFiles(outputDir, apiCalls);

    // Generate .env template
    const envTemplate = `DATABASE_URL=sqlite+aiosqlite:///./asana_clone.db
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30`;

    await fs.writeFile(path.join(outputDir, ".env.template"), envTemplate);

    // Generate README
    const readme = `# Asana Clone - Backend

Generated FastAPI backend clone of Asana.

## Setup

\`\`\`bash
pip install -r requirements.txt
\`\`\`

## Database Setup

The schema will be automatically created from schema.sql on first run.

## Run

\`\`\`bash
uvicorn main:app --reload
\`\`\`

API will be available at http://localhost:8000
API docs at http://localhost:8000/docs

## Testing

\`\`\`bash
pytest
\`\`\`

## API Documentation

See api.yml for OpenAPI specification.
`;

    await fs.writeFile(path.join(outputDir, "README.md"), readme);
}

async function generateSampleRoutes(outputDir, apiCalls) {
    // Group API calls by resource
    const resources = {
        tasks: apiCalls.filter((call) => call.url.includes("/tasks")),
        projects: apiCalls.filter((call) => call.url.includes("/projects")),
        home: apiCalls.filter(
            (call) => call.url.includes("/home") || call.url.includes("/user")
        ),
    };

    for (const [resource, calls] of Object.entries(resources)) {
        if (calls.length === 0) continue;

        console.log(chalk.gray(`    • Generating ${resource} routes...`));

        const routerCode = `from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.schemas.${resource} import ${capitalize(resource)}Create, ${capitalize(
            resource
        )}Response
from typing import List

router = APIRouter()

@router.get("/", response_model=List[${capitalize(resource)}Response])
async def get_${resource}(db: AsyncSession = Depends(get_db)):
    """Get all ${resource}"""
    # TODO: Implement database query
    return []

@router.get("/{id}", response_model=${capitalize(resource)}Response)
async def get_${resource.slice(
            0,
            -1
        )}(id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific ${resource.slice(0, -1)} by ID"""
    # TODO: Implement database query
    raise HTTPException(status_code=404, detail="${capitalize(
        resource.slice(0, -1)
    )} not found")

@router.post("/", response_model=${capitalize(
            resource
        )}Response, status_code=201)
async def create_${resource.slice(0, -1)}(
    ${resource.slice(0, -1)}: ${capitalize(resource)}Create,
    db: AsyncSession = Depends(get_db)
):
    """Create a new ${resource.slice(0, -1)}"""
    # TODO: Implement database insert
    return ${resource.slice(0, -1)}

@router.put("/{id}", response_model=${capitalize(resource)}Response)
async def update_${resource.slice(0, -1)}(
    id: int,
    ${resource.slice(0, -1)}: ${capitalize(resource)}Create,
    db: AsyncSession = Depends(get_db)
):
    """Update a ${resource.slice(0, -1)}"""
    # TODO: Implement database update
    raise HTTPException(status_code=404, detail="${capitalize(
        resource.slice(0, -1)
    )} not found")

@router.delete("/{id}", status_code=204)
async def delete_${resource.slice(
            0,
            -1
        )}(id: int, db: AsyncSession = Depends(get_db)):
    """Delete a ${resource.slice(0, -1)}"""
    # TODO: Implement database delete
    raise HTTPException(status_code=404, detail="${capitalize(
        resource.slice(0, -1)
    )} not found")
`;

        await fs.writeFile(
            path.join(outputDir, `app/api/${resource}.py`),
            routerCode
        );

        // Generate schemas
        const schemaCode = `from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ${capitalize(resource)}Base(BaseModel):
    name: str
    description: Optional[str] = None

class ${capitalize(resource)}Create(${capitalize(resource)}Base):
    pass

class ${capitalize(resource)}Response(${capitalize(resource)}Base):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
`;

        await fs.writeFile(
            path.join(outputDir, `app/schemas/${resource}.py`),
            schemaCode
        );
    }
}

async function generateOpenAPISpec(outputDir, apiCalls) {
    const spec = {
        openapi: "3.0.0",
        info: {
            title: "Asana Clone API",
            version: "1.0.0",
            description: "Backend API for Asana clone",
        },
        servers: [
            {
                url: "http://localhost:8000",
                description: "Development server",
            },
        ],
        paths: {},
        components: {
            schemas: {},
        },
    };

    // This would be populated with actual API endpoints
    // For now, FastAPI will auto-generate this

    await fs.writeFile(
        path.join(outputDir, "api.yml"),
        "# OpenAPI spec will be auto-generated by FastAPI\n# Visit /docs endpoint for interactive documentation"
    );

    console.log(chalk.gray("    • Generated api.yml placeholder"));
}

async function generateTestFiles(outputDir, apiCalls) {
    const testCode = `import pytest
from httpx import AsyncClient
from main import app

@pytest.mark.asyncio
async def test_root():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/")
        assert response.status_code == 200
        assert response.json() == {"message": "Asana Clone API"}

@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}

# TODO: Add more test cases for each endpoint
`;

    await fs.writeFile(path.join(outputDir, "tests/test_api.py"), testCode);
    console.log(chalk.gray("    • Generated test files"));
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
