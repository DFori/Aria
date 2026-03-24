# Calendar Agent Confirmation Bug Fix - TODO

## Current Status
- [x] Analyzed files and identified root cause
- [x] Created detailed implementation plan
- [x] Got user approval to proceed

## Implementation Steps

### 1. Fix Frontend Logic ✅ Next
- [ ] src/hooks/useChat.ts 
  - Store accessToken from session
  - Implement confirmAction() → direct API calls to /api/{tool}
  - Map pendingAction.type → endpoint + params
  - Add success/error chat messages
  - Improve cancelAction() messaging

### 2. Add Missing API Route
- [ ] Create src/app/api/email/route.ts
  - POST handler for sendEmail tool
  - Authenticate with getServerSession
  - Return ToolResult format

### 3. Verify Existing Routes
- [ ] src/app/api/calendar/route.ts 
  - Confirm POST handles create_event/delete_event params
  - Add if missing

### 4. Backend Cleanup (Optional)
- [ ] src/lib/agent.ts
  - Remove "re-send request" message since frontend bypasses

### 5. Testing
- [ ] Test create event → confirm → executes
- [ ] Test delete event → confirm → executes  
- [ ] Test send email → confirm → executes
- [ ] Verify no infinite loop

## Key Files
```
src/hooks/useChat.ts          ← Primary fix
src/app/api/email/route.ts    ← New file  
src/app/api/calendar/route.ts ← Verify
