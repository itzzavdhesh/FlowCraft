# Contributing to FlowCraft

Thanks for helping build an open source flowchart tool. Please keep code quality, accessibility, and user experience at the center of every contribution.

## Fork and Run Locally

1. Fork the repository.
2. Clone your fork.
3. Install dependencies from the repository root:

```bash
npm install
```

4. Copy `.env.example` to `.env.local` and add your Gemini API key:

```bash
cp .env.example .env.local
# Then edit .env.local and set GEMINI_API_KEY=your_key_here
```

5. Start the local app:

```bash
npm run dev
```

6. Open `http://localhost:3000` in your browser.

**Getting a Gemini API key:** Visit [Google AI Studio](https://aistudio.google.com/) → Get API key.

---

## Coding Conventions

- Keep components small and single-purpose.
- Add a short top-of-file comment explaining what each source file does.
- Mark incomplete work with `// TODO: [description of what needs to be done]`.
- Prefer browser-native APIs before adding new dependencies.
- Use Tailwind utility classes consistently.
- Keep accessibility visible: labels, keyboard paths, semantic buttons, and readable contrast matter.
- Do not commit `.env.local`, generated build output, or `node_modules`.

---

## Program Contributions

FlowCraft accepts contributions through GSSoC, NSOC, SSOC, and other open source programs. Program contributors must use the matching issue and pull request templates.

- Open bugs with the bug report template for your program.
- Open feature ideas with the feature request template for your program.
- Open pull requests with the PR template for your program.
- Link every pull request to an issue with `Closes #issue-number`.
- Open a pull request only for an issue that is assigned to you.
- Use a Conventional Commits PR title, for example `feat: add export to svg` or `fix: handle empty canvas`.
- Sign-offs are encouraged with `git commit --signoff`.

Issues and pull requests that use the required template receive the matching program label and enter maintainer review. Maintainers assign issues after confirming scope and readiness.

Issues or pull requests that skip the required template will receive a `needs-template` label and an automated comment asking for updates before review.

Pull requests are validated only when the PR author matches the assignee on the linked closing issue. Valid pull requests receive `pr-validated` and other helpful review labels. Pull requests with a missing template, missing closing issue, wrong assignment, or invalid title receive the matching `needs-*` labels instead.

After a pull request is merged, the PR is marked `merged` and `completed`. Linked closing issues receive `completed` and `closed-by-pr`.

Maintainers use decision labels after reviewing issues:

- `go ahead` — issue is valid for assigned work
- `stale-assignment` — clears current assignee and reopens the queue
- `duplicate`, `not needed`, `out of scope` — closes the issue automatically

Maintainers can mark issue priority with `priority: low`, `priority: medium`, or `priority: high`, and expected difficulty with `level: easy`, `level: medium`, or `level: hard`.

To close an issue as a duplicate, maintainers can comment `/duplicate #issue-number`.

To request assignment on an open issue, comment with:

```text
/assign
```

Polite assignment requests are also accepted, but the short command is preferred.

---

## Good First Issues

Look for issues labeled [`good first issue`](../../issues?q=label%3A%22good+first+issue%22) to find beginner-friendly tasks. These are typically:

- UI improvements or minor layout fixes
- Documentation updates
- Adding new block type support
- Improving export functionality
- Accessibility enhancements

---

## Pull Request Checklist

- [ ] The app runs with `npm install && npm run dev`
- [ ] No TypeScript errors (`npm run lint` passes)
- [ ] New stubs have clear TODO comments
- [ ] User-facing changes are reflected in the README when needed
- [ ] The change is scoped to one concern
- [ ] The correct program template is used
- [ ] The PR links its related issue with `Closes #issue-number`
