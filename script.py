import requests
import json
import os
import time
import hashlib
from datetime import datetime
from dotenv import load_dotenv

# Carrega variáveis do arquivo .env
load_dotenv()

SERPAPI_KEY = os.getenv("SERPAPI_KEY")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, "public", "clientes")

# ---------------------------------------------------------
# CONFIGURAÇÃO DE DEFESA DA API E ECONOMIA
DIAS_INTERVALO = 15
# ---------------------------------------------------------

CLIENTES = [
    {
        "uuid": "6b29fc40", 
        "nome": "Acupuntura Curitiba Diego Bertuol",
        "google_place_id": "ChIJVSUSrHbk3JQRAPA7pEOV5iE"
    }
]

def baixar_foto(url, caminho_destino):
    """Baixa a foto apenas se ela ainda não existir no disco"""
    try:
        # OTIMIZAÇÃO: Se a foto já existe, não gasta banda baixando de novo!
        if os.path.exists(caminho_destino):
            return True
            
        res = requests.get(url, stream=True, timeout=10)
        if res.status_code == 200:
            with open(caminho_destino, 'wb') as f:
                for chunk in res.iter_content(1024):
                    f.write(chunk)
            return True
    except Exception as e:
        print(f"Erro ao baixar foto: {e}")
    return False

def gerar_id_review(nome_autor):
    """Gera um ID curto e único de 8 caracteres baseado no nome do autor"""
    return hashlib.md5(nome_autor.encode('utf-8')).hexdigest()[:8]

def processar_google_reviews(cliente):
    uuid = cliente["uuid"]
    place_id = cliente.get("google_place_id")
    
    if not place_id:
        return
        
    pasta_google = os.path.join(PUBLIC_DIR, uuid, "google_reviews")
    pasta_avaliacoes = os.path.join(pasta_google, "avaliacoes")
    os.makedirs(pasta_avaliacoes, exist_ok=True)
    
    caminho_geral = os.path.join(pasta_google, "arquivogeral.json")
    caminho_header = os.path.join(pasta_google, "header.json")
    
    # =========================================================
    # 1. TRAVA DOS 15 DIAS (COOLDOWN)
    # =========================================================
    if os.path.exists(caminho_geral):
        tempo_modificacao = os.path.getmtime(caminho_geral)
        dias_passados = (time.time() - tempo_modificacao) / (60 * 60 * 24)
        
        if dias_passados < DIAS_INTERVALO:
            print(f"[{uuid}] ⏭️  Atualizado há {dias_passados:.1f} dias. Pulando (Cooldown: {DIAS_INTERVALO} dias).")
            return

    print(f"[{uuid}] 🔄 Buscando atualizações via SerpApi para: {cliente['nome']}...")
    
    # =========================================================
    # 2. CARREGA O HISTÓRICO PARA EVITAR DUPLICATAS
    # =========================================================
    historico_reviews = {}
    if os.path.exists(caminho_geral):
        with open(caminho_geral, 'r', encoding='utf-8') as f:
            dados_antigos = json.load(f)
            # Carrega tudo usando o ID como chave (assim, nunca duplica!)
            for r in dados_antigos.get('reviews', []):
                historico_reviews[r['id']] = r

    # =========================================================
    # 3. REQUISIÇÃO PARA A API
    # =========================================================
    url_serpapi = "https://serpapi.com/search.json"
    parametros = {
        "engine": "google_maps_reviews",
        "place_id": place_id,
        "hl": "pt",
        "api_key": SERPAPI_KEY
    }
    
    try:
        res = requests.get(url_serpapi, params=parametros, timeout=15)
        dados_serpapi = res.json()
        
        # Salva o Header (Média e Total da Empresa)
        place_info = dados_serpapi.get('place_info', {})
        place_info['google_maps_url'] = f"https://www.google.com/maps/search/?api=1&query=Google&query_place_id={place_id}"
        with open(caminho_header, 'w', encoding='utf-8') as f:
            json.dump(place_info, f, ensure_ascii=False)

        # =========================================================
        # 4. PROCESSA AS AVALIAÇÕES (Merge com o histórico)
        # =========================================================
        novas_adicionadas = 0
        if 'reviews' in dados_serpapi:
            for review in dados_serpapi['reviews']:
                # Ignora reviews menores que 4 estrelas
                if review.get('rating', 0) < 4:
                    continue
                    
                nome_autor = review.get('user', {}).get('name', 'Anônimo')
                review_id = gerar_id_review(nome_autor)
                
                foto_url = review.get('user', {}).get('thumbnail')
                nome_foto = f"foto_{review_id}.jpg"
                caminho_foto = os.path.join(pasta_avaliacoes, nome_foto)
                
                foto_relativa = None
                if foto_url and baixar_foto(foto_url, caminho_foto):
                    foto_relativa = nome_foto
                
                data_exata = review.get('iso_date_of_last_update') or review.get('iso_date') or review.get('date', '')
                    
                review_formatada = {
                    "id": review_id,
                    "author_name": nome_autor,
                    "profile_photo_url": foto_relativa,
                    "rating": review.get('rating'),
                    "text": review.get('snippet', ''),
                    "relative_time_description": data_exata
                }
                
                # Conta se é uma pessoa nova que não estava no JSON antigo
                if review_id not in historico_reviews:
                    novas_adicionadas += 1
                    
                # Insere ou Atualiza no Dicionário
                historico_reviews[review_id] = review_formatada
                
                # Salva o micro-JSON individual (sobrescreve se já existir)
                caminho_micro_json = os.path.join(pasta_avaliacoes, f"{review_id}.json")
                with open(caminho_micro_json, 'w', encoding='utf-8') as f:
                    json.dump(review_formatada, f, ensure_ascii=False)

        # =========================================================
        # 5. SALVA O ARQUIVO GERAL PARA O ADMIN (VOCÊ)
        # =========================================================
        json_para_admin = {
            "total_acumulado": len(historico_reviews),
            "ultima_atualizacao": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "reviews": list(historico_reviews.values())
        }
        
        with open(caminho_geral, 'w', encoding='utf-8') as f:
            json.dump(json_para_admin, f, ensure_ascii=False, indent=2)
            
        print(f"[{uuid}] ✅ Sucesso! {novas_adicionadas} reviews novas. Total Acumulado: {len(historico_reviews)}.")
        
    except Exception as e:
        print(f"[{uuid}] ❌ Erro na requisição: {e}")

def main():
    if not SERPAPI_KEY:
        print("❌ ERRO: A variável SERPAPI_KEY não foi encontrada.")
        return

    print("Iniciando Data Agent...")
    for cliente in CLIENTES:
        processar_google_reviews(cliente)
    print("Processamento concluído!")

if __name__ == "__main__":
    main()