import puppeteer from "puppeteer"
import fs from "fs/promises"
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function handleDynamicWebPage() {
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: '/usr/bin/google-chrome',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--disable-gpu',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            //  Configuraciones adicionales anti-detección
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--window-size=1366,768',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
        slowMo: 100, // Reducir velocidad
    })
    
    const page = await browser.newPage()

    //  Configuraciones adicionales de la página
    await page.setViewport({ width: 1366, height: 768 })
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    
    //  Configurar headers adicionales
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    })

    console.log(" Intentando acceder a MercadoLibre con configuración mejorada...")
    
    try {
        await page.goto('https://www.mercadolibre.com.ar', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        })
        console.log(" Página cargada correctamente")
    } catch (error) {
        console.log(" Error cargando página:", error.message)
        console.log(" Intentando con mercadolibre.com...")
        await page.goto('https://www.mercadolibre.com', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        })
    }

    //  Esperar a que la página se estabilice completamente
    console.log(" Esperando a que la página se estabilice...")
    await new Promise(resolve => setTimeout(resolve, 3000))


    //  Primero verificar que la página cargó correctamente
    const currentUrl = await page.url()
    const title = await page.title()
    console.log(` URL actual: ${currentUrl}`)
    console.log(` Título: ${title}`)

    // Si la URL contiene "mercadolibre", procedemos
    if (currentUrl.includes('mercadolibre')) {
        console.log(" Acceso exitoso a MercadoLibre, extrayendo enlaces...")
        
        // Método más simple: buscar enlaces directamente
        const categoryLinks = await page.$$eval('a', links => {
            return links
                .filter(link => 
                    link.href.includes('/c/') || 
                    link.textContent.toLowerCase().includes('categoria') ||
                    link.textContent.toLowerCase().includes('hogar') ||
                    link.textContent.toLowerCase().includes('muebles') ||
                    link.textContent.toLowerCase().includes('tecnología') ||
                    link.textContent.toLowerCase().includes('deportes')
                )
                .slice(0, 10) // Solo los primeros 10
                .map(link => ({
                    title: link.textContent.trim(),
                    url: link.href
                }))
        })
        
        console.log(` Enlaces de categorías encontrados: ${categoryLinks.length}`)
        console.log(categoryLinks)
        
        //  Extraer subcategorías de cada categoría
        console.log(" Extrayendo subcategorías de cada categoría...")
        
        const categoriasConSubcategorias = []
        
        for (let i = 0; i < categoryLinks.length; i++) {
            const categoria = categoryLinks[i]
            console.log(`\n ${i + 1}/${categoryLinks.length} - Procesando: ${categoria.title}`)
            
            try {
                // Solo procesar URLs que parecen ser categorías válidas (contienen /c/)
                if (!categoria.url.includes('/c/')) {
                    console.log(` Saltando ${categoria.title} - No es una categoría válida`)
                    categoriasConSubcategorias.push({
                        ...categoria,
                        subcategorias: [],
                        total_subcategorias: 0
                    })
                    continue
                }
                
                // Navegar a la categoría
                await page.goto(categoria.url, { waitUntil: 'networkidle2', timeout: 15000 })
                await new Promise(resolve => setTimeout(resolve, 3000)) // Esperar más tiempo
                
                // Extraer subcategorías con múltiples estrategias
                const subcategorias = await page.evaluate(() => {
                    // Estrategia 1: Buscar en la estructura de categorías de MercadoLibre
                    let subcats = []
                    
                    // Selectores específicos para subcategorías de MercadoLibre
                    const selectors = [
                        '.nav-categories a', // Navegación de categorías
                        '.categories-list a', // Lista de categorías  
                        '.ui-search-breadcrumb a', // Breadcrumb
                        '.category-grid a', // Grid de categorías
                        '[data-testid*="category"] a', // Enlaces con data-testid de categoría
                        '.andes-list a', // Lista Andes (sistema de diseño de ML)
                        'ul li a', // Enlaces en listas
                        '.nav-menu a' // Menú de navegación
                    ]
                    
                    for (const selector of selectors) {
                        try {
                            const elements = document.querySelectorAll(selector)
                            const found = Array.from(elements)
                                .filter(link => {
                                    const text = link.textContent.trim()
                                    const href = link.href
                                    
                                    return (
                                        href.includes('/c/') && 
                                        text.length > 2 &&
                                        text.length < 60 && 
                                        !href.includes('#') &&
                                        !text.toLowerCase().includes('mercado') &&
                                        !text.toLowerCase().includes('libre') &&
                                        !text.toLowerCase().includes('buscar') &&
                                        !text.toLowerCase().includes('ingresar') &&
                                        !text.toLowerCase().includes('registr') &&
                                        !text.toLowerCase().includes('ayuda')
                                    )
                                })
                                .map(link => ({
                                    title: link.textContent.trim(),
                                    url: link.href,
                                    selector: selector
                                }))
                            
                            subcats = subcats.concat(found)
                        } catch (e) {
                            // Continuar con el siguiente selector
                        }
                    }
                    
                    // Eliminar duplicados y limitar
                    const uniqueSubcats = subcats
                        .filter((subcat, index, array) => 
                            array.findIndex(item => item.url === subcat.url) === index
                        )
                        .filter((subcat, index, array) => 
                            array.findIndex(item => item.title === subcat.title) === index
                        )
                        .slice(0, 12)
                    
                    return uniqueSubcats
                })
                
                console.log(`   └── ${subcategorias.length} subcategorías encontradas`)
                
                categoriasConSubcategorias.push({
                    ...categoria,
                    subcategorias: subcategorias,
                    total_subcategorias: subcategorias.length
                })
                
            } catch (error) {
                console.log(`    Error procesando ${categoria.title}: ${error.message}`)
                categoriasConSubcategorias.push({
                    ...categoria,
                    subcategorias: [],
                    total_subcategorias: 0,
                    error: error.message
                })
            }
        }
        
        //  Guardar en archivo JSON con subcategorías
        try {
            const jsonData = {
                timestamp: new Date().toISOString(),
                source: "MercadoLibre Argentina",
                url: currentUrl,
                total_categorias: categoriasConSubcategorias.length,
                total_subcategorias: categoriasConSubcategorias.reduce((sum, cat) => sum + cat.total_subcategorias, 0),
                categorias: categoriasConSubcategorias
            }
            
            const filePath = join(__dirname, 'meli_categorias.json')
            await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2))
            
            console.log("\n Archivo meli_categorias.json actualizado exitosamente")
            console.log(` Ruta completa: ${filePath}`)
            console.log(` Total de categorías: ${categoriasConSubcategorias.length}`)
            console.log(` Total de subcategorías: ${categoriasConSubcategorias.reduce((sum, cat) => sum + cat.total_subcategorias, 0)}`)
        } catch (error) {
            console.error(" Error al guardar archivo JSON:", error)
        }
        
    } else {
        console.log(" No se pudo acceder correctamente a MercadoLibre")
        console.log(`URL actual: ${currentUrl}`)
    }




  




    await browser.close()
    console.log(" Browser cerrado correctamente")
}

handleDynamicWebPage().then(() => {
    console.log(" Navegación completada")
}).catch((error) => {
    console.error(" Error durante la navegación:", error)
})