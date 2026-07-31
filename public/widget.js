(function () {
    const currentScript = document.currentScript;
    if (!currentScript) {
        console.error("Data Agent: Não foi possível determinar a origem do script.");
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

    async function initReviewsWidget() {
        const containers = document.querySelectorAll('.data-agent-widget');

        for (const container of containers) {
            const uuid = container.getAttribute('data-uuid');
            // Pega a string de IDs, remove espaços e transforma num Array
            const reviewsRaw = container.getAttribute('data-reviews') || "";
            const reviewIds = reviewsRaw.split(',').map(id => id.trim()).filter(id => id);

            if (!uuid || reviewIds.length === 0) continue;

            container.innerHTML = '<p style="text-align:center;">Carregando avaliações...</p>';

            try {
                const baseUrl = `${API_BASE_URL}/clientes/${uuid}/google_reviews`;

                // 1. Baixa o Header E os Micro-JSONs ao MESMO TEMPO (Performance extrema!)
                const headerPromise = fetch(`${baseUrl}/header.json`).then(r => r.json());

                const reviewPromises = reviewIds.map(id =>
                    fetch(`${baseUrl}/avaliacoes/${id}.json`)
                        .then(r => r.ok ? r.json() : null) // Se der erro num ID, retorna null
                );

                // Aguarda todos os downloads terminarem
                const [placeInfo, ...reviewsData] = await Promise.all([headerPromise, ...reviewPromises]);

                // Remove avaliações que por ventura deram erro 404 (ID digitado errado)
                const validReviews = reviewsData.filter(r => r !== null);

                // 2. Monta o HTML (Cabeçalho dinâmico)
                const mediaFormatada = String(placeInfo.rating || '5,0').replace('.', ',');
                let htmlContent = `
                <div class="flex flex-col items-center justify-center mb-8">
                    <span class="text-gray-900 font-bold text-xl uppercase tracking-wider mb-2">Excelente ${mediaFormatada}</span>
                    <div class="flex text-yellow-400 text-2xl mb-2">
                        <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>
                    </div>
                    <span class="text-sm text-gray-500 font-semibold">Com base em ${placeInfo.reviews || '...'} avaliações</span>
                    <img src="https://cdn.trustindex.io/assets/platform/Google/logo.svg" alt="Google" class="h-6 mt-2">
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            `;

                // 3. Monta os Cards selecionados
                validReviews.forEach(review => {
                    const initial = review.author_name.charAt(0).toUpperCase();
                    let avatarHtml = '';
                    if (review.profile_photo_url) {
                        const fotoUrl = `${baseUrl}/avaliacoes/${review.profile_photo_url}`;
                        avatarHtml = `<img src="${fotoUrl}" class="w-10 h-10 rounded-full mr-3 object-cover">`;
                    } else {
                        avatarHtml = `<div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mr-3">${initial}</div>`;
                    }

                    htmlContent += `
                    <div class="bg-gray-50 border border-gray-100 rounded p-6 shadow-sm">
                        <div class="flex items-center mb-4">
                            ${avatarHtml}
                            <div>
                                <p class="font-bold text-gray-800 text-sm">${review.author_name}</p>
                                <p class="text-xs text-gray-500">${review.relative_time_description}</p>
                            </div>
                        </div>
                        <div class="flex text-yellow-400 text-sm mb-3">${generateStars(review.rating)}</div>
                        <p class="text-gray-600 text-sm leading-relaxed">${review.text}</p>
                    </div>
                `;
                });

                htmlContent += `</div>`;
                container.innerHTML = htmlContent;

            } catch (error) {
                console.error("Data Agent Erro:", error);
                container.innerHTML = '<p style="color:#ef4444;">Não foi possível carregar as avaliações.</p>';
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initReviewsWidget);
    } else {
        initReviewsWidget();
    }
})();