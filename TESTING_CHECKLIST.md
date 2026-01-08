# CRM Testing Checklist

**Service**: BLKOUT CRM (Customer/Community Relationship Management)
**URL**: https://crm.blkoutuk.cloud
**Status**: ⚠️ Partially Tested (HTTP 200 confirmed, needs manual testing)
**Last Updated**: January 8, 2026

---

## Quick Start Testing

```bash
# 1. Start CRM locally
cd /home/robbe/blkout-platform/apps/crm
npm install
npm run dev

# 2. Open in browser
# Local: http://localhost:3002
# Production: https://crm.blkoutuk.cloud

# 3. Test with credentials (ask team)
# Username: [ASK]
# Password: [ASK]
```

---

## 1. Authentication (15 minutes)

### Login Flow
- [ ] Navigate to https://crm.blkoutuk.cloud
- [ ] Login page displays (not blank)
- [ ] Form has username/email field
- [ ] Form has password field
- [ ] "Remember me" checkbox (if applicable)
- [ ] "Forgot password" link (if applicable)

### Valid Credentials
- [ ] Enter valid username/password
- [ ] Submit form
- [ ] Redirects to dashboard (not error page)
- [ ] No console errors in browser
- [ ] User name/avatar displays (if applicable)

### Invalid Credentials
- [ ] Enter invalid username
- [ ] Submit form
- [ ] Error message displays (e.g., "Invalid credentials")
- [ ] Does NOT crash or show blank page
- [ ] Can retry login

### Session Management
- [ ] Log in successfully
- [ ] Refresh page (F5)
- [ ] Still logged in (session persists)
- [ ] Close browser, reopen
- [ ] Session persists (if "remember me" checked)
- [ ] Click logout
- [ ] Redirects to login page
- [ ] Cannot access dashboard after logout

**Issues Found**:
- [ ] None
- [ ] Issue: ________________________________

---

## 2. Contacts Management (30 minutes)

### Database Status
```bash
# Check Supabase table
# Expected: community_members table with rows
```

### View Contacts List
- [ ] Navigate to Contacts/Members page
- [ ] List displays (not empty, not loading forever)
- [ ] Member names visible
- [ ] Member emails visible
- [ ] Member types/categories visible
- [ ] Profile pictures/avatars load (if applicable)

### Create New Contact
- [ ] Click "Add Contact" or "New Member" button
- [ ] Form appears (modal or new page)
- [ ] Required fields marked (e.g., name, email)
- [ ] Enter test contact:
  - Name: "Test User [Your Name]"
  - Email: "test+[yourname]@blkoutuk.com"
  - Phone: "07700 900000"
  - Member Type: "Community Member"
- [ ] Submit form
- [ ] Success message appears
- [ ] Contact appears in list
- [ ] Database row created (check Supabase)

### Edit Existing Contact
- [ ] Find test contact in list
- [ ] Click edit button
- [ ] Form pre-fills with existing data
- [ ] Change email to "updated+[yourname]@blkoutuk.com"
- [ ] Submit form
- [ ] Success message appears
- [ ] Updated data displays in list
- [ ] Database row updated (check Supabase)

### Delete Contact
- [ ] Find test contact
- [ ] Click delete button
- [ ] Confirmation dialog appears (if applicable)
- [ ] Confirm deletion
- [ ] Contact removed from list
- [ ] Database row deleted (check Supabase)

### Search Contacts
- [ ] Locate search box
- [ ] Enter partial name (e.g., "Rob")
- [ ] List filters to matching results
- [ ] Results display instantly (or <2s)
- [ ] Clear search
- [ ] Full list returns

### Filter Contacts
- [ ] Locate filter dropdown (if exists)
- [ ] Filter by type (e.g., "Community Member")
- [ ] List shows only that type
- [ ] Change filter to "All"
- [ ] Full list returns

### Sort Contacts
- [ ] Click column header (e.g., "Name")
- [ ] List sorts A-Z
- [ ] Click again
- [ ] List sorts Z-A
- [ ] Click "Email" header
- [ ] List sorts by email

### Pagination (if applicable)
- [ ] Check if pagination controls exist
- [ ] If >10 contacts, next page button shows
- [ ] Click "Next" or page 2
- [ ] New set of contacts loads
- [ ] Click "Previous" or page 1
- [ ] Returns to first page

**Issues Found**:
- [ ] None
- [ ] Issue: ________________________________

---

## 3. Organizations (20 minutes)

### View Organizations List
- [ ] Navigate to Organizations page
- [ ] List displays organizations (if any exist)
- [ ] Organization names visible
- [ ] Contact count per org visible (if applicable)

