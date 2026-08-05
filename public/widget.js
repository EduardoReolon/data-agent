(function () {
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

    // --- NOVO: Sistema de Consentimento de Cookies Discreto ---
    function initCookieConsent() {
        // Se o usuário já aceitou antes, não mostra nada
        if (localStorage.getItem('da_cookie_consent')) return;

        const banner = document.createElement('div');
        banner.id = 'da-cookie-banner';
        banner.innerHTML = `
            <style>
                #da-cookie-banner {
                    position: fixed;
                    bottom: 24px;
                    left: 24px;
                    max-width: 300px;
                    background: #ffffff;
                    border: 1px solid #e5e7eb;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                    border-radius: 12px;
                    padding: 16px;
                    z-index: 2147483647;
                    font-family: system-ui, -apple-system, sans-serif;
                    transform: translateY(150%);
                    opacity: 0;
                    transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                }
                #da-cookie-banner.show {
                    transform: translateY(0);
                    opacity: 1;
                }
                #da-cookie-banner p {
                    margin: 0 0 12px 0;
                    font-size: 13px;
                    color: #4b5563;
                    line-height: 1.5;
                }
                #da-cookie-banner button {
                    background: #2563eb;
                    color: #ffffff;
                    border: none;
                    border-radius: 8px;
                    padding: 8px 16px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    width: 100%;
                    transition: background 0.2s;
                }
                #da-cookie-banner button:hover {
                    background: #1d4ed8;
                }
                /* Ajuste para celular */
                @media (max-width: 640px) {
                    #da-cookie-banner {
                        bottom: 16px; left: 16px; right: 16px; max-width: none;
                    }
                }
            </style>
            <p>Usamos cookies para melhorar sua experiência e analisar nosso tráfego. Ao continuar, você concorda com nossa política.</p>
            <button id="da-cookie-accept">Ok, entendi</button>
        `;

        document.body.appendChild(banner);

        // Atraso de 2 segundos para não assustar o usuário assim que a página carrega
        setTimeout(() => banner.classList.add('show'), 2000);

        document.getElementById('da-cookie-accept').addEventListener('click', () => {
            localStorage.setItem('da_cookie_consent', 'true');
            banner.classList.remove('show');
            setTimeout(() => banner.remove(), 500);
            
            // Dispara um evento avisando o restante do script que pode carregar os trackers
            window.dispatchEvent(new Event('da_consent_given'));
        });
    }

    function initWhatsAppTracking(uuid, numeroWhatsApp) {
        const urlParams = new URLSearchParams(window.location.search);
        let origem = "O";
        if (urlParams.has('gclid') || urlParams.has('wbraid') || urlParams.has('gbraid')) origem = "G";
        else if (urlParams.has('fbclid')) origem = "F";
        else if (urlParams.has('utm_source')) {
            const utm = urlParams.get('utm_source').toLowerCase();
            if (utm.includes('google')) origem = "G";
            else if (utm.includes('facebook') || utm.includes('meta') || utm.includes('instagram')) origem = "F";
        }
        const clickId = urlParams.get('gclid') || urlParams.get('fbclid') || "organico";
        const randomId = Math.random().toString(36).substring(2, 7).toUpperCase();
        const idCurto = `${origem}-${randomId}`;
        const protocolo = `*Protocolo de Atendimento: #${idCurto}*`;

        const linksWhatsapp = document.querySelectorAll('a[href*="api.whatsapp.com/send"]:not([data-tracked]), a[href*="wa.me/"]:not([data-tracked]), a[href*="web.whatsapp.com/send"]:not([data-tracked])');

        linksWhatsapp.forEach(link => {
            try {
                const url = new URL(link.href);
                let textoOriginal = url.searchParams.get('text') || "";
                let novoTexto = `${textoOriginal}\n\n${protocolo}`.trim();

                if (numeroWhatsApp && numeroWhatsApp.trim() !== "") {
                    link.href = `https://api.whatsapp.com/send?phone=${numeroWhatsApp}&text=${encodeURIComponent(novoTexto)}`;
                } else {
                    url.searchParams.set('text', novoTexto);
                    link.href = url.toString();
                }

                link.setAttribute('data-tracked', 'true');

                link.addEventListener('click', () => {
                    const trackingUrl = `${API_BASE_URL}/track?uuid=${uuid}&origem=${origem}&id=${idCurto}&clickid=${clickId}`;
                    fetch(trackingUrl, { mode: 'no-cors' }).catch(() => { });
                });
            } catch (e) {
                console.error("Data Agent: Erro ao processar link do WhatsApp", e);
            }
        });
    }

    function initPerformanceManager(container) {
        const head = document.head || document.getElementsByTagName('head')[0];

        // 1. CARREGAMENTO IMEDIATO (Visual)
        if (container.getAttribute('data-load-fa') === 'true') {
            const fa = document.createElement('link');
            fa.rel = 'stylesheet';
            fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
            head.appendChild(fa);
        }

        let uiLoaded = false;
        let trackersLoaded = false;

        // 2. CARREGAMENTO PREGUIÇOSO DA UI (Não depende de cookies)
        function loadLazyUI() {
            if (uiLoaded) return;
            uiLoaded = true;

            if (container.getAttribute('data-lazy-aos') === 'true') {
                const aosCSS = document.createElement('link');
                aosCSS.rel = 'stylesheet';
                aosCSS.href = 'https://unpkg.com/aos@2.3.1/dist/aos.css';
                head.appendChild(aosCSS);
                const aosScript = document.createElement('script');
                aosScript.src = "https://unpkg.com/aos@2.3.1/dist/aos.js";
                aosScript.onload = () => AOS.init({ duration: 800, once: true, offset: 50 });
                document.body.appendChild(aosScript);
            }
        }

        // 3. CARREGAMENTO DE TRACKERS (GTM, FB, Clarity - Depende de Aceitar Cookies)
        function loadTrackers() {
            // Se o usuário não aceitou os cookies ainda, bloqueia o rastreio.
            if (!localStorage.getItem('da_cookie_consent')) return;
            
            if (trackersLoaded) return;
            trackersLoaded = true;

            const gtmIds = container.getAttribute('data-gtm-ids');
            if (gtmIds) {
                gtmIds.split(',').forEach(id => {
                    const cleanId = id.trim();
                    if (!cleanId) return;
                    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                    })(window,document,'script','dataLayer',cleanId);
                });
            }

            const fbPixel = container.getAttribute('data-fb-pixel');
            if (fbPixel) {
                !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
                n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
                document,'script','https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', fbPixel);
            }

            const clarityId = container.getAttribute('data-clarity-id');
            if (clarityId) {
                (function(c, l, a, r, i, t, y) {
                    c[a] = c[a] || function() { (c[a].q = c[a].q || []).push(arguments) };
                    t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
                    y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
                })(window, document, "clarity", "script", clarityId);
            }
        }

        const triggerLazyLoad = () => {
            loadLazyUI();
            loadTrackers();
        };

        // Dispara no scroll/toque ou após 3.5s
        ['scroll', 'mousemove', 'touchstart', 'click'].forEach(e => window.addEventListener(e, triggerLazyLoad, {once: true, passive: true}));
        setTimeout(triggerLazyLoad, 3500);

        // Se o usuário clicar em "Aceitar" no banner, carrega os trackers imediatamente
        window.addEventListener('da_consent_given', loadTrackers);
    }

    async function initReviewsWidget() {
        const containers = document.querySelectorAll('.data-agent-widget');
        
        // Inicia a verificação do banner de cookies na página
        if (containers.length > 0) {
            initCookieConsent();
        }

        for (const container of containers) {
            initPerformanceManager(container);

            const uuid = container.getAttribute('data-uuid');
            const reviewsRaw = container.getAttribute('data-reviews') || "";
            const numeroWhats = container.getAttribute('data-whatsapp-number');
            
            if (container.getAttribute('data-track-leads') === 'true') {
                initWhatsAppTracking(uuid, numeroWhats);
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

                let htmlContent = `
                    <style>
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

                    <div class="relative w-full group">
                        
                        <button class="absolute -left-4 md:-left-6 top-1/2 -translate-y-1/2 bg-white border border-gray-200 shadow-lg rounded-full w-12 h-12 flex items-center justify-center text-gray-600 z-10 hover:bg-gray-50 focus:outline-none hidden md:flex transition-transform hover:scale-105" 
                                onclick="document.getElementById('slider-${uuid}').scrollBy({left: -350, behavior: 'smooth'})">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                        </button>

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

                    const textId = `txt-${uuid}-${index}`;
                    const showLerMais = review.text.length > 150;

                    htmlContent += `
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

                        <button class="absolute -right-4 md:-right-6 top-1/2 -translate-y-1/2 bg-white border border-gray-200 shadow-lg rounded-full w-12 h-12 flex items-center justify-center text-gray-600 z-10 hover:bg-gray-50 focus:outline-none hidden md:flex transition-transform hover:scale-105" 
                                onclick="document.getElementById('slider-${uuid}').scrollBy({left: 350, behavior: 'smooth'})">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                        </button>

                    </div>

                    <div class="mt-8 flex justify-center w-full">
                            <a href="${placeInfo.google_maps_url || '#'}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center px-6 py-3 border border-gray-200 rounded-full text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm">
                                <img src="https://cdn.trustindex.io/assets/platform/Google/icon.svg" alt="Google" class="w-5 h-5 mr-3">
                                Ler todas as ${placeInfo.reviews || ''} avaliações no Google
                            </a>
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