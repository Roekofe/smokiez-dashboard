# 🚀 Quick Start Guide - Deploy in 5 Minutes

## Option 1: Deploy to Vercel (RECOMMENDED - Easiest!)

### Step 1: Get Your Files Ready
1. Create a folder called `smokiez-dashboard`
2. Copy these files into it following this structure:

```
smokiez-dashboard/
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── .gitignore
└── src/
    ├── App.tsx
    ├── index.css
    └── main.tsx
```

**All these files are in the Claude conversation above as separate artifacts!**

### Step 2: Deploy
1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up" (free - use GitHub/Google)
3. Click "Add New" → "Project"
4. Drag your `smokiez-dashboard` folder into the upload area
5. Click "Deploy"

**That's it!** In 2 minutes you'll get a URL like:
`https://smokiez-dashboard-xyz123.vercel.app`

Share this URL with anyone - they can access the dashboard instantly!

---

## Option 2: Run Locally First (Test Before Deploy)

### Requirements
- Install Node.js 18+ from [nodejs.org](https://nodejs.org/)

### Steps
1. Create the `smokiez-dashboard` folder with all files (see structure above)

2. Open terminal/command prompt in that folder

3. Run these commands:
```bash
npm install
npm run dev
```

4. Open browser to `http://localhost:5173`

5. Upload your Excel file and test!

6. When ready to deploy, follow Option 1 above

---

## What You'll Get

✅ **A live dashboard at a shareable URL**
- No installation needed for users
- Works on any device (desktop, tablet, mobile)
- Instant access - just share the link!

✅ **Professional features**
- Upload Excel files directly
- Interactive charts and filters
- Fast and responsive

✅ **Free hosting**
- Vercel free tier is generous
- No credit card needed
- Automatic HTTPS

---

## Sharing with Your Team

Once deployed:
1. Share the Vercel URL (e.g., `https://smokiez-dashboard.vercel.app`)
2. Team members visit the URL
3. They upload their Excel file
4. Dashboard loads instantly - no setup needed!

---

## Files You Need (Checklist)

Copy these from the Claude conversation:

- [ ] `package.json` - Project configuration
- [ ] `vite.config.ts` - Build tool config
- [ ] `tsconfig.json` - TypeScript config
- [ ] `tsconfig.node.json` - TypeScript node config
- [ ] `tailwind.config.js` - Styling config
- [ ] `postcss.config.js` - CSS processing
- [ ] `index.html` - Main HTML file
- [ ] `.gitignore` - Git ignore rules
- [ ] `src/main.tsx` - App entry point
- [ ] `src/App.tsx` - Main dashboard code
- [ ] `src/index.css` - Global styles

---

## Need Help?

**Common Issues:**

**"Where do I find these files?"**
→ They're all created as separate artifacts in Claude conversation above. Copy each one.

**"npm command not found"**
→ Install Node.js from [nodejs.org](https://nodejs.org/)

**"Build fails on Vercel"**
→ Make sure all files are in the correct folder structure

**"Dashboard not loading data"**
→ Excel file must have the correct 6 sheets (see README)

---

## Pro Tips

💡 **Custom Domain**: Vercel lets you add your own domain (like `dashboard.yourcompany.com`) for free!

💡 **Auto-Updates**: Push changes to GitHub, and Vercel auto-deploys updates

💡 **Analytics**: Enable Vercel Analytics to see dashboard usage

💡 **Team Collaboration**: Invite team members to your Vercel project

---

## Summary

1. ✅ Create folder with all files
2. ✅ Upload to Vercel (or run locally first)
3. ✅ Get shareable URL
4. ✅ Done!

**Total Time: 5-10 minutes** ⚡

The dashboard is production-ready and can handle multiple users simultaneously!