@echo off
REM ==========================================
REM Script auxiliar para Docker - Windows
REM Uso: docker-helper.bat [comando]
REM ==========================================

if "%1"=="" goto help
if "%1"=="dev" goto dev
if "%1"=="prod" goto prod
if "%1"=="stop" goto stop
if "%1"=="logs" goto logs
if "%1"=="status" goto status
if "%1"=="build" goto build
if "%1"=="clean" goto clean
if "%1"=="db" goto db
if "%1"=="seed" goto seed
if "%1"=="backup" goto backup
if "%1"=="help" goto help
goto help

:dev
echo [INFO] Iniciando ambiente de DESENVOLVIMENTO...
echo [INFO] Usando PostgreSQL do Docker (banco: studio_dev)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
goto end

:prod
echo [INFO] Iniciando ambiente de PRODUCAO...
if not exist ".env.prod" (
    echo [ERRO] Arquivo .env.prod nao encontrado!
    echo [INFO] Crie a partir de .env.prod.example
    goto end
)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
echo [OK] Containers iniciados em modo daemon
echo [INFO] Use 'docker-helper.bat logs' para ver os logs
goto end

:stop
echo [INFO] Parando todos os containers...
docker-compose down
echo [OK] Containers parados
goto end

:logs
if "%2"=="" (
    docker-compose logs -f
) else (
    docker-compose logs -f %2
)
goto end

:status
echo [INFO] Status dos containers:
docker-compose ps
goto end

:build
echo [INFO] Rebuilding containers...
if "%2"=="" (
    docker-compose build --no-cache
) else (
    docker-compose build --no-cache %2
)
echo [OK] Build concluido
goto end

:clean
echo [ATENCAO] Isso vai remover TODOS os containers e volumes!
set /p confirm="Tem certeza? (yes/no): "
if "%confirm%"=="yes" (
    docker-compose down -v
    echo [OK] Cleanup completo
) else (
    echo [INFO] Cancelado
)
goto end

:db
echo [INFO] Conectando ao PostgreSQL...
docker-compose exec postgres psql -U dev_user -d studio_dev
goto end

:seed
echo [INFO] Executando seed do banco de dados...
docker-compose exec backend-node npm run db:seed
echo [OK] Seed concluido
goto end

:backup
echo [INFO] Criando backup do banco de dados...
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YYYY=%dt:~0,4%"
set "MM=%dt:~4,2%"
set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%"
set "Min=%dt:~10,2%"
set "backup_file=backup_%YYYY%%MM%%DD%_%HH%%Min%.sql"
docker-compose exec -T postgres pg_dump -U dev_user studio_dev > %backup_file%
echo [OK] Backup salvo em: %backup_file%
goto end

:help
echo.
echo === Docker Helper - Studio Project ===
echo.
echo Uso: docker-helper.bat [comando]
echo.
echo Comandos:
echo   dev      Inicia ambiente de desenvolvimento (PostgreSQL Docker)
echo   prod     Inicia ambiente de producao (requer .env.prod)
echo   stop     Para todos os containers
echo   logs     Mostra logs (logs [servico])
echo   status   Mostra status dos containers
echo   build    Rebuild containers
echo   clean    Remove containers e volumes
echo   db       Conecta ao PostgreSQL
echo   seed     Executa seed do banco de dados
echo   backup   Cria backup do banco de dados
echo   help     Mostra esta ajuda
echo.
echo Servicos: frontend, backend-node, postgres
echo.
echo Arquivos de ambiente:
echo   .env.dev           - Desenvolvimento (ja configurado)
echo   .env.prod          - Producao (criar de .env.prod.example)
echo.

:end
