import puppeteer from 'puppeteer'
import fs from 'fs/promises'
import { join } from 'path'
import { buscarEnCategories } from "./modules/buscarEnCategories.js"

const gotoPage = 'https://www.mercadolibre.com.ar/categorias'
const filePath = '/app/src/json_test/'

async function extraerTodosLosProductos() {
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

    let todosLosProductos = []

    try {
        // PASO 1: Obtener todas las categorías
        console.log('Extrayendo categorías...')
        const categorias = await buscarEnCategories(page)
        await new Promise(resolve => setTimeout(resolve, 2000))
        console.log(`Categorías encontradas: ${categorias.length}`)


        // PASO 2: Extraer productos de cada categoría
        for (const categoria of categorias) {

            todosLosProductos.push(categoria)

            // console.log(categoria)

            const productosCategoria = await extraerProductosDeCategoria(page, categoria.url)
            
            todosLosProductos.push({
                categoria: categoria.nombre,
                productos: productosCategoria,
                total: productosCategoria.length
            })
            await new Promise(resolve => setTimeout(resolve, 2000))
        }

        // PASO 3: Guardar todos los productos
        await guardarProductos(todosLosProductos)
        
    } catch (error) {
        console.error('Error:', error)
    } finally {
        await browser.close()
    }
}

async function extraerCategorias(page) {
    await page.goto(gotoPage, {
        waitUntil: 'networkidle2'
    })

    return await page.evaluate(() => {
        const enlaces = document.querySelectorAll('.categories__container a[href*="/c/"]')
        return Array.from(enlaces).map(link => ({
            nombre: link.textContent.trim(),
            url: link.href,
            categoria: link.href.split('/c/')[1]?.split('/')[0]
        }))
    })
}

async function extraerProductosDeCategoria(page, urlCategoria) {
    const productos = []
    let paginaActual = 1
    const maxPaginas = 100 // Límite para evitar bucles infinitos

    while (paginaActual <= maxPaginas) {
        console.log(`  Página ${paginaActual}...`)
        
        const urlPagina = `${urlCategoria}?offset=${(paginaActual - 1) * 48}`
        
        try {
            await page.goto(urlPagina, { waitUntil: 'networkidle2' })
            
            const productosEnPagina = await page.evaluate(() => {
                const items = document.querySelectorAll('.ui-search-result')
                
                return Array.from(items).map(item => {
                    const titulo = item.querySelector('.ui-search-item__title')?.textContent?.trim()
                    const precio = item.querySelector('.price-tag-fraction')?.textContent?.trim()
                    const enlace = item.querySelector('.ui-search-item__group__element a')?.href
                    const imagen = item.querySelector('.ui-search-result-image__element')?.src
                    const vendedor = item.querySelector('.ui-search-official-store-label')?.textContent?.trim()
                    
                    return {
                        titulo,
                        precio: precio ? `$${precio}` : 'Sin precio',
                        url: enlace,
                        imagen,
                        vendedor: vendedor || 'Vendedor particular',
                        fechaExtraccion: new Date().toISOString()
                    }
                }).filter(producto => producto.titulo && producto.url)
            })

            if (productosEnPagina.length === 0) {
                console.log('  No hay más productos, finalizando categoría')
                break
            }

            productos.push(...productosEnPagina)
            console.log(`  Productos extraídos: ${productosEnPagina.length}`)
            
            paginaActual++
            
            // Delay entre páginas
            await new Promise(resolve => setTimeout(resolve, 1500))
            
        } catch (error) {
            console.error(`Error en página ${paginaActual}:`, error.message)
            break
        }
    }

    return productos
}

async function guardarProductos(todosLosProductos) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const nombreArchivo = `meli_extract_products_${timestamp}.json`
    
    const resumen = {
        fechaExtraccion: new Date().toISOString(),
        totalCategorias: todosLosProductos.length,
        totalProductos: todosLosProductos.reduce((sum, cat) => sum + cat.total, 0),
        fuente: 'MercadoLibre Argentina',
        categorias: todosLosProductos
    }

    await fs.writeFile(join(filePath, nombreArchivo), JSON.stringify(resumen, null, 2))
    console.log(`Productos guardados en: ${nombreArchivo}`)
    console.log(`Total productos extraídos: ${resumen.totalProductos}`)
}

// Ejecutar el script
extraerTodosLosProductos()