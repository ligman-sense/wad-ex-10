# Student Record Management System

This app follows the sample document’s MVC structure and student fields, then adds the ten requested exercises. It uses Node.js, Express, body-parser, EJS, Mongoose, and MongoDB, with your supplied stylesheet and its `pinky.png` background.

## Run the app and add student records

1. Install Node.js and MongoDB, and start MongoDB (or prepare a MongoDB Atlas URI).
2. In this folder, run `npm install`.
3. Copy `.env.example` to `.env`. Set `MONGO_URI`, a long random `SESSION_SECRET`, and a private administrator username/password for local learning.
4. Run `npm start`, then open `http://localhost:3000`.
5. Import the local `student-records-import.json` file into the `students` collection with MongoDB Compass, or add records individually from **Add student**. The roster JSON contains personal student data and is excluded from this repository.

To import a tab-separated student list in the same 14-column format as the supplied roster, run `node import-pasted-students.js "path to Pasted text.txt"` after configuring MongoDB. The importer validates the entire file before writing, uses numeric roll numbers that retain the `26` cohort prefix (for example, `26MX101` becomes `26101`), sets admission year to 2026, and skips already-present roll numbers. It imports only the student app fields and does not read or store the final two credential columns.

MongoDB creates the `StudentDB` database when the first student document is written. The app starts after a successful connection. Forms add students; administrator sign-in is required for update and delete.

## MVC structure

```text
StudentManagement/
├── app.js
├── server.js
├── config/db.js
├── controllers/studentController.js
├── middleware/auth.js
├── models/Student.js
├── routes/studentRoutes.js
├── views/
│   ├── login.ejs
│   ├── error.ejs
│   ├── partials/
│   └── students/
├── public/style.css
└── public/pinky.png
```

Form submissions are parsed with `body-parser` into `req.body`; GET filters and sort selections use `req.query`; the roll number in edit/update routes uses `req.params`. The controller calls `res.render()` and `res.redirect()` to return EJS pages and follow completed actions.

## Student document fields

The schema follows the sample document: `rollno` (unique and mandatory), `name`, `yearOfBirth`, `yearOfAdmission`, `nativeCity`, `phoneNumber` (mandatory), and `guardianPhoneNumber` (optional). It also has `gender` with `Male`, `Female`, and `Other` choices. Phone fields are strings so leading zeroes are preserved; supplied values must contain exactly ten digits. The schema prevents future birth/admission years and rejects an admission year earlier than birth year.

## Observation notebook

Record these Mongoose operations and explain the result you see in the UI.

| Exercise | Mongoose operation used |
|---|---|
| 1. Students admitted in a selected year | `Student.find({ yearOfAdmission: year })` |
| 2. Students from a native city | `Student.find({ nativeCity: { $regex: '^Chennai$', $options: 'i' } })` |
| 3. Students born after 2004 | `Student.find({ yearOfBirth: { $gt: 2004 } })` |
| 4. Total student count | `Student.countDocuments()` |
| 5. Admission year descending | `Student.find(query).sort({ yearOfAdmission: -1 })` |
| 6. Admission year cannot precede birth year | Schema `pre('validate')` hook and `this.invalidate('yearOfAdmission', ...)` |
| 7. Search by name | `Student.find({ name: { $regex: escapedSearch, $options: 'i' } })` |
| 8. Guardian phone not provided | `Student.find({ $or: [{ guardianPhoneNumber: { $exists: false } }, { guardianPhoneNumber: { $in: ['', null] } }] })` |
| 9. Protect update/delete | Express `requireAdmin` middleware protects `findOne()`/`save()` and `deleteOne()` routes |
| 10. Gender radio buttons and schema | `gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true }` |

The list page also follows the sample’s sort dropdown: choose Roll Number, Name, Year of Birth, Year of Admission, Native City, or Phone Number, then choose ascending or descending order. Exercise 5 is also available as a one-click descending admission-year query.

## Deployment settings

For deployment, set `NODE_ENV=production`, serve through HTTPS, set a strong `SESSION_SECRET`, and configure `ADMIN_PASSWORD_HASH` (a bcrypt hash) instead of `ADMIN_PASSWORD`. Generate a hash locally with `node -e "console.log(require('bcryptjs').hashSync('your-strong-password', 12))"`; keep it private. Sessions are stored in MongoDB, POST forms use session-bound CSRF tokens, and production cookies are HTTP-only, same-site, and secure.

