import puppeteer from "puppeteer"
import fs from "fs/promises"
import { fileURLToPath } from "url"
import { dirname, join } from "path"
import { text } from "stream/consumers"
import { title } from "process"

// const __filename = fileURLToPath(import.meta.url)
// const __dirname = dirname(__filename)

const gotoPage = 'https://www.mercadolibre.com.ar/categorias#menu=categories' //'https://www.mercadolibre.com.ar'
const filePath = '/app/src/json_test/meli_hover_results.json'

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
    console.log("Esperando estabilización...")  ///// 3
    await new Promise(resolve => setTimeout(resolve, 3000))

    const currentUrl = await page.url()
    console.log(`URL actual: ${currentUrl}`) ///// 4

    if (currentUrl.includes('mercadolibre')) {
        console.log("Acceso exitoso, iniciando extracción con hover...")  ////// 5
        
        // MÉTODO 1: Hover directo en elementos de navegación
        //const categoriasConHover = await extractWithDirectHover(page)
        
        // MÉTODO 2: Forzar visibilidad de elementos ocultos
        //const categoriasForzadas = await extractWithForcedVisibility(page)
        
        // MÉTODO 3: Interceptar eventos de mouse
        //const categoriasConEventos = await extractWithMouseEvents(page)

        // MÉTODO 4: Forzar hover en elementos ocultos
        // const categoriasForzadasHover = await forceHover(page)

        // MÉTODO 5: Buscar en CATEGORIAS -> https://www.mercadolibre.com.ar/categorias#menu=categories
        const categoriasDesdeCategorias = await buscarEnCategorias(page)

        // Combinar resultados
        const resultadoFinal = {
            timestamp: new Date().toISOString(),
            source: "MercadoLibre Argentina",
            url: currentUrl,
            metodos: {
                // hover_directo: categoriasConHover,
                // visibilidad_forzada: categoriasForzadas,
                // eventos_mouse: categoriasConEventos,
                // force_hover: categoriasForzadasHover,
                desde_categorias: categoriasDesdeCategorias
            },
        }
        
        // Guardar resultados
        await fs.writeFile(filePath, JSON.stringify(resultadoFinal, null, 2))

        console.log("Resultados guardados en meli_hover_results.json")
        console.log(`Total de elementos extraídos: ${resultadoFinal.metodos.desde_categorias.length}`)  //// change metodos

    } else {
        console.log("No se pudo acceder correctamente a MercadoLibre")  ///// 5
    }

    await browser.close()
    console.log("Browser cerrado correctamente END") ///////  6
}

// MÉTODO 1: Hover directo en elementos de navegación
async function extractWithDirectHover(page) {
    console.log("\n  MÉTODO 1: Hover directo...")
    
    const resultados = []
    
    // Selectores comunes para menús de categorías
    const menuSelectors = [
        '.nav-menu-categories-item',     // MercadoLibre específico
        '.nav-categs-departments__item', // Departamentos
        '.nav-menu-item',                // Items de navegación
        '.category-item',                // Items de categoría
        '[data-js="navigation-menu"] li', // Menú de navegación
        'nav ul li',                     // Navegación general
        '.dropdown-toggle',              // Dropdowns
        '.menu-item',                     // Items de menú
        'nav-categs-departments__list nav-categs-departments__list--dynamic'
    ]
    
    for (const selector of menuSelectors) {
        try {
            const elements = await page.$$(selector)
            console.log(`  Encontrados ${elements.length} elementos con: ${selector}`)
            
            // Probar hover en los primeros 3 elementos
            for (let i = 0; i < Math.min(3, elements.length); i++) {
                const element = elements[i]
                
                try {
                    // Obtener texto del elemento principal
                    const mainText = await element.evaluate(el => el.textContent.trim())
                    console.log(`    Hover en: "${mainText}"`)
                    
                    // Hacer hover
                    await element.hover()
                    await new Promise(resolve => setTimeout(resolve, 1500)) // Espera para que aparezca submenu
                    
                    // Buscar subcategorías que aparecen
                    const subcategorias = await page.evaluate(() => {
                        const visibleElements = document.querySelectorAll(
                            '.submenu:not([style*="display: none"]) a, ' +
                            '.dropdown-menu:not([style*="display: none"]) a, ' +
                            '.nav-submenu a, ' +
                            '.hover-menu a, ' +
                            '.is-visible a, ' +
                            '[style*="block"] a, ' +
                            '.menu-open a'
                        )
                        
                        return Array.from(visibleElements)
                            .filter(link => 
                                link.href && 
                                (link.href.includes('/c/') || link.href.includes('/categoria')) &&
                                link.textContent.trim().length > 2
                            )
                            .slice(0, 10)
                            .map(link => ({
                                title: link.textContent.trim(),
                                url: link.href
                            }))
                    })
                    
                    if (subcategorias.length > 0) {
                        console.log(`    ${subcategorias.length} subcategorías encontradas`)
                        resultados.push({
                            categoria_principal: mainText,
                            selector_usado: selector,
                            subcategorias: subcategorias,
                            total_subcategorias: subcategorias.length
                        })
                    } else {
                        console.log(`No se encontraron subcategorías`)
                    }
                    
                    // Mover mouse fuera para cerrar menú
                    await page.mouse.move(0, 0)
                    await new Promise(resolve => setTimeout(resolve, 500))
                    
                } catch (elementError) {
                    console.log(`Error en elemento ${i}: ${elementError.message}`)
                }
            }
            
            if (resultados.length > 0) break // Si encontramos resultados, salir
            
        } catch (selectorError) {
            console.log(`Error con selector ${selector}: ${selectorError.message}`)
        }
    }
    
    return resultados
}

