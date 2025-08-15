import fetch from 'node-fetch'

async function extraerConAPI() {
    const baseURL = 'https://api.mercadolibre.com'
    
    // Obtener categorías
    const categoriasResponse = await fetch(`${baseURL}/sites/MLA/categories`)
    const categorias = await categoriasResponse.json()
    
    const todosLosProductos = []
    
    for (const categoria of categorias) {
        console.log(`Procesando: ${categoria.name}`)
        
        // Buscar productos en cada categoría
        const productosResponse = await fetch(
            `${baseURL}/sites/MLA/search?category=${categoria.id}&limit=200`
        )
        const { results } = await productosResponse.json()
        
        todosLosProductos.push({
            categoria: categoria.name,
            productos: results.map(producto => ({
                id: producto.id,
                titulo: producto.title,
                precio: producto.price,
                moneda: producto.currency_id,
                condicion: producto.condition,
                vendedor: producto.seller.nickname,
                permalink: producto.permalink,
                thumbnail: producto.thumbnail
            }))
        })
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    return todosLosProductos
}