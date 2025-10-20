@echo off
echo Deploying Smokiez Dashboard...
echo.
echo Copying latest data file...
for %%f in (data\*.xlsx) do copy /Y "%%f" "public\data.xlsx"
echo.
echo Building production version...
call npm run build
echo.
echo Deploying to Vercel...
call npx vercel --prod --yes
echo.
echo Deployment complete!
echo.
pause
