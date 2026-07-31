# Data Agent 🤖

Microsserviço de "Static Site Generation" para APIs. O Data Agent busca dados de APIs pesadas/pagas (como Google Places / SerpApi), faz o cache local baixando imagens e gera arquivos estáticos (Micro-JSONs) de altíssima performance para Landing Pages.

---

## 🚀 Como instalar no site do Cliente

Para que o widget funcione na Landing Page do cliente, você só precisa que o site dele tenha o **Tailwind CSS** (padrão em ferramentas como Lovable) e inserir o código abaixo.

Abra o arquivo `arquivogeral.json` gerado pelo sistema, escolha quais depoimentos você quer mostrar e coloque os IDs (hash de 8 letras) no atributo `data-reviews`.

```html
<!-- Crie a seção onde quiser no site -->
<section class="py-12 bg-white border-y border-gray-100">
    <div class="max-w-7xl mx-auto px-4">
        
        <!-- O WIDGET GERA O CABEÇALHO E OS CARDS AQUI -->
        <div class="data-agent-widget flex flex-col justify-center min-h-[420px]"
             data-uuid="6b29fc40" 
             data-reviews="8f4a2b1c, d9a14bc2, a8f3c9e1">
        </div>

    </div>
</section>

<!-- Importe o Script no final do body -->
<!-- Substitua 'sua-api.com' pelo seu domínio real -->
<script src="https://sua-api.com/widget.js" defer></script>

```

---

## ⚙️ 1. Como configurar o Nginx (CORS e Pastas)

O Nginx será o servidor web responsável por entregar os arquivos estáticos na velocidade da luz para as Landing Pages. No seu servidor Ubuntu, crie ou edite o arquivo do bloco de servidor (ex: `/etc/nginx/sites-available/data-agent`).

Cole a configuração abaixo (ajustando os domínios e os caminhos):

```nginx
server {
    listen 80;
    server_name sua-api.com; # Substitua pelo seu subdomínio real

    # Aponta a raiz pública para a pasta gerada pelo deploy
    root /home/ubuntu/data-agent/public;
    index index.html;

    location / {
        # Tenta carregar o arquivo; se não achar, retorna 404
        try_files $uri $uri/ =404;

        # ---------------------------------------------------------
        # LIBERAÇÃO DE CORS (ESSENCIAL PARA O WIDGET FUNCIONAR)
        # ---------------------------------------------------------
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' '*' always;

        # Responde instantaneamente às requisições de preflight do navegador
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS';
            add_header 'Access-Control-Allow-Headers' '*';
            add_header 'Content-Type' 'text/plain charset=UTF-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
}

```

Após salvar o arquivo, reinicie o Nginx para aplicar as mudanças:

```bash
sudo ln -s /etc/nginx/sites-available/data-agent /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

```

---

## ⚙️ 2. Como configurar a automação (Cron Job)

O script foi desenhado para rodar automaticamente e possui uma trava interna (Cooldown) de 15 dias para economizar cota de API.

1. Acesse seu servidor via SSH e abra o painel do Cron:

```bash
crontab -e

```

2. Adicione a linha abaixo no final do arquivo. Ela fará o script rodar **todos os dias às 03:00 da manhã**.

```bash
0 3 * * * /home/ubuntu/data-agent/venv/bin/python /home/ubuntu/data-agent/script.py >> /home/ubuntu/data-agent/logs/cron.log 2>&1

```

---

## 🛠️ O fluxo de um novo cliente

1. Obtenha o `place_id` do cliente no Google Maps.
2. Gere um UUID (pode ser qualquer identificador curto).
3. Adicione o cliente no array `CLIENTES` do arquivo `script.py`.
4. Dê o `git push`. O GitHub Actions fará o deploy, rodará o script pela primeira vez e gerará o `arquivogeral.json`.
5. Abra o JSON, escolha as 3 melhores avaliações, pegue os IDs delas e coloque no HTML do cliente!