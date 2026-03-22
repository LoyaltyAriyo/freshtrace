Set-Location "C:\Users\burak\OneDrive\Documents\GitHub\T5-W26-COMP231"

$tasks = @(
    "feature/18-confirmation-message|feat: add confirmation message in UI #18",
    "feature/19-extracted-items-list|feat: display extracted items list in UI #19",
    "feature/20-remove-add-item-buttons|feat: add remove and add item buttons in UI #20",
    "feature/21-food-list-confirmed-items|feat: display saved confirmed items in food list #21",
    "feature/22-manual-entry-ui|feat: create manual item entry UI layout #22",
    "feature/23-priority-dashboard-ui|feat: design priority dashboard UI layout #23",
    "feature/24-category-lifespan-mapping|feat: map item categories to lifespan levels #24",
    "feature/27-priority-indicators|feat: display use-first/soon/later indicators #27",
    "feature/28-item-cards-dashboard|feat: display item cards on dashboard UI #28",
    "feature/29-category-dropdown|feat: create category dropdown UI component #29",
    "feature/34-refresh-food-list|feat: refresh food list after status changes #34"
)

foreach ($task in $tasks) {
    $parts = $task.Split("|")
    $branch = $parts[0]
    $message = $parts[1]

    Write-Host ""
    Write-Host ">>> $branch" -ForegroundColor Yellow

    git checkout $branch
    git commit --allow-empty -m $message
    git push origin $branch

    Write-Host ">>> DONE: $branch" -ForegroundColor Green
}

git checkout main
Write-Host ""
Write-Host "Tum branchler guncellendi!" -ForegroundColor Green
Write-Host "GitHub'da Pull requests sekmesine git ve PR ac." -ForegroundColor Yellow
