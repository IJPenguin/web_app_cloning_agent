# 🤖 Clooney - AI-Powered Web Cloning Agent

An intelligent agent that automatically scrapes web applications, analyzes their structure, and generates production-ready code with AI.

## ✨ Features

-   🕷️ **Intelligent Web Scraping** - Automated browser automation with Playwright
-   🧠 **AI-Powered Analysis** - Uses Google Gemini to analyze UI patterns
-   ⚛️ **React + Tailwind Frontend** - Generates pixel-perfect components
-   🚀 **FastAPI + SQLite Backend** - Generates RESTful APIs
-   📸 **Visual Testing** - Automated screenshot comparison

## �� Quick Start

### Prerequisites

-   Node.js 18+
-   Google Gemini API key (FREE)
-   Asana account

### Installation

**1. Install dependencies**

```powershell
npm install
```

**2. Configure environment**

```powershell
cp .env.template .env
```

Edit .env:

```env
GEMINI_API_KEY=your_key_here
LLM_MODEL=gemini-2.5-pro
ASANA_EMAIL=your_email@example.com
ASANA_PASSWORD=your_password
```

## 📖 Usage

**Step 1: Scrape Pages**

```powershell
npm start
```

**Step 2: Generate Code**

```powershell
npm start generate:home      # Home page only
npm start generate:projects  # Projects pages
npm start generate:tasks     # Tasks page
npm start generate           # All pages
```

**Step 3: Run Generated Apps**

```powershell
cd output/frontend
npm install && npm run dev

cd output/backend
pip install -r requirements.txt
uvicorn main:app
```

## 📁 Output

```
output/
├── frontend/         # React app
├── backend/          # FastAPI app
├── screenshots/      # Page captures
└── scraped-data.json # DOM data
```

## 🐛 Troubleshooting

**API Overloaded?**
Change model to gemini-1.5-flash in .env

**Rate Limits?**
Use staged generation (generate:home, then generate:projects, etc.)

**No Data Found?**
Run
pm start scrape first

## 🔧 Configuration

| Variable       | Description    | Default          |
| -------------- | -------------- | ---------------- |
| GEMINI_API_KEY | Gemini API key | Required         |
| LLM_MODEL      | AI model       | gemini-1.5-flash |
| ASANA_EMAIL    | Login email    | Required         |
| ASANA_PASSWORD | Password       | Required         |

**Available Models:**

-   gemini-1.5-flash - Fast (15 req/min)
-   gemini-1.5-pro - Better quality (2 req/min)

---

**Made for Scaler Assignment** 🚀
