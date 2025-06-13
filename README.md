
# NetGuard AI: Network Monitoring and Automation Platform

NetGuard AI is a comprehensive platform designed for Internet Service Providers (ISPs) to monitor network health, manage devices, automate tasks through a conditional rules engine, and leverage AI for insights like alert summarization.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Install Dependencies](#2-install-dependencies)
  - [3. Environment Variables](#3-environment-variables)
- [Running the Application](#running-the-application)
  - [Development Mode](#development-mode)
  - [Genkit Development Server (Optional)](#genkit-development-server-optional)
- [Available Scripts](#available-scripts)
- [Technology Stack](#technology-stack)
- [Linting and Formatting](#linting-and-formatting)
- [Building for Production](#building-for-production)
- [API Mocking (MSW)](#api-mocking-msw)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 20.x or later. You can download it from [nodejs.org](https://nodejs.org/).
- **Package Manager**: `npm` (comes with Node.js), `yarn`, or `pnpm`. This guide will use `npm` in its examples.

## Getting Started

Follow these steps to set up the project locally.

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd netguard-ai # Or your project's directory name
```

### 2. Install Dependencies

Install the project dependencies using your preferred package manager:

```bash
npm install
```
or
```bash
yarn install
```
or
```bash
pnpm install
```

### 3. Environment Variables

This project uses environment variables for configuration, especially for services like Google AI (via Genkit).

1.  Create a `.env` file in the root of the project by copying the example (if one exists) or creating it from scratch:
    ```bash
    cp .env.example .env # If .env.example exists
    # or
    touch .env
    ```

2.  Add the necessary environment variables. For Genkit with Google AI, you'll likely need:
    ```env
    # .env
    GOOGLE_API_KEY=your_google_ai_api_key_here
    ```
    Replace `your_google_ai_api_key_here` with your actual API key.

    **Note**: The `.env` file is listed in `.gitignore` and should not be committed to the repository.

## Running the Application

### Development Mode

To start the Next.js development server:

```bash
npm run dev
```

This will start the application, typically on port `9002` (as configured in `package.json`).
Open [http://localhost:9002](http://localhost:9002) in your browser to view the app.

The development server includes:
- Hot Module Replacement (HMR) for instant updates.
- API mocking via MSW (see [API Mocking (MSW)](#api-mocking-msw)).

### Genkit Development Server (Optional)

If you are actively developing or testing Genkit AI flows, you might want to run the Genkit development server. This provides a UI for inspecting flows, traces, and invoking them directly.

To start the Genkit development server:
```bash
npm run genkit:dev
```
Or, for watch mode (restarts on file changes in `src/ai/`):
```bash
npm run genkit:watch
```
The Genkit development UI is typically available at [http://localhost:4000](http://localhost:4000).

**Note**: The Next.js application itself can run Genkit flows without this separate server running, as Genkit is integrated directly. The `genkit:dev` server is primarily for the developer experience when working with flows.

## Available Scripts

The `package.json` file contains several scripts for common tasks:

-   `npm run dev`: Starts the Next.js application in development mode (port 9002).
-   `npm run genkit:dev`: Starts the Genkit development server.
-   `npm run genkit:watch`: Starts the Genkit development server in watch mode.
-   `npm run build`: Builds the Next.js application for production.
-   `npm run start`: Starts a Next.js production server (requires a prior build).
-   `npm run lint`: Runs ESLint to check for code quality and style issues.
-   `npm run format`: Formats the codebase using Prettier.
-   `npm run typecheck`: Runs the TypeScript compiler to check for type errors.

## Technology Stack

-   **Framework**: Next.js (App Router)
-   **Language**: TypeScript
-   **UI Library**: React
-   **UI Components**: ShadCN UI
-   **Styling**: Tailwind CSS
-   **State Management**:
    -   Global: Zustand
    -   Server State/Caching: TanStack Query (React Query)
-   **Generative AI**: Genkit (with Google AI/Gemini models)
-   **API Mocking**: MSW (Mock Service Worker)
-   **Linting/Formatting**: ESLint, Prettier

## Linting and Formatting

This project is configured with ESLint for linting and Prettier for code formatting to maintain consistent code style.

-   To check for linting errors:
    ```bash
    npm run lint
    ```
-   To automatically format the code:
    ```bash
    npm run format
    ```

It's recommended to set up your code editor to automatically format on save using Prettier and show ESLint errors.

## Building for Production

To create a production-ready build of the application:

```bash
npm run build
```

This command will compile and optimize the application, outputting the build artifacts to the `.next` directory.

After building, you can start a production server using:
```bash
npm run start
```

## API Mocking (MSW)

During development, API requests are mocked using MSW (Mock Service Worker). This allows for frontend development without a live backend or for simulating various API responses.

-   Mock handlers are defined in `src/mocks/handlers.ts`.
-   MSW is automatically initialized for both client-side (via Service Worker) and server-side (Node.js for Server Components/API routes during dev) requests.
-   You should see MSW initialization messages in your browser console and terminal when running `npm run dev`.

---

Happy coding! If you encounter any issues or have questions, please refer to the specific documentation for the technologies used or open an issue in the repository.
