@echo off
wt --title "ClinkerGA" cmd /k "cd /d %~dp0backend && python main.py" ; split-pane --vertical cmd /k "cd /d %~dp0frontend/vite-project && npm run dev"