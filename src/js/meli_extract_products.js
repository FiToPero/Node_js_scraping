import puppeteer from 'puppeteer'
import fs from 'fs/promises'
import { join } from 'path'
import { searchCategoriesAndSubcategories } from "./modules/searchCategoriesAndSubcategories.js"

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
        const categories = await searchCategoriesAndSubcategories(page)
        await new Promise(resolve => setTimeout(resolve, 2000))
        console.log(`Categorías encontradas: ${categories.length}`)  //// 3

        // PASO 2: Extraer productos de cada categoría
        for (const category of categories) {
            console.log(category.category[0].title_category)  // Nombre de la categoría principal
            for (const item of category.category[0].sub_category) {
                console.log(`  Procesando Sub_categoría: ${item.title_item} --- (${item.url})`)

                const productosSubCategoria = await extraerProductosDeCategoria(page, item.url)

                todosLosProductos.push({
                    categoria: category[0],
                    sub_categoria: item.title_item,
                    productos: productosSubCategoria,
                    total: productosSubCategoria.length
                })
            }
break /////////////
            
            await new Promise(resolve => setTimeout(resolve, 2000))
        }

        console.log(`Total productos extraídos: ${todosLosProductos.length}`)
        // PASO 3: Guardar todos los productos
        await guardarProductos(todosLosProductos)
        
    } catch (error) {
        console.error('Error:', error)
    } finally {
        await browser.close()
    }
}

async function extraerProductosDeCategoria(page, urlCategoria) {
    const products = []
    const contador = 0
    const selector = 'a.poly-component__title' 

    console.log(`  extrayendo productos de la página ${urlCategoria}...`)  /////// 4

    try {
        await page.goto(urlCategoria, { waitUntil: 'networkidle2' })

        const productsInPage = await page.$$(selector)
        
        for(const product of productsInPage) {
            if(contador == 20){break}
            contador++
            console.log(`  Extrayendo producto...`)  /////// 5
            try{
                const productInfo = await product.evaluate(el => {
                    return {
                        tagName: el.tagName,
                        textContent: el.textContent,
                        href: el.href,
                        className: el.className,
                        innerHTML: el.innerHTML      //.substring(0, 200)  // Solo primeros 200 chars
                    }
                })
                products.push(productInfo)
                console.log(`Producto extraído: ${productInfo.textContent} (${productInfo.href})`)
            }catch(error){
                console.log(`Error extrayendo producto: ${error.message}`)
            }
        }

        await new Promise(resolve => setTimeout(resolve, 1500))
        
    } catch (error) {
        console.error(`Error en página:`, error.message)
    }
    

    return products
}

async function guardarProductos(todosLosProductos) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const nombreArchivo = `meli_extract_products_${timestamp}.json`
    
    const resumen = {
        fechaExtraccion: new Date().toISOString(),
        totalCategorias: todosLosProductos.length,
        totalProductos: todosLosProductos.reduce((sum, cat) => sum + cat.total, 0),
        fuente: 'MercadoLibre Argentina',
        categories: todosLosProductos
    }

    await fs.writeFile(join(filePath, nombreArchivo), JSON.stringify(resumen, null, 2))
    console.log(`Productos guardados en: ${nombreArchivo}`)
    console.log(`Total productos extraídos: ${resumen.totalProductos}`)
}

// Ejecutar el script
extraerTodosLosProductos()