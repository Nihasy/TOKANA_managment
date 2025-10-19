# Script pour autoriser Next.js dans le pare-feu Windows
# Exécutez ce script en tant qu'administrateur

Write-Host "🔓 Configuration du pare-feu Windows..." -ForegroundColor Cyan
Write-Host ""

# Supprimer les anciennes règles si elles existent
Write-Host "Nettoyage des anciennes règles..." -ForegroundColor Yellow
Get-NetFirewallRule -DisplayName "*Next.js*" -ErrorAction SilentlyContinue | Remove-NetFirewallRule

# Autoriser le port 3000
Write-Host "Création de la règle pour le port 3000..." -ForegroundColor Yellow
New-NetFirewallRule -DisplayName "Next.js Dev Server (Port 3000)" `
    -Direction Inbound `
    -LocalPort 3000 `
    -Protocol TCP `
    -Action Allow `
    -Profile Domain,Private,Public `
    -Enabled True

# Autoriser le port 3001 (au cas où)
Write-Host "Création de la règle pour le port 3001..." -ForegroundColor Yellow
New-NetFirewallRule -DisplayName "Next.js Dev Server (Port 3001)" `
    -Direction Inbound `
    -LocalPort 3001 `
    -Protocol TCP `
    -Action Allow `
    -Profile Domain,Private,Public `
    -Enabled True

Write-Host ""
Write-Host "✅ Pare-feu configuré avec succès!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Sur votre téléphone, accédez à:" -ForegroundColor Cyan
Write-Host "   http://192.168.137.1:3000" -ForegroundColor White
Write-Host ""
Write-Host "ℹ️  Si cela ne fonctionne toujours pas:" -ForegroundColor Yellow
Write-Host "   1. Vérifiez que votre téléphone est bien connecté au point d'accès" -ForegroundColor Gray
Write-Host "   2. Redémarrez le serveur Next.js (Ctrl+C puis 'npm run dev')" -ForegroundColor Gray
Write-Host "   3. Essayez de désactiver temporairement l'antivirus" -ForegroundColor Gray
Write-Host ""

# Afficher les règles créées
Write-Host "Règles de pare-feu créées:" -ForegroundColor Cyan
Get-NetFirewallRule -DisplayName "*Next.js*" | Select-Object DisplayName, Enabled, Direction, Action | Format-Table -AutoSize

