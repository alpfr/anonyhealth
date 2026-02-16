# AnonyHealth

**Privacy-first Healthcare for the Modern Patient.**

AnonyHealth connects patients with healthcare providers while maintaining strict privacy standards. It features an anonymous AI symptom checker, provider search, and secure patient authentication.

## Features

*   **🔍 Find Provider**: Browse and search for healthcare providers (backed by Supabase).
*   **🤖 AI Symptom Checker**: Anonymous symptom analysis powered by AI.
*   **🔐 Authentication**: Secure Sign Up and Sign In for patients using Supabase Auth.
*   **📱 Responsive UI**: Optimized for both mobile and desktop experiences using a custom design system.
*   **⚡ Modern Stack**: Built with React, Vite, and Supabase.

## Getting Started

### Prerequisites

*   Node.js (v18+)
*   NPM
*   Supabase Account (for backend)

### Installation

1.  **Clone the repository** (if applicable) or navigate to the project directory.

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Configuration**:
    Create a `.env` file in the root directory with your Supabase credentials:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Database Setup**:
    Run the SQL script `supabase_schema.sql` in your Supabase SQL Editor to create the necessary tables and seed initial data.

### Running Locally

Start the development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

### Building for Production

Compile the application for deployment:
```bash
npm run build
```
The optimized files will be generated in the `dist/` directory.

## Deployment

The `dist/` folder can be deployed to any static hosting provider such as:
*   Vercel
*   Netlify
*   GitHub Pages
*   Google Cloud Storage / Firebase Hosting

## License

Private / Proprietary.
