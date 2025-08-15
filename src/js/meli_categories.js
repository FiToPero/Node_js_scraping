import puppeteer from "puppeteer"
import fs from "fs/promises"

const gotoPage = 'https://www.mercadolibre.com.ar/categorias#menu=categories'
const filePath = '/app/src/json_test/meli_categories_results.json'

async function extractCategoriesWithHover() {
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
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--window-size=1366,768',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
        slowMo: 100,
    })
    
    const page = await browser.newPage()
    
    // Configurar headers adicionales
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    })

    console.log("Intentando acceder a MercadoLibre...")  ///// 1
    
    try {
        await page.goto(gotoPage, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        })
        console.log("Página cargada correctamente")  /////// 2
    } catch (error) {
        console.log("Error cargando página:", error.message) ///// 2
        await browser.close()
        return
    }

    // Esperar a que la página se estabilice
    console.log("Esperando estabilización...") 
    await new Promise(resolve => setTimeout(resolve, 3000))

    const currentUrl = await page.url()
    console.log(`URL actual: ${currentUrl}`)

    if (currentUrl.includes('mercadolibre')) {
        console.log("Acceso exitoso, iniciando extracción...")

        const categoriasDesdeCategorias = await buscarEnCategorias(page)  ///////

        // Combinar resultados
        const resultadoFinal = {
            timestamp: new Date().toISOString(),
            source: "MercadoLibre Argentina",
            url: currentUrl,
            metodos: {
                categorias: categoriasDesdeCategorias
            },
        }
        // Guardar resultados en Json
        await fs.writeFile(filePath, JSON.stringify(resultadoFinal, null, 2))

        console.log("Resultados guardados en meli_categories_results.json")
        console.log(`Total de elementos extraídos: ${resultadoFinal.metodos.categorias.length}`) 

    } else {
        console.log("No se pudo acceder correctamente a MercadoLibre")
    }

    await browser.close()
    console.log("Browser cerrado correctamente END")
}



async function buscarEnCategorias(page) {
    console.log("\n Categorías...")
    const result = []
    const selectors = [
        '.categories__container'
    ]

    for(const selector of selectors){
        try {
            const elements = await page.$$(selector)
            console.log(`Encontrados ${elements.length} elementos con selector: ${selector}`) /////
            for(const element of elements){
                const elementCat = await element.evaluate(el => {
                    const categories__title = el.querySelectorAll('h2.categories__title a')
                    const categories__item = el.querySelectorAll('li.categories__item a')
                    return {
                        tagName: el.tagName,
                        className: el.className,
                        categories__title: Array.from(categories__title).map(link => ({
                            title_category: link.textContent.trim(),
                            url: link.href,                        
                        })),
                        categories__item: Array.from(categories__item).map(link => ({
                            title_item: link.textContent.trim(),
                            url: link.href,
                        }))
                    }
                })
                console.log(`Elemento encontrado: ${elementCat.className}`) /////
                result.push(elementCat)
            }       
        } catch(error){ console.log(`Error con selector ${selector}: ${error.message}`) }
    }
    return result
}


// Ejecutar el script
extractCategoriesWithHover().then(() => {
    console.log("Extracción completada")
}).catch((error) => {
    console.error("Error durante la extracción:", error)
})
