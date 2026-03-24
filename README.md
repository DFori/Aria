# Aria — AI Calendar Agent

A production-ready AI-powered calendar assistant built with Next.js, TypeScript, Claude AI, and Google APIs. Chat naturally to manage your calendar, check availability, create events, send emails, and manage tasks.

![Aria Dashboard Preview](public/preview.png)

## ✨ Features

- 💬 **Natural Language Chat** — Talk to your calendar like a person
- 📅 **Full Calendar CRUD** — Create, view, edit, reschedule, and delete events
- ⚡ **Availability Check** — Instantly see if you're free; get alternative suggestions if busy
- 📧 **Email Integration** — Send schedule summaries to yourself or anyone
- ✅ **Task Management** — Create reminders and tasks via conversation
- 🔒 **Secure by Design** — Google OAuth 2.0 only; tokens stored server-side
- ✅ **Confirmation UI** — Always confirms before emails to third parties or destructive actions
- 🧠 **Context-Aware** — Understands "tomorrow", "next Friday", "this week", etc.

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- A Google Cloud project with OAuth 2.0 credentials
- A Google Gemini API key ([get one free at AI Studio](https://aistudio.google.com/app/apikey))

### 1. Clone and Install

```bash
git clone <this-repo>
cd calendar-agent
npm install
```

### 2. Set Up Google OAuth

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Go to **APIs & Services → Library** and enable:
   - Google Calendar API
   - Gmail API
   - Google Tasks API
4. Go to **APIs & Services → OAuth consent screen**:
   - Choose **External** user type
   - Fill in app name, support email, developer email
   - Add scopes:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/tasks`
   - Add your Google account as a **Test User**
   - **Important:** Add the test account below as a test user before signing in.

> Test account for local testing:
>
> - Email: `example.tester001@gmail.com`
> - Password: `exampletester@123`
>
> This account must be added to your Google Cloud project's OAuth test users before usage.

5. Go to **APIs & Services → Credentials → Create Credentials → OAuth Client ID**:
   - Application type: **Web application**
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
   - Save your **Client ID** and **Client Secret**

### 3. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# NextAuth (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Google Gemini AI
# Get your free key at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your-gemini-api-key-here
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with Google.

---

## 🏗 Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/  # NextAuth handler
│   │   ├── chat/                # Main AI agent endpoint
│   │   ├── calendar/            # Calendar events endpoint
│   │   └── tasks/               # Tasks endpoint
│   ├── dashboard/               # Dashboard page
│   └── page.tsx                 # Landing / sign-in page
│
├── components/
│   ├── chat/
│   │   ├── ChatPanel.tsx        # Main chat UI
│   │   ├── ChatBubble.tsx       # Message bubble
│   │   ├── ChatInput.tsx        # Textarea + send
│   │   ├── ConfirmationCard.tsx # Action confirmation UI
│   │   └── TypingIndicator.tsx  # Loading dots
│   ├── calendar/
│   │   ├── SchedulePanel.tsx    # Weekly calendar view
│   │   └── TasksPanel.tsx       # Tasks list view
│   └── layout/
│       ├── DashboardShell.tsx   # Main layout
│       ├── LandingPage.tsx      # Sign-in page
│       ├── Providers.tsx        # Session provider
│       └── Sidebar.tsx          # Navigation sidebar
│
├── lib/
│   ├── agent.ts    # Claude AI + tool-calling loop
│   ├── auth.ts     # NextAuth configuration
│   ├── google.ts   # Google API clients
│   ├── tools.ts    # Tool implementations
│   └── utils.ts    # Utilities
│
├── hooks/
│   └── useChat.ts  # Chat state management
│
└── types/
    ├── index.ts         # App types
    └── next-auth.d.ts   # Session type augmentation
```

### Tool-Calling Architecture

The AI agent uses Claude's native tool-calling feature. When a user sends a message:

1. The message is sent to `POST /api/chat`
2. Claude analyzes the intent and decides which tools to call
3. Tools execute against Google APIs with the user's OAuth token
4. Results are fed back to Claude for a natural language response
5. The UI displays tool calls, responses, and any required confirmations

### Security Design

- **OAuth tokens** are stored in encrypted JWT cookies via NextAuth — never exposed to the client
- **Token refresh** happens automatically server-side
- **Minimal scopes**: only Calendar, Gmail Send, and Tasks are requested
- **Confirmation gates**: emails to third parties and destructive actions always prompt for confirmation

---

## 📦 Deploying to Production

### Vercel (Recommended)

```bash
npm i -g vercel
vercel --prod
```

Set environment variables in the Vercel dashboard. Update:

- `NEXTAUTH_URL` to your production URL
- Google OAuth redirect URI to `https://yourdomain.com/api/auth/callback/google`
- OAuth consent screen from "Testing" to "In production" (if needed)

---

## 🔧 Extending

### Adding a New Tool

1. Add the tool definition in `src/lib/agent.ts` (TOOLS array)
2. Implement the tool function in `src/lib/tools.ts`
3. Add the case to `executeTool()` in `src/lib/agent.ts`

### Adding a New View

1. Add a new panel component in `src/components/`
2. Add the view to `DashboardShell.tsx` and `Sidebar.tsx`

---

## 📋 Example Conversations

| User says                                               | What happens                                         |
| ------------------------------------------------------- | ---------------------------------------------------- |
| "Am I free tomorrow at 2pm?"                            | Checks freebusy API, reports availability            |
| "Show me my week"                                       | Fetches and displays this week's events              |
| "Schedule a team sync for Friday at 10am for 1 hour"    | Checks availability, creates event with confirmation |
| "Move my 3pm meeting to 4pm"                            | Finds event, reschedules with confirmation           |
| "Email me my schedule for tomorrow"                     | Fetches events, composes HTML email, sends to self   |
| "Send an email to john@example.com saying I'll be late" | Shows confirmation card before sending               |
| "Remind me to prep for Friday's meeting"                | Creates a Google Task                                |
| "Delete my 5pm event today"                             | Asks for confirmation before deleting                |

---

## 🛠 Built With

- [Next.js 14](https://nextjs.org) — App Router, Server Components
- [NextAuth.js](https://next-auth.js.org) — Google OAuth 2.0
- [Google Gemini AI](https://ai.google.dev) — AI reasoning + function calling (`gemini-2.0-flash`)
- [Google APIs](https://developers.google.com) — Calendar, Gmail, Tasks
- [Tailwind CSS](https://tailwindcss.com) — Styling
- [Framer Motion](https://framer.motion.com) — Animations
- [date-fns](https://date-fns.org) — Date manipulation

---

## 📄 License

MIT
