#!/bin/bash

# Smokiez Dashboard Setup Script
# Run this with: bash setup.sh

echo "🍬 Creating Smokiez Sales Dashboard..."

# Create project directory
mkdir -p smokiez-dashboard/src
cd smokiez-dashboard

# Create package.json
cat > package.json << 'EOF'
{
  "name": "smokiez-sales-dashboard",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "recharts": "^2.10.3",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.3.6",
    "typescript": "^5.2.2",
    "vite": "^5.0.8"
  }
}
EOF

# Create vite.config.ts
cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
})
EOF

# Create tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF

# Create tsconfig.node.json
cat > tsconfig.node.json << 'EOF'
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
EOF

# Create tailwind.config.js
cat > tailwind.config.js << 'EOF'
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF

# Create postcss.config.js
cat > postcss.config.js << 'EOF'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

# Create index.html
cat > index.html << 'EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🍬</text></svg>" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Smokiez Sales Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

# Create .gitignore
cat > .gitignore << 'EOF'
node_modules
dist
dist-ssr
*.local
.DS_Store
*.xlsx
*.xls
EOF

# Create src/main.tsx
cat > src/main.tsx << 'EOF'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
EOF

# Create src/index.css
cat > src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
}

body {
  margin: 0;
  min-height: 100vh;
}

#root {
  min-height: 100vh;
}
EOF

echo "📝 Creating App.tsx (this is the big file)..."
echo "⚠️  Note: App.tsx is too large for this script."
echo "    Copy it from the Claude artifact 'src/App.tsx' into src/App.tsx"

# Create README
cat > README.md << 'EOF'
# Smokiez Sales Dashboard

## Setup Complete!

### Next Steps:

1. Copy the App.tsx content from Claude artifacts into: src/App.tsx

2. Install dependencies:
   npm install

3. Run development server:
   npm run dev

4. Build for production:
   npm run build

5. Deploy to Vercel:
   - Go to vercel.com
   - Drag the entire smokiez-dashboard folder
   - Click Deploy

### File Structure Created:
- package.json
- vite.config.ts
- tsconfig.json & tsconfig.node.json
- tailwind.config.js
- postcss.config.js
- index.html
- .gitignore
- src/main.tsx
- src/index.css
- src/App.tsx (YOU NEED TO COPY THIS)

Done! 🎉
EOF

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Copy src/App.tsx from Claude artifacts"
echo "2. Run: npm install"
echo "3. Run: npm run dev"
echo "4. Open: http://localhost:5173"
echo ""
echo "🚀 When ready to deploy:"
echo "   - Upload entire 'smokiez-dashboard' folder to Vercel"
echo ""
