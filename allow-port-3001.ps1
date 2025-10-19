# Script pour autoriser le port 3001 dans le pare-feu Windows
# Exécutez ce script en tant qu'administrateur

Write-Host "🔓 Configuration du pare-feu Windows pour le port 3001..." -ForegroundColor Cyan

# Autoriser les connexions entrantes sur le port 3001
New-NetFirewallRule -DisplayName "Next.js Dev Server (Port 3001)" `
    -Direction Inbound `
    -LocalPort 3001 `
    -Protocol TCP `
    -Action Allow `
    -Profile Domain,Private,Public

Write-Host "✅ Règle de pare-feu créée avec succès!" -ForegroundColor Green
Write-Host ""
Write-Host "Vous pouvez maintenant accéder à l'application depuis votre téléphone:" -ForegroundColor Yellow
Write-Host "http://192.168.0.108:3001" -ForegroundColor White

