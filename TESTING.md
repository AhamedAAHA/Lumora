# Lumora — Full Testing Checklist

Run the app: `npm run dev` → open **http://localhost:5173** only.

Default admin: `admin@lumora.com` / `admin123`

---

## 1. Admin login

- [ ] Open http://localhost:5173/admin-login.html
- [ ] Login with admin credentials
- [ ] Invalid password shows clear error
- [ ] Redirects to admin dashboard

## 2. Create interview

- [ ] Open **+ New Interview**
- [ ] Fill title, job role, candidate name/email
- [ ] Add 2–3 custom questions
- [ ] Submit → lands on interview details

## 3. Custom questions (edit & reorder)

- [ ] Open **Edit Interview**
- [ ] Drag questions to reorder (order numbers update)
- [ ] Edit question text → Save
- [ ] Add new question
- [ ] Delete a question

## 4. Generate PIN (expiry UI)

- [ ] On interview details, choose PIN expiry (24h / 48h / 72h / 7 days)
- [ ] Click **Generate 6-Digit PIN**
- [ ] PIN displays (6 digits)
- [ ] Copy PIN works
- [ ] Expiry date shown

## 5. AI questions (admin edit — before candidate starts)

- [ ] Before candidate logs in: no AI questions yet (or empty message)
- [ ] After candidate uploads CV: refresh interview details
- [ ] Edit an AI question → Save
- [ ] Delete an AI question (optional)
- [ ] After candidate **starts** interview: AI questions locked

## 6. Candidate PIN login

- [ ] Open http://localhost:5173/candidate-pin-login.html
- [ ] Wrong PIN → clear error
- [ ] Valid 6-digit PIN → proceeds to CV upload
- [ ] Enter all 6 digits (counter shows 6/6)

## 7. CV upload & AI questions

- [ ] Upload PDF/DOC/DOCX resume
- [ ] CV summary and skills appear
- [ ] **Generate AI Interview Questions** → success
- [ ] Bad file type → clear error

## 8. Interview flow

- [ ] **Start Interview**
- [ ] Custom questions appear first
- [ ] Then AI CV questions
- [ ] Weak answer may trigger follow-up
- [ ] **Play Question** works (or shows voice fallback message)
- [ ] Submit each answer → score/feedback shown
- [ ] Progress bar updates

## 9. Complete & retake prevention

- [ ] Finish all questions → completion page
- [ ] Re-enter same PIN → blocked (“already completed” or “no longer available”)
- [ ] Interview status = completed in admin dashboard

## 10. Admin report

- [ ] **View Report** on completed interview
- [ ] Scores, strengths, weaknesses, Q&A visible
- [ ] **Download PDF** saves file
- [ ] **Print** works

## 11. Delete interview

- [ ] Delete from dashboard (confirm dialog)
- [ ] Delete from interview details
- [ ] Interview removed from list

## 12. Admin profile

- [ ] Open **Profile** from dashboard
- [ ] Change password (current + new)
- [ ] Login with new password

## 13. Logout

- [ ] Admin logout returns to login
- [ ] Candidate Exit clears session

---

## 14. Advanced AI features

- [ ] Create interview with round, language, personality, difficulty, coding round
- [ ] Candidate saves language/personality on CV page
- [ ] Interview room: live confidence/communication/speaking meters update
- [ ] Anti-cheat: tab switch shows warning banner
- [ ] Conversational interviewer comment appears after answers
- [ ] Adaptive difficulty pill updates on strong/weak answers
- [ ] Optional coding round evaluates and can finish interview
- [ ] Admin dashboard: recommendation chart, score trend, failed questions
- [ ] Admin notifications appear after schedule/complete
- [ ] Report shows career coach, roadmap, speaking score
- [ ] Candidate performance history page after completion

## Legacy React (optional)

Separate demo at `/legacy/login` — not part of PIN workflow.

- [ ] Landing page banner links to main app vs legacy
