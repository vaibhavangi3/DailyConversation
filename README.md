# Daily Conversation

Daily Conversation turns public AI chat links into a private learning log. Paste a shared ChatGPT, Gemini, or Claude link; the server extracts the transcript, sends it to Google AI for structured learning analysis, and stores the result in SQLite.

## Run locally

Requirements: Java 17+ and Maven 3.9+.

```powershell
$env:GOOGLE_AI_API_KEY = ""
$env:ADMIN_PASSWORD = "choose-a-local-password"
mvn spring-boot:run
```

Open `http://localhost:8080` and sign in with username `admin` and the `ADMIN_PASSWORD` value. The API is protected, so the dashboard must have an authenticated browser session.

The key is optional while developing. Without it, imports still work using a small local fallback summary. Set `DB_PATH` to move the SQLite file, and `GOOGLE_AI_MODEL` to select another Gemini model.

## API

- `POST /api/conversations/import` with `{ "url": "https://..." }`
- `GET /api/conversations`
- `GET /api/conversations/{id}`
- `GET /api/stats`

Only HTTPS hosts for ChatGPT, Gemini, and Claude are accepted. Shared links must be public. Provider page formats can change, so extraction is isolated in `ConversationLinkImporter` for easy adapter upgrades.

## Product next steps

The MVP is intentionally single-user and local-first. Before deploying it for multiple users, add authentication, encrypt stored transcripts, move analysis to a background job, add provider-specific authenticated export adapters, and use PostgreSQL for production.


<!-- workflow trigger -->
<!-- workflow trigger -->
<!-- workflow trigger -->
