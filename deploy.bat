@echo off
echo Deploying Smokiez Dashboard...
git add data/*.xlsx
git add .
git commit -m "Update dashboard data - %date% %time%"
git push
echo Deployment triggered! Check GitHub Actions for progress.
pause