### Create New Organization
- [ ] Click "Add Organization" button
- [ ] Form appears
- [ ] Enter test organization:
  - Name: "Test Org [Your Name]"
  - Type: "Community Partner"
  - Website: "https://example.com"
- [ ] Submit form
- [ ] Success message appears
- [ ] Organization appears in list

### Link Contact to Organization
- [ ] View organization details
- [ ] Click "Add Contact" or similar
- [ ] Select existing contact
- [ ] Contact linked to organization
- [ ] Contact shows in organization view
- [ ] Organization shows in contact view

### Edit Organization
- [ ] Find test organization
- [ ] Click edit button
- [ ] Change name to "Updated Org [Your Name]"
- [ ] Submit form
- [ ] Updated name displays

### Delete Organization
- [ ] Find test organization
- [ ] Click delete button
- [ ] Confirm deletion
- [ ] Organization removed from list

**Issues Found**:
- [ ] None
- [ ] Issue: ________________________________

---

## 4. Grants Pipeline (25 minutes)
**Note**: Only test if grants management exists in this CRM

### View Grants in Kanban
- [ ] Navigate to Grants page
- [ ] Kanban board displays (if exists)
- [ ] Columns: "Prospecting", "Applied", "In Review", "Awarded", "Closed"
- [ ] Cards display in columns

### View Grants in List
- [ ] Toggle to list view (if available)
- [ ] Grants display as table/list
- [ ] Grant names visible
- [ ] Amounts visible
- [ ] Deadlines visible
- [ ] Status visible

### Create New Grant
- [ ] Click "Add Grant" button
- [ ] Form appears
- [ ] Enter test grant:
  - Name: "Test Grant [Your Name]"
  - Funder: "Test Foundation"
  - Amount: "£5,000"
  - Deadline: [Future date]
  - Probability: "50%"
  - Stage: "Prospecting"
- [ ] Submit form
- [ ] Grant appears in Kanban/list

### Move Grant Between Stages
- [ ] Drag grant card to "Applied" column
- [ ] Card moves successfully
- [ ] Stage updates in database
- [ ] Timestamp recorded (if applicable)

### Update Probability
- [ ] Click on grant card
- [ ] Change probability from 50% to 75%
- [ ] Save changes
- [ ] Probability updates

### Add Notes
- [ ] Open grant detail view
- [ ] Find notes/comments section
- [ ] Add note: "Test note: Follow up needed"
- [ ] Save note
- [ ] Note displays in grant history

### Set Reminders
- [ ] Find reminder/task section (if exists)
- [ ] Set reminder: "Follow up in 7 days"
- [ ] Save reminder
- [ ] Reminder appears in dashboard/calendar

**Issues Found**:
- [ ] None
- [ ] Issue: ________________________________
- [ ] N/A (Grants not in this CRM)

---

## 5. Dashboard (15 minutes)

### Metrics Display
- [ ] Navigate to dashboard/home
- [ ] Key metrics display (e.g., total members, active members)
- [ ] Numbers load (not showing 0 or "loading...")
- [ ] Metrics accurate (spot-check against database)

### Charts Render
- [ ] At least one chart/graph visible (if applicable)
- [ ] Chart loads without errors
- [ ] Data makes sense (not all zeros)
- [ ] Chart interactive (hover shows values)

### Recent Activity
- [ ] "Recent Activity" section exists
- [ ] Shows recent member signups or edits
- [ ] Timestamps displayed correctly
- [ ] Activity links to relevant record

### Quick Actions
- [ ] Quick action buttons visible (e.g., "Add Member", "Add Org")
- [ ] Click one quick action
- [ ] Opens correct form/page
- [ ] Can complete action quickly

### Real-time Updates
- [ ] Open CRM in two browser tabs
- [ ] In tab 1, create new contact
- [ ] In tab 2, refresh
- [ ] New contact appears (or shows after manual refresh)

**Issues Found**:
- [ ] None
- [ ] Issue: ________________________________

---

## 6. Integration Testing (20 minutes)

### IVOR Link
- [ ] Find IVOR widget or link (if integrated)
- [ ] Click to open IVOR
- [ ] IVOR loads in modal/sidebar
- [ ] Can ask IVOR questions
- [ ] IVOR responds

### Events Calendar Integration
- [ ] Check if events visible in CRM (if integrated)
- [ ] Member event attendance tracked (if applicable)
- [ ] Can register member for event (if applicable)

### Data Export
- [ ] Find "Export" button (if exists)
- [ ] Export contacts to CSV
- [ ] CSV downloads
- [ ] Open CSV
- [ ] Data correct (names, emails, etc.)
- [ ] Export organizations (if applicable)
- [ ] Export grants (if applicable)

**Issues Found**:
- [ ] None
- [ ] Issue: ________________________________

---

