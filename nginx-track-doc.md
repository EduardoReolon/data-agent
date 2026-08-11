# 📝 Documentação: Sistema de Rastreamento de Leads com Nginx

Este documento descreve a configuração de um sistema de tracking de alta performance usando o Nginx como endpoint para receber dados (via Pixel/Widget), salvando os registros em formato JSON e separando automaticamente os arquivos de log por domínio de origem.

O sistema inclui uma política de retenção de longo prazo (10 anos), mantendo os arquivos compactados mensalmente para economizar espaço em disco.

---

## 1. Criação da Estrutura de Pastas

Como os arquivos de log serão criados dinamicamente com base no domínio, o Nginx precisa de uma pasta própria com as permissões corretas.

Execute no terminal do servidor:

```bash
# Cria a pasta para os logs dinâmicos
sudo mkdir -p /var/log/nginx/leads

# Passa a propriedade da pasta para o usuário do Nginx
sudo chown www-data:www-data /var/log/nginx/leads

```

---

## 2. Configuração do Nginx

Abra ou crie o seu arquivo de configuração do site (ex: `/etc/nginx/sites-available/tracking`).

### 2.1. Variáveis Dinâmicas e Formato do Log

Adicione as configurações abaixo **fora** do bloco `server` (no nível `http` ou solto no topo do arquivo):

```nginx
# Define o formato do log em JSON
log_format tracking_json escape=json '{'
    '"timestamp": "$time_iso8601", '
    '"ip": "$remote_addr", '
    '"dominio": "$http_referer", '
    '"uuid_cliente": "$arg_uuid", '
    '"origem": "$arg_origem", '
    '"id_curto": "$arg_id", '
    '"gclid_fbclid": "$arg_clickid", '
    '"user_agent": "$http_user_agent"'
'}';

# Filtra a URL inteira (Referer) e extrai apenas o domínio principal
map $http_referer $clean_domain {
    # Se o referer estiver vazio (Testes locais, Postman, etc)
    "" "teste_local";

    # NOVO: Se tiver www., extrai apenas o que vem DEPOIS dele
    "~^https?://www\.([^/:]+)" $1;

    # Se NÃO tiver www, extrai o domínio normalmente
    "~^https?://([^/:]+)" $1;

    # Fallback para acessos anômalos
    default "desconhecido";
}

# Cache de descritores de arquivos para otimizar a gravação dinâmica
open_log_file_cache max=100 inactive=20s valid=1m min_uses=2;

```

### 2.2. O Endpoint de Coleta (`/track`)

Dentro do seu bloco `server { ... }`, adicione a rota fantasma que receberá os dados:

```nginx
server {
    listen 443 ssl;
    server_name data.seusite.com.br;

    # ... (Suas configurações de SSL e Root vêm aqui) ...

    # Rota fantasma para rastreamento de leads
    location /track {
        # Opcional: Limite de requisições para evitar DDoS
        # limit_req zone=lead_tracking burst=10 nodelay;

        # Liberação de CORS (Essencial para receber de outros domínios)
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;

        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS';
            add_header 'Content-Type' 'text/plain charset=UTF-8';
            add_header 'Content-Length' 0;
            return 204;
        }

        # Grava o log dinamicamente usando a variável $clean_domain
        access_log /var/log/nginx/leads/$clean_domain.log tracking_json;

        # Retorna sucesso sem conteúdo
        return 204;
    }
}

```

Após salvar, valide as configurações e recarregue o Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx

```

---

## 3. Configuração do Logrotate (Histórico "Infinito")

Para evitar que os arquivos cresçam demais e travem o servidor, configuramos o Logrotate para "fechar" um arquivo por mês e compactá-lo. O histórico será guardado por 10 anos (120 meses).

Crie o arquivo de configuração:

```bash
sudo nano /etc/logrotate.d/nginx-leads

```

Cole o conteúdo abaixo:

```text
/var/log/nginx/leads/*.log {
    monthly
    missingok
    rotate 120
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ ! -f /var/run/nginx.pid ] || kill -USR1 `cat /var/run/nginx.pid`
    endscript
}

```

* **monthly:** Fecha o arquivo no final de cada mês.
* **rotate 120:** Mantém o histórico de 120 arquivos antigos por domínio (10 anos).
* **compress:** Transforma em `.gz` para economizar até 90% do espaço.

---

## 4. Como Ler e Buscar os Dados

Os arquivos estarão localizados em `/var/log/nginx/leads/`. Você verá arquivos como `acupunturacuritiba.com.br.log` (mês atual) e `acupunturacuritiba.com.br.log.2.gz` (meses anteriores).

### 4.1. Busca Rápida (Um único ID)

Use o comando `zgrep` para buscar em **todos os meses** de um cliente específico ao mesmo tempo, sem precisar descompactar nada:

```bash
zgrep "G-CM078" /var/log/nginx/leads/acupunturacuritiba.com.br.log*

```

### 4.2. Busca em Massa (Múltiplos IDs)

Se você precisa buscar os dados de uma lista de leads que fecharam negócio, crie um arquivo de texto simples no seu terminal (ex: `fechamentos.txt`) contendo um ID por linha:

```text
O-OUR3Q
G-CM078
G-2T9CT
G-KDMOS

```

Em seguida, rode o `zgrep` apontando para essa lista:

```bash
zgrep -f fechamentos.txt /var/log/nginx/leads/acupunturacuritiba.com.br.log*

```

*O Linux irá cruzar a sua lista de texto com todos os gigabytes de logs (compactados ou não) e retornar apenas as linhas (JSONs) dos leads informados.*

### 4.3. Visualização Formatada com `jq`

Para ler o arquivo do mês atual de forma estruturada e colorida:

```bash
cat /var/log/nginx/leads/acupunturacuritiba.com.br.log | jq .

```

Para extrair todos os dados de todos os tempos e exportar para um único arquivo (para mandar para o PowerBI, Excel, ou Python):

```bash
zcat -f /var/log/nginx/leads/acupunturacuritiba.com.br.log* > base_completa_cliente.json

```