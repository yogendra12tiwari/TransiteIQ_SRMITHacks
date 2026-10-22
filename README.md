# TransitIQ

> Public transport route and timing tracker with a women-safety layer (SI-05+).
> **Notice: 100% simulated fleet & data for Lucknow prototype.**

## Overview

TransitIQ is a real-time public-transport intelligence platform:

- **Live Bus Tracking & ETA with Uncertainty Range**
- **Safe Wait Mode ("Leave now" notification)**
- **Safer Route Mode (exposure-based ranking & fastest vs safer comparison)**
- **Trusted-Contact Trip Sharing (expiring, login-free web links)**
- **Anonymous Reporting & Authority Dashboard**

## Primary Documentation

- [Product Requirements Document (PRD)](./TRANSITIQ_PRD.md)
- [Technical Specification](./TRANSITIQ_SPEC.md)
- [Task-by-Task Build Plan](./build_plan.md)

## Docs

- [Architecture](./docs/architecture.md)
- [Privacy & Ethics](./docs/privacy-and-ethics.md)
- [Demo Script](./docs/demo-script.md)
- [Judge Q&A](./docs/judge-qa.md)
- [User Research Notes](./docs/user-research-notes.md)

## Quick Start

```bash
# Install dependencies across all workspaces
npm install

# Run linting and format checking
npm run lint
npm run format:check

# Run tests
npm test
```
