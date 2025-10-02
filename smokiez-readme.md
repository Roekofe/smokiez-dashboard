# 🍬 Smokiez Sales & Inventory Dashboard

A comprehensive, interactive dashboard for analyzing Smokiez sales and inventory data across all markets and products.

## ✨ Features

- **4 Interactive Tabs**: Market Sales (Units), SKU Sales (Units), Market Revenue ($), SKU Revenue ($)
- **Dynamic Filtering**: Filter by market and/or SKU
- **Rich Visualizations**: Line charts, bar charts, pie charts, and detailed tables
- **File Upload**: Drag & drop Excel files directly into the dashboard
- **Inventory Analytics**: Months of inventory on hand calculations
- **Responsive Design**: Works on desktop, tablet, and mobile

---

## 🚀 Quick Deploy to Vercel (5 Minutes - EASIEST)

### One-Click Deploy:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/smokiez-dashboard)

### Manual Deploy:

1. **Create Project Folder**
   - Create a new folder called `smokiez-dashboard`
   - Copy ALL the files from the artifacts into this folder with the correct structure (see below)

2. **Go to [vercel.com](https://vercel.com)**
   - Sign up for free (can use GitHub, GitLab, or Bitbucket)
   - Click "Add New" → "Project"

3. **Deploy**
   - Drag & drop your `smokiez-dashboard` folder
   - Vercel will automatically detect it's a Vite + React project
   - Click "Deploy"
   - Done! Get your shareable URL in ~2 minutes

---

## 📁 File Structure

Create this exact folder structure:

```
smokiez-dashboard/
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── src/
    ├── App.tsx
    ├── index.css
    └── main.tsx
```

---

## 💻 Local Development

### Prerequisites
- Node.js 18+ installed ([Download here](https://nodejs.org/))

### Steps:

1. **Create the project folder and add all files** (use the structure above)

2. **Install dependencies:**
   ```bash
   cd smokiez-dashboard
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Open browser:**
   - Navigate to `http://localhost:5173`
   - Upload your Excel file to start using the dashboard

5. **Build for production:**
   ```bash
   npm run build
   ```
   - This creates a `dist/` folder with optimized files

---

## 🌐 Other Deployment Options

### Netlify (Also Very Easy)

1. Go to [netlify.com](https://netlify.com)
2. Sign up for free
3. Drag & drop your `smokiez-dashboard` folder
4. Done! Get your URL

### GitHub Pages

1. Push your code to GitHub
2. Go to Settings → Pages
3. Set source to GitHub Actions
4. Create `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy
   on:
     push:
       branches: [main]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
           with:
             node-version: 18
         - run: npm install
         - run: npm run build
         - uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./dist
   ```

### Traditional Web Host

1. Run `npm run build`
2. Upload contents of `dist/` folder to your web host
3. Configure server to serve `index.html` for all routes

---

## 📊 Using the Dashboard

1. **Upload Your Data**
   - Click the upload area or drag & drop your Excel file
   - Expected format: 6 sheets (Sales by Market Units, Inventory by Market Units, etc.)

2. **Navigate Tabs**
   - Switch between different views using the tab buttons
   - Each tab provides unique insights into your data

3. **Filter Data**
   - Use the dropdown filters to focus on specific markets or SKUs
   - Filters automatically update all charts and tables

4. **Load Different Files**
   - Click "Load Different File" button in top-right to switch datasets

---

## 🛠️ Customization

### Change Colors
Edit `src/App.tsx`, line 7:
```typescript
const COLORS = ['#8B4513', '#D2691E', ...]; // Add your brand colors
```

### Modify Branding
Edit `index.html`:
```html
<title>Your Company Dashboard</title>
```

### Add More Features
The codebase is well-structured and commented. Key areas:
- `src/App.tsx` - Main dashboard logic
- Tab rendering functions - `renderMarketUnitsTab()`, `renderSKUUnitsTab()`, etc.

---

## 📦 What's Included

- ✅ React 18 with TypeScript
- ✅ Vite for fast builds
- ✅ Recharts for visualizations
- ✅ SheetJS for Excel parsing
- ✅ Tailwind CSS for styling
- ✅ Fully responsive design
- ✅ No backend required

---

## 🐛 Troubleshooting

### "Module not found" errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### Charts not displaying
- Ensure all data is in correct format
- Check browser console for errors
- Try a different Excel file

### Build fails
- Verify Node.js version: `node --version` (should be 18+)
- Clear cache: `npm cache clean --force`
- Reinstall: `rm -rf node_modules && npm install`

---

## 📝 File Requirements

Your Excel file must contain these 6 sheets (in order):
1. Sales by Market (Units)
2. Inventory by Market (Units)
3. Sales by Market by SKU (Units)
4. Inventory by Market SKU (Units)
5. Sales by Market (Dollars)
6. Sales by Market by SKU (Dollars)

---

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section above
2. Verify all files are in correct locations
3. Ensure Excel file format matches requirements

---

## 📄 License

This project is provided as-is for Smokiez internal use.

---

## 🎉 Quick Start Checklist

- [ ] Create `smokiez-dashboard` folder
- [ ] Copy all files with correct structure
- [ ] Run `npm install` (for local dev) OR upload to Vercel
- [ ] Access dashboard and upload Excel file
- [ ] Share URL with team!

**Estimated time: 5-10 minutes** ⚡