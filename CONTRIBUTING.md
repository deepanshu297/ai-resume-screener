# Contributing to AI Resume Screener

We welcome all contributions from engineers, designers, and AI researchers! Please follow these guidelines to make the pull request process smooth.

## Code of Conduct
By participating, you agree to uphold our [Code of Conduct](CODE_OF_CONDUCT.md).

## How Can I Contribute?

### Reporting Bugs
- Search existing issues to verify the bug has not been reported.
- Open a new issue detailing:
  - Expected behavior vs. actual behavior.
  - Steps to reproduce.
  - Log snippets or terminal console outputs.

### Proposing Enhancements
- Open a feature request issue explaining the motivation and proposed implementation.

### Submitting Pull Requests
1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/my-new-feature`.
3. Verify changes compile:
   - Backend: run `python -m py_compile app/**/*.py`
   - Frontend: compile TS via `npm run build`
4. Add relevant unit or integration tests inside the `backend/tests/` directory.
5. Push to your fork and submit a Pull Request referencing the open issue.

## Development Style Guidelines
- **Python**: Follow PEP 8 guidelines. Use raw type hints on all routers and services.
- **TypeScript & React**: Follow functional component declarations, utilize predefined Tailwind utility classes, and write custom hooks to decouple stateful fetch logics.