// 🔍 MÉTODO 2: Forzar visibilidad de elementos ocultos
async function extractWithForcedVisibility(page) {
    console.log("\n  MÉTODO 2: Forzar visibilidad...")
    
    const resultados = await page.evaluate(() => {
        // Forzar visibilidad de todos los elementos de menú
        const hiddenElements = document.querySelectorAll('[style*="display: none"], .hidden, [hidden]')
        hiddenElements.forEach(el => {
            el.style.display = 'block'
            el.style.visibility = 'visible'
            el.style.opacity = '1'
            el.classList.remove('hidden')
            el.removeAttribute('hidden')
        })
        
        // Buscar todos los enlaces de categorías ahora visibles
        const allLinks = document.querySelectorAll('a')
        const categoryLinks = Array.from(allLinks)
            .filter(link => 
                link.href && 
                (link.href.includes('/c/') || 
                 link.href.includes('/categoria') ||
                 link.textContent.toLowerCase().includes('categoria') ||
                 link.textContent.toLowerCase().includes('departamento'))
            )
            .slice(0, 20)
            .map(link => ({
                title: link.textContent.trim(),
                url: link.href,
                parent_text: link.closest('li') ? link.closest('li').textContent.trim() : ''
            }))
        
        return categoryLinks
    })
    
    console.log(` ${resultados.length} enlaces encontrados forzando visibilidad`)
    return resultados
}

// 🎮 MÉTODO 3: Interceptar eventos de mouse
async function extractWithMouseEvents(page) {
    console.log("\n MÉTODO 3: Eventos de mouse...")
    
    // Interceptar eventos de mouse para detectar elementos interactivos
    await page.evaluateOnNewDocument(() => {
        window.hoverElements = []
        
        document.addEventListener('mouseover', (event) => {
            const element = event.target
            if (element.tagName === 'LI' || element.classList.contains('menu-item')) {
                window.hoverElements.push({
                    tagName: element.tagName,
                    className: element.className,
                    textContent: element.textContent.trim(),
                    hasChildren: element.children.length > 0
                })
            }
        })
    })
    
    // Simular movimiento de mouse por toda la página
    const viewportSize = await page.viewport()
    const steps = 10
    
    for (let x = 0; x < viewportSize.width; x += viewportSize.width / steps) {
        for (let y = 0; y < viewportSize.height; y += viewportSize.height / steps) {
            await page.mouse.move(x, y)
            await new Promise(resolve => setTimeout(resolve, 100))
        }
    }
    
    // Obtener elementos que respondieron a hover
    const hoverResults = await page.evaluate(() => {
        return window.hoverElements || []
    })
    
    console.log(` ${hoverResults.length} elementos detectaron hover`)
    return hoverResults
}

//  MÉTODO 4: forzar hover
async function forceHover(page) {
    console.log("\n MÉTODO 4: Forzar hover...")
    
    const result = []
    
    // Selectores correctos para elementos con múltiples clases
    const selectors = [
        '.nav-categs-departments__list.nav-categs-departments__list--dynamic', // Ambas clases en mismo elemento
        '.nav-categs-departments__list',  // Solo la primera clase
        'li[class*="nav-categs-departments__list"]', // Cualquier li que contenga esta clase
        'li.nav-categs-departments__list' // li específico con clase
    ]
    
    for (const selector of selectors) {
        try {
            const elements = await page.$$(selector)
            console.log(`Encontrados ${elements.length} elementos con selector: ${selector}`)
            
            if (elements.length > 0) {
                for (const element of elements) {
                    try {
                        // Obtener información del elemento incluso si está oculto
                        const elementInfo = await element.evaluate(el => {
                            const computedStyle = window.getComputedStyle(el)
                            return {
                                tagName: el.tagName,
                                className: el.className,
                                textContent: el.textContent.trim().substring(0, 50),
                                isVisible: computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden',
                                display: computedStyle.display,
                                visibility: computedStyle.visibility,
                                hasChildren: el.children
                            }
                        })
                        console.log(`Elemento encontrado: ${elementInfo.textContent}`)
                        console.log(`Display: ${elementInfo.display}, Visible: ${elementInfo.isVisible}`)
                        
                        // Si está oculto, forzar visibilidad temporalmente
                        if (!elementInfo.isVisible) {
                            await element.evaluate(el => {
                                el.style.display = 'block'
                                el.style.visibility = 'visible'
                                el.style.opacity = '1'
                            })
                            console.log(`Elemento forzado a visible`)
                        }
                        result.push({ elemento: elementInfo, selector_usado: selector })
                    } catch(error){ console.log(`Error procesando elemento: ${error.message}`) }
                }
            }
        } catch(error){ console.log(`Error con selector ${selector}: ${error.message}`) }
    }
    console.log(`Total elementos procesados: ${result.length}`)
    return result
}

async function buscarEnCategorias(page) {
    console.log("\n MÉTODO 5: En Categorías...") ///////
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
