(function () {
    // 1. PEGA AS CONFIGURAÇÕES DIRETAMENTE DA TAG <SCRIPT> (que estará no base.html)
    const currentScript = document.currentScript || document.getElementById('data-agent-script');
    if (!currentScript) {
        console.error("Data Agent: Script origin not found.");
        return;
    }

    const scriptUrl = new URL(currentScript.src);
    const API_BASE_URL = scriptUrl.origin;

    const widgetStyle = document.createElement('link');
    widgetStyle.rel = 'stylesheet';
    widgetStyle.href = `${API_BASE_URL}/style.css`;
    document.head.appendChild(widgetStyle);

    // Variáveis lidas do script
    const uuid = currentScript.getAttribute('data-uuid');
    const reviewsRaw = currentScript.getAttribute('data-reviews') || "";
    const numeroWhats = currentScript.getAttribute('data-whatsapp-number');
    const trackLeads = currentScript.getAttribute('data-track-leads') === 'true';
    const gtmIds = currentScript.getAttribute('data-gtm-ids');
    const fbPixel = currentScript.getAttribute('data-fb-pixel');
    const clarityId = currentScript.getAttribute('data-clarity-id');
    const loadFa = currentScript.getAttribute('data-load-fa') === 'true';
    const lazyAos = currentScript.getAttribute('data-lazy-aos') === 'true';

    // --- CONFIGURAÇÃO INICIAL GOOGLE CONSENT MODE V2 ---
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    
    const userHasConsent = localStorage.getItem('da_cookie_consent') === 'true';

    gtag('consent', 'default', {
        'ad_storage': userHasConsent ? 'granted' : 'denied',
        'ad_user_data': userHasConsent ? 'granted' : 'denied',
        'ad_personalization': userHasConsent ? 'granted' : 'denied',
        'analytics_storage': userHasConsent ? 'granted' : 'denied',
        'wait_for_update': 500
    });

    // Funções utilitárias
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

    // --- NOVO: BANNER DE COOKIES PARA LANDING PAGE ---
    function initCookieConsent() {
        if (localStorage.getItem('da_cookie_consent') !== null) return; 

        const banner = document.createElement('div');
        banner.id = 'da-cookie-banner';
        banner.innerHTML = `
            <style>
                #da-cookie-banner {
                    position: fixed;
                    bottom: 24px;
                    left: 50%;
                    transform: translate(-50%, 150%);
                    width: calc(100% - 48px);
                    max-width: 750px;
                    background: #ffffff;
                    border: 1px solid #e5e7eb;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
                    border-radius: 16px;
                    padding: 20px;
                    z-index: 2147483647;
                    font-family: system-ui, -apple-system, sans-serif;
                    opacity: 0;
                    transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                #da-cookie-banner.show {
                    transform: translate(-50%, 0);
                    opacity: 1;
                }
                .da-cookie-content { flex: 1; }
                .da-cookie-content h4 {
                    margin: 0 0 6px 0; font-size: 16px; font-weight: 700; color: #111827;
                }
                .da-cookie-content p {
                    margin: 0; font-size: 13.5px; color: #4b5563; line-height: 1.5;
                }
                .da-cookie-buttons {
                    display: flex; flex-direction: column; gap: 10px;
                }
                .da-btn-accept {
                    background: #2563eb; color: #ffffff; border: none; border-radius: 8px;
                    padding: 12px 20px; font-size: 14px; font-weight: 700; cursor: pointer;
                    transition: background 0.2s; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
                }
                .da-btn-accept:hover { background: #1d4ed8; }
                .da-btn-reject {
                    background: transparent; color: #6b7280; border: 1px solid #d1d5db;
                    border-radius: 8px; padding: 12px 20px; font-size: 14px; font-weight: 600;
                    cursor: pointer; transition: all 0.2s;
                }
                .da-btn-reject:hover { background: #f3f4f6; color: #374151; }
                @media (min-width: 640px) {
                    #da-cookie-banner { flex-direction: row; align-items: center; padding: 24px; }
                    .da-cookie-buttons { flex-direction: row; flex-shrink: 0; }
                }
            </style>
            
            <div class="da-cookie-content">
                <h4>Sua privacidade</h4>
                <p>Usamos cookies para melhorar sua experiência, analisar o tráfego da página e personalizar nossos anúncios. Você pode aceitar todos ou recusar os não essenciais.</p>
            </div>
            <div class="da-cookie-buttons">
                <button class="da-btn-reject" id="da-cookie-reject">Recusar</button>
                <button class="da-btn-accept" id="da-cookie-accept">Aceitar Todos</button>
            </div>
        `;

        document.body.appendChild(banner);
        setTimeout(() => banner.classList.add('show'), 1500);

        function closeBanner() {
            banner.classList.remove('show');
            setTimeout(() => banner.remove(), 600);
        }

        document.getElementById('da-cookie-accept').addEventListener('click', () => {
            localStorage.setItem('da_cookie_consent', 'true');
            closeBanner();
            gtag('consent', 'update', {
                'ad_storage': 'granted', 'ad_user_data': 'granted',
                'ad_personalization': 'granted', 'analytics_storage': 'granted'
            });
            window.dispatchEvent(new Event('da_consent_given'));
        });

        document.getElementById('da-cookie-reject').addEventListener('click', () => {
            localStorage.setItem('da_cookie_consent', 'false'); 
            closeBanner();
        });
    }

    // --- TRACKING WHATSAPP ---
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

    // --- PERFORMANCE MANAGER (GTM, FB, Clarity) ---
    function initPerformanceManager() {
        const head = document.head || document.getElementsByTagName('head')[0];

        if (loadFa) {
            const fa = document.createElement('link');
            fa.rel = 'stylesheet';
            fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
            fa.media = 'print';
            fa.onload = function() { this.media = 'all'; };
            head.appendChild(fa);
        }

        let uiLoaded = false, gtmLoaded = false, strictTrackersLoaded = false;

        function loadLazyUI() {
            if (uiLoaded) return;
            uiLoaded = true;
            if (lazyAos) {
                const aosCSS = document.createElement('link'); aosCSS.rel = 'stylesheet'; aosCSS.href = 'https://unpkg.com/aos@2.3.1/dist/aos.css'; head.appendChild(aosCSS);
                const aosScript = document.createElement('script'); aosScript.src = "https://unpkg.com/aos@2.3.1/dist/aos.js";
                aosScript.onload = () => AOS.init({ duration: 800, once: true, offset: 50 }); document.body.appendChild(aosScript);
            }
        }

        function loadGTM() {
            if (gtmLoaded || !gtmIds) return;
            gtmLoaded = true;
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

        function loadStrictTrackers() {
            if (localStorage.getItem('da_cookie_consent') !== 'true') return;
            if (strictTrackersLoaded) return;
            strictTrackersLoaded = true;

            if (fbPixel) {
                !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
                n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
                document,'script','https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', fbPixel);
            }

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
            loadGTM();
            loadStrictTrackers();
        };

        ['scroll', 'mousemove', 'touchstart', 'click'].forEach(e => window.addEventListener(e, triggerLazyLoad, {once: true, passive: true}));
        setTimeout(triggerLazyLoad, 3500);

        window.addEventListener('da_consent_given', loadStrictTrackers);
    }

    // --- FUNÇÃO PRINCIPAL (INICIALIZA TUDO) ---
    async function initReviewsWidget() {
        // Inicializa funções globais (Roda em todas as páginas)
        initCookieConsent();
        initPerformanceManager();

        if (trackLeads) {
            initWhatsAppTracking(uuid, numeroWhats);
        }

        // --- DAQUI PARA BAIXO RODA APENAS ONDE A DIV ESTIVER (Na Home) ---
        const container = document.getElementById('data-agent-reviews-container');
        if (!container) return; // Se a div não existir, para a função aqui.

        const reviewIds = reviewsRaw.split(',').map(id => id.trim()).filter(id => id);
        if (!uuid || reviewIds.length === 0) return;

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
                
                <div class="tw:flex tw:flex-col tw:items-center tw:justify-center tw:mb-10">
                    <span class="tw:text-gray-900 tw:font-bold tw:text-xl tw:uppercase tw:tracking-wider tw:mb-2">Excelente ${mediaFormatada}</span>
                    <div class="tw:flex tw:text-yellow-400 tw:text-2xl tw:mb-2">
                        <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>
                    </div>
                    <span class="tw:text-sm tw:text-gray-500 tw:font-semibold">Com base em ${placeInfo.reviews || '...'} avaliações</span>
                    <img src="https://cdn.trustindex.io/assets/platform/Google/logo.svg" alt="Google" class="tw:h-6 tw:mt-2">
                </div>

                <div class="tw:relative tw:w-full tw:group">
                    <button aria-label="Avaliações anteriores" class="tw:absolute tw:-left-4 tw:md:-left-6 tw:top-1/2 tw:-translate-y-1/2 tw:bg-white tw:border tw:border-gray-200 tw:shadow-lg tw:rounded-full tw:w-12 tw:h-12 tw:flex tw:items-center tw:justify-center tw:text-gray-600 tw:z-10 tw:hover:bg-gray-50 tw:focus:outline-none tw:hidden tw:md:flex tw:transition-transform tw:hover:scale-105" 
                            onclick="document.getElementById('slider-${uuid}').scrollBy({left: -350, behavior: 'smooth'})">
                        <svg class="tw:w-6 tw:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                    </button>

                    <div id="slider-${uuid}" class="tw:flex tw:overflow-x-auto tw:snap-x tw:snap-mandatory tw:gap-6 data-agent-no-scrollbar tw:pb-4 tw:px-2">
            `;

            validReviews.forEach((review, index) => {
                const initial = review.author_name.charAt(0).toUpperCase();
                let avatarHtml = '';
                if (review.profile_photo_url) {
                    const fotoUrl = `${baseUrl}/avaliacoes/${review.profile_photo_url}`;
                    avatarHtml = `<img src="${fotoUrl}" alt="Foto de perfil" class="tw:w-12 tw:h-12 tw:rounded-full tw:mr-4 tw:object-cover tw:border tw:border-gray-100">`;
                } else {
                    avatarHtml = `<div class="tw:w-12 tw:h-12 tw:bg-blue-600 tw:rounded-full tw:flex tw:items-center tw:justify-center tw:text-white tw:font-bold tw:mr-4 tw:text-lg">${initial}</div>`;
                }

                const textId = `txt-${uuid}-${index}`;
                const showLerMais = review.text.length > 150;

                htmlContent += `
                    <div class="tw:bg-gray-50 tw:border tw:border-gray-100 tw:rounded-xl tw:p-6 tw:shadow-sm tw:flex-none tw:w-full tw:snap-center tw:md:w-[calc(33.333%-1rem)] tw:flex tw:flex-col tw:transition-all tw:hover:shadow-md">
                        <div class="tw:flex tw:items-center tw:mb-4">
                            ${avatarHtml}
                            <div>
                                <p class="tw:font-bold tw:text-gray-800 tw:text-sm tw:md:text-base">${review.author_name}</p>
                                <p class="tw:text-xs tw:text-gray-500">${timeAgo(review.relative_time_description)}</p>
                            </div>
                        </div>
                        <div class="tw:flex tw:text-yellow-400 tw:text-sm tw:mb-4">
                            ${generateStars(review.rating)}
                        </div>
                        
                        <div class="tw:flex-grow">
                            <p id="${textId}" class="tw:text-gray-600 tw:text-sm tw:md:text-base tw:leading-relaxed tw:line-clamp-5 tw:transition-all tw:duration-300">${review.text}</p>
                            ${showLerMais ? `
                                <button onclick="
                                    const p = document.getElementById('${textId}'); 
                                    p.classList.toggle('tw:line-clamp-5'); 
                                    this.innerText = p.classList.contains('tw:line-clamp-5') ? 'Ler mais' : 'Ocultar';
                                " class="tw:text-blue-600 tw:hover:text-blue-800 tw:text-sm tw:font-semibold tw:mt-2 tw:focus:outline-none">
                                    Ler mais
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            });

            htmlContent += `
                    </div>
                    <button aria-label="Próximas avaliações" class="tw:absolute tw:-right-4 tw:md:-right-6 tw:top-1/2 tw:-translate-y-1/2 tw:bg-white tw:border tw:border-gray-200 tw:shadow-lg tw:rounded-full tw:w-12 tw:h-12 tw:flex tw:items-center tw:justify-center tw:text-gray-600 tw:z-10 tw:hover:bg-gray-50 tw:focus:outline-none tw:hidden tw:md:flex tw:transition-transform tw:hover:scale-105" 
                            onclick="document.getElementById('slider-${uuid}').scrollBy({left: 350, behavior: 'smooth'})">
                        <svg class="tw:w-6 tw:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                    </button>
                </div>
                <div class="tw:mt-8 tw:flex tw:justify-center tw:w-full">
                    <a href="${placeInfo.google_maps_url || '#'}" target="_blank" rel="noopener noreferrer" class="tw:inline-flex tw:items-center tw:justify-center tw:px-6 tw:py-3 tw:border tw:border-gray-200 tw:rounded-full tw:text-sm tw:font-semibold tw:text-gray-700 tw:bg-white tw:hover:bg-gray-50 tw:hover:text-blue-600 tw:transition-colors tw:shadow-sm">
                        <img src="https://cdn.trustindex.io/assets/platform/Google/icon.svg" alt="Google" class="tw:w-5 tw:h-5 tw:mr-3">
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initReviewsWidget);
    } else {
        initReviewsWidget();
    }
})();