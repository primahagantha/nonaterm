@echo off
setlocal

set BUMP=%1
if "%BUMP%"=="" set BUMP=patch

for /f "tokens=*" %%i in ('node -p "require('./package.json').version"') do set CURRENT=%%i

for /f "tokens=1,2,3 delims=." %%a in ("%CURRENT%") do (
    set MAJOR=%%a
    set MINOR=%%b
    set PATCH=%%c
)

if "%BUMP%"=="patch" set /a PATCH=%PATCH%+1
if "%BUMP%"=="minor" (set /a MINOR=%MINOR%+1 & set PATCH=0)
if "%BUMP%"=="major" (set /a MAJOR=%MAJOR%+1 & set MINOR=0 & set PATCH=0)

set NEW_VERSION=%MAJOR%.%MINOR%.%PATCH%
set TAG=v%NEW_VERSION%

echo Releasing %CURRENT% -^> %NEW_VERSION%

node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));p.version='%NEW_VERSION%';fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n')"

git add package.json
git commit -m "release: %TAG%"
git tag -a %TAG% -m "Release %NEW_VERSION%"

echo Tagged %TAG%. Push with: git push ^&^& git push --tags
endlocal
