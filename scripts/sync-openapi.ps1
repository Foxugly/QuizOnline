
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot "quizonline-server"
$frontendDir = Join-Path $repoRoot "quizonline-frontend"
$venvPython = Join-Path $repoRoot ".venv\\Scripts\\python.exe"
$pythonExe = if (Test-Path $venvPython) { $venvPython } else { "python" }
$generatorArgs = @(
    "openapi-generator-cli",
    "generate",
    "-i", "openapi.yaml",
    "-g", "typescript-angular",
    "-o", "src/app/api/generated",
    "--additional-properties=ngVersion=21.0.0,providedIn=root,serviceSuffix=Api,modelSuffix=Dto,stringEnums=true,useSingleRequestParameter=true,fileNaming=kebab-case",
    "--inline-schema-name-mappings",
    "DomainDetail_translations_value=LocalizedNameDescriptionTranslation,QuestionAnswerOptionRead_translations_value=LocalizedAnswerOptionTranslation,QuestionInSubject_title_value=LocalizedQuestionTitleTranslation,QuestionRead_translations_value=LocalizedQuestionTranslation,SubjectDetail_translations_value=LocalizedSubjectDetailTranslation,SubjectRead_translations_value=LocalizedSubjectTranslation,SubjectRead_translations_value_domain=DomainNameSummary"
)

Push-Location $backendDir
try {
    & $pythonExe manage.py spectacular --file openapi.yaml
    Copy-Item openapi.yaml (Join-Path $frontendDir "openapi.yaml") -Force
}
finally {
    Pop-Location
}

Push-Location $frontendDir
try {
    & npx @generatorArgs
}
finally {
    Pop-Location
}
