document.addEventListener('DOMContentLoaded', loadStoreCatalog);

async function loadStoreCatalog() {
    const grid = document.getElementById('catalog-grid');
    if (!grid) return;

    try {
        // Llamada a tu ruta pública en Flask
        const response = await fetch('https://sijj2003.pythonanywhere.com/api/store/catalog');
        const data = await response.json();

        if (response.ok && data.success && data.products.length > 0) {
            
            // Inyectamos las tarjetas usando el diseño premium
            grid.innerHTML = data.products.map(p => {
                
                const discount = p.discount_percentage || 0;
                const hasDiscount = discount > 0;
                const finalPrice = hasDiscount ? (p.price_usd * (1 - discount/100)).toFixed(2) : p.price_usd.toFixed(2);
                
                // Determinamos si es un producto oficial de Gymenez para pintar la etiqueta de amarillo
                const storeName = p.store_name || 'Gymenez Partner';
                const isOfficial = storeName.toLowerCase().includes('gymenez');
                const badgeColor = isOfficial ? 'text-[#FFC300]' : 'text-white';

                return `
                <div class="glass-panel p-4 rounded-2xl group cursor-pointer relative flex flex-col">
                    
                    <div class="absolute top-6 left-6 z-10 bg-black/80 backdrop-blur-md px-2 py-1 rounded border border-white/10 text-[8px] font-black uppercase tracking-widest text-gray-300">
                        Por <span class="${badgeColor}">${storeName}</span>
                    </div>
                    
                    <div class="aspect-square bg-[#050508] rounded-xl mb-4 overflow-hidden relative border border-white/5">
                        <img src="${p.image_url}" alt="${p.name}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
                        
                        ${hasDiscount ? `<span class="absolute top-2 right-2 bg-red-600 text-white text-[9px] font-black uppercase px-2 py-1 rounded shadow-lg">-${discount}%</span>` : ''}
                        
                        <button class="absolute bottom-3 right-3 bg-white/10 backdrop-blur-md border border-white/20 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 hover:bg-[#FFC300] hover:border-[#FFC300] hover:text-black">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                        </button>
                    </div>
                    
                    <div class="flex-grow">
                        <h3 class="font-bold text-sm text-gray-100 leading-tight mb-1 truncate">${p.name}</h3>
                        <p class="text-gray-500 text-[10px] uppercase tracking-wider mb-3">${p.category} • ${p.stock > 0 ? 'En Stock' : 'Agotado'}</p>
                    </div>
                    
                    <div class="flex items-center justify-between mt-auto">
                        ${hasDiscount 
                            ? `<div class="flex flex-col"><span class="text-xs text-gray-500 line-through leading-none">$${p.price_usd.toFixed(2)}</span><span class="text-[#FFC300] font-black text-lg leading-none mt-1">$${finalPrice}</span></div>` 
                            : `<p class="text-white font-black text-lg">$${finalPrice}</p>`
                        }
                    </div>
                </div>
                `;
            }).join('');
            
        } else {
            // Diseño de estado vacío (Sin productos)
            grid.innerHTML = `
                <div class="col-span-full py-20 flex flex-col items-center justify-center text-center">
                    <div class="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                        <span class="text-3xl">🛒</span>
                    </div>
                    <h3 class="text-xl font-[900] tracking-tighter uppercase italic text-white mb-2">Vitrina Vacía</h3>
                    <p class="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Nuestros partners están surtiendo la tienda.</p>
                </div>
            `;
        }
    } catch (error) {
        grid.innerHTML = '<div class="col-span-full text-center py-12"><p class="text-red-500 text-xs font-bold uppercase tracking-widest">Error al conectar con el servidor.</p></div>';
    }
}