## 7. Mobile Responsiveness (10 minutes)

### Mobile Browser Testing
- [ ] Open CRM on mobile browser (or resize browser to 375px width)
- [ ] Login page mobile-friendly
- [ ] Dashboard mobile-friendly
- [ ] Contacts list scrolls vertically
- [ ] Forms usable on mobile (fields not cut off)
- [ ] Buttons large enough to tap
- [ ] No horizontal scrolling

### Touch Interactions
- [ ] Tap buttons (no need to double-tap)
- [ ] Swipe gestures work (if applicable)
- [ ] Pinch to zoom disabled (good for web apps)

**Issues Found**:
- [ ] None
- [ ] Issue: ________________________________

---

## 8. Accessibility (15 minutes)

### Keyboard Navigation
- [ ] Press Tab key
- [ ] Focus moves through elements in logical order
- [ ] Focus indicator visible (blue outline or similar)
- [ ] Can navigate entire form with Tab/Shift+Tab
- [ ] Press Enter on button (activates button)

### Screen Reader (if available)
- [ ] Turn on screen reader (VoiceOver on Mac, NVDA on Windows)
- [ ] Navigate login form
- [ ] Form labels read correctly
- [ ] Error messages announced
- [ ] Success messages announced

### Color Contrast
- [ ] Text readable against background (no light gray on white)
- [ ] Buttons have sufficient contrast
- [ ] Links distinguishable from body text

**Issues Found**:
- [ ] None
- [ ] Issue: ________________________________

---

## 9. Performance (10 minutes)

### Page Load Time
- [ ] Open CRM (clear cache first)
- [ ] Measure load time (use browser DevTools Network tab)
- [ ] Initial page load <3 seconds
- [ ] Dashboard loads <2 seconds after login

### List Rendering Performance
- [ ] Navigate to Contacts list
- [ ] If >100 contacts, check load time
- [ ] List renders <2 seconds
- [ ] Scrolling smooth (no lag)

### Search Performance
- [ ] Type in search box
- [ ] Results update instantly (<500ms)
- [ ] No freezing during search

### Memory Leaks
- [ ] Open browser DevTools > Performance
- [ ] Record memory usage
- [ ] Navigate around CRM for 2 minutes
- [ ] Stop recording
- [ ] Memory usage stable (no huge increases)

**Issues Found**:
- [ ] None
- [ ] Issue: ________________________________

---

## 10. Security (15 minutes)

### HTTPS Verification
- [ ] URL starts with https://
- [ ] Padlock icon in browser address bar
- [ ] Click padlock
- [ ] Certificate valid (not expired)

### Authentication Required
- [ ] Log out of CRM
- [ ] Try to access https://crm.blkoutuk.cloud/dashboard directly
- [ ] Redirects to login (does NOT show dashboard)

### Input Validation
- [ ] Try to create contact with invalid email (e.g., "notanemail")
- [ ] Error message appears
- [ ] Try to create contact with script tag in name: `<script>alert('xss')</script>`
- [ ] Script NOT executed (name stored as plain text)

### SQL Injection Protection (basic test)
- [ ] In search box, enter: `' OR '1'='1`
- [ ] Does NOT return all records (query is sanitized)
- [ ] No database error shown

### No Exposed Secrets
- [ ] Open browser DevTools > Network tab
- [ ] Reload page
- [ ] Check API requests
- [ ] No API keys visible in URLs or headers (except safe public keys)

**Issues Found**:
- [ ] None
- [ ] Issue: ________________________________

---

## Testing Summary

**Date Tested**: _______________
**Tester**: _______________
**CRM Version**: _______________

### Overall Results
- [ ] ✅ All tests passed
- [ ] ⚠️ Minor issues (document below)
- [ ] 🔴 Critical issues (document below)

### Critical Issues Found
1. _______________________________________________
2. _______________________________________________

### Minor Issues Found
1. _______________________________________________
2. _______________________________________________

### Recommendations
1. _______________________________________________
2. _______________________________________________

### Next Steps
1. Create GitHub issues for all bugs
2. Update `/docs/TESTING_PROGRESS.md`
3. Update `/docs/PLATFORM_TESTING_MASTER_CHECKLIST.md`
4. Notify team of critical issues

---

## Related Documentation
- [Platform Testing Master Checklist](/home/robbe/blkout-platform/docs/PLATFORM_TESTING_MASTER_CHECKLIST.md)
- [CRM Documentation (if exists)](/home/robbe/blkout-platform/apps/crm/README.md)
- [Testing Progress Tracker](/home/robbe/blkout-platform/docs/TESTING_PROGRESS.md)

---

*BLKOUT UK Cooperative © 2026 - Testing with liberation values* 🏴‍☠️
