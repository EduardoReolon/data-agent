(function() {
    const currentScript = document.currentScript;
    if (!currentScript) {
        console.error("Data Agent: Script origin not found.");
        return;
    }
    
    const scriptUrl = new URL(currentScript.src);
    const API_BASE_URL = scriptUrl.origin; 

    function generateStars(rating) {
        let starsHtml = '';
        for (let i = 0; i < rating; i++) {
            starsHtml += '<i class="fas fa-star"></i>';
        }
        return starsHtml;
    }

    function timeAgo(dateString) {
        if (!dateString) return "Recentemente";
        const past = new Date(dateString);
        if (isNaN(past.getTime())) return dateString; 
        
        const now = new Date();
        const diffMs = now - past;
        const seconds = Math.round(diffMs / 1000);
        const minutes = Math.round(seconds / 60);
        const hours = Math.round(minutes / 60);
        const days = Math.round(hours / 24);
        const months = Math.round(days / 30);
        const years = Math.round(days / 365);

        if (years > 0) return `Há ${years} ano${years > 1 ? 's' : ''}`;
        if (months > 0) return `Há ${months} mês${months > 1 ? 'es' : ''}`;
        if (days > 0) return `Há ${days} dia${days > 1 ? 's' : ''}`;
        if (hours > 0) return `Há ${hours} hora${hours > 1 ? 's' : ''}`;
        if (minutes > 0) return `Há ${minutes} minuto${minutes > 1 ? 's' : ''}`;
        return "Recentemente";
    }

    function initWhatsAppTracking(uuid) {
        const urlParams = new URLSearchParams(window.location.search);
        let origem = "O";
        
        if (urlParams.has('gclid') || urlParams.has('wbraid') || urlParams.has('gbraid')) {
            origem = "G";
        } else if (urlParams.has('fbclid')) {
            origem = "F";
        } else if (urlParams.has('utm_source')) {
            const utm = urlParams.get('utm_source').toLowerCase();
            if (utm.includes('google')) origem = "G";
            else if (utm.includes('facebook') || utm.includes('meta') || utm.includes('instagram')) origem = "F";
        }

        const clickId = urlParams.get('gclid') || urlParams.get('fbclid') || "organico";
        const randomId = Math.random().toString(36).substring(2, 7).toUpperCase();
        const idCurto = `${origem}-${randomId}`;
        const protocolo = `*Protocolo de Atendimento: #${idCurto}*`;

        // Busca links abrangendo api.whatsapp, wa.me e web.whatsapp que ainda não foram modificados
        const linksWhatsapp = document.querySelectorAll('a[href*="api.whatsapp.com/send"]:not([data-tracked]), a[href*="wa.me/"]:not([data-tracked]), a[href*="web.whatsapp.com/send"]:not([data-tracked])');
        
        linksWhatsapp.forEach(link => {
            try {
                const url = new URL(link.href);
                let textoOriginal = url.searchParams.get('text') || "";
                
                // Injeta o protocolo mantendo o número que já estava na URL (funciona para as 3 variações)
                url.searchParams.set('text', `${textoOriginal}\n\n${protocolo}`);
                link.href = url.toString();
                link.setAttribute('data-tracked', 'true');

                // Dispara o tracking fantasma no NGINX antes de abrir a janela
                link.addEventListener('click', () => {
                    const trackingUrl = `${API_BASE_URL}/track?uuid=${uuid}&origem=${origem}&id=${idCurto}&clickid=${clickId}`;
                    fetch(trackingUrl, { mode: 'no-cors' }).catch(() => {});
                });
            } catch (e) {
                console.error("Data Agent: Erro ao processar link do WhatsApp", e);
            }
        });
    }

    async function initReviewsWidget() {
        const containers = document.querySelectorAll('.data-agent-widget');

        for (const container of containers) {
            const uuid = container.getAttribute('data-uuid');
            const reviewsRaw = container.getAttribute('data-reviews') || "";
            if (container.getAttribute('data-track-leads') === 'true') {
                initWhatsAppTracking(uuid);
            }

            const reviewIds = reviewsRaw.split(',').map(id => id.trim()).filter(id => id);
            
            if (!uuid || reviewIds.length === 0) continue;

            container.innerHTML = '<p style="text-align:center; color:#6b7280;">Carregando avaliações...</p>';

            try {
                const baseUrl = `${API_BASE_URL}/clientes/${uuid}/google_reviews`;
                
                const headerPromise = fetch(`${baseUrl}/header.json`).then(r => r.json());
                const reviewPromises = reviewIds.map(id => 
                    fetch(`${baseUrl}/avaliacoes/${id}.json`).then(r => r.ok ? r.json() : null)
                );

                const [placeInfo, ...reviewsData] = await Promise.all([headerPromise, ...reviewPromises]);
                const validReviews = reviewsData.filter(r => r !== null);

                const mediaFormatada = String(placeInfo.rating || '5,0').replace('.', ',');
                
                // INÍCIO DO HTML INJETADO
                let htmlContent = `
                    <style>
                        /* Esconde a scrollbar nativa mas mantém o toque/arrasto funcionando */
                        .data-agent-no-scrollbar::-webkit-scrollbar { display: none; }
                        .data-agent-no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                    </style>
                    
                    <div class="flex flex-col items-center justify-center mb-10">
                        <span class="text-gray-900 font-bold text-xl uppercase tracking-wider mb-2">Excelente ${mediaFormatada}</span>
                        <div class="flex text-yellow-400 text-2xl mb-2">
                            <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>
                        </div>
                        <span class="text-sm text-gray-500 font-semibold">Com base em ${placeInfo.reviews || '...'} avaliações</span>
                        <img src="https://cdn.trustindex.io/assets/platform/Google/logo.svg" alt="Google" class="h-6 mt-2">
                    </div>

                    <!-- CONTAINER DO CARROSSEL -->
                    <div class="relative w-full group">
                        
                        <!-- SETA ESQUERDA (Oculta no celular) -->
                        <button class="absolute -left-4 md:-left-6 top-1/2 -translate-y-1/2 bg-white border border-gray-200 shadow-lg rounded-full w-12 h-12 flex items-center justify-center text-gray-600 z-10 hover:bg-gray-50 focus:outline-none hidden md:flex transition-transform hover:scale-105" 
                                onclick="document.getElementById('slider-${uuid}').scrollBy({left: -350, behavior: 'smooth'})">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                        </button>

                        <!-- TRILHA DO CARROSSEL -->
                        <div id="slider-${uuid}" class="flex overflow-x-auto snap-x snap-mandatory gap-6 data-agent-no-scrollbar pb-4 px-2">
                `;

                validReviews.forEach((review, index) => {
                    const initial = review.author_name.charAt(0).toUpperCase();
                    let avatarHtml = '';
                    if (review.profile_photo_url) {
                        const fotoUrl = `${baseUrl}/avaliacoes/${review.profile_photo_url}`;
                        avatarHtml = `<img src="${fotoUrl}" class="w-12 h-12 rounded-full mr-4 object-cover border border-gray-100">`;
                    } else {
                        avatarHtml = `<div class="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4 text-lg">${initial}</div>`;
                    }

                    // ID único para o texto truncado
                    const textId = `txt-${uuid}-${index}`;
                    
                    // Condição para mostrar o botão "Ler mais" só se o texto for grandinho (> 150 caracteres)
                    const showLerMais = review.text.length > 150;

                    htmlContent += `
                        <!-- CARTÃO INDIVIDUAL -->
                        <!-- snap-center garante que pare no lugar certo. w-full no cel, 33% no desktop -->
                        <div class="bg-gray-50 border border-gray-100 rounded-xl p-6 shadow-sm flex-none w-full snap-center md:w-[calc(33.333%-1rem)] flex flex-col transition-all hover:shadow-md">
                            <div class="flex items-center mb-4">
                                ${avatarHtml}
                                <div>
                                    <p class="font-bold text-gray-800 text-sm md:text-base">${review.author_name}</p>
                                    <p class="text-xs text-gray-500">${timeAgo(review.relative_time_description)}</p>
                                </div>
                            </div>
                            <div class="flex text-yellow-400 text-sm mb-4">
                                ${generateStars(review.rating)}
                            </div>
                            
                            <!-- CORPO DO TEXTO COM LINE CLAMP -->
                            <div class="flex-grow">
                                <p id="${textId}" class="text-gray-600 text-sm md:text-base leading-relaxed line-clamp-5 transition-all duration-300">${review.text}</p>
                                ${showLerMais ? `
                                    <button onclick="
                                        const p = document.getElementById('${textId}'); 
                                        p.classList.toggle('line-clamp-5'); 
                                        this.innerText = p.classList.contains('line-clamp-5') ? 'Ler mais' : 'Ocultar';
                                    " class="text-blue-600 hover:text-blue-800 text-sm font-semibold mt-2 focus:outline-none">
                                        Ler mais
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `;
                });

                htmlContent += `
                        </div>

                        <!-- SETA DIREITA (Oculta no celular) -->
                        <button class="absolute -right-4 md:-right-6 top-1/2 -translate-y-1/2 bg-white border border-gray-200 shadow-lg rounded-full w-12 h-12 flex items-center justify-center text-gray-600 z-10 hover:bg-gray-50 focus:outline-none hidden md:flex transition-transform hover:scale-105" 
                                onclick="document.getElementById('slider-${uuid}').scrollBy({left: 350, behavior: 'smooth'})">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                        </button>

                    </div>
                `;
                
                container.innerHTML = htmlContent;

            } catch (error) {
                console.error("Data Agent Erro:", error);
                container.innerHTML = '<p style="text-align:center; color:#ef4444;">Não foi possível carregar as avaliações no momento.</p>';
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initReviewsWidget);
    } else {
        initReviewsWidget();
    }
})();