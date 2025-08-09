import puppeteer from "puppeteer"
import fs from "fs/promises"
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Obtener ruta actual en ES Modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log(import.meta.url)
console.log("Ruta actual:", __filename)
console.log(__dirname)

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
            '--disable-ipc-flooding-protection'
        ],
        slowMo: 400,
    })


    const page = await browser.newPage()

    await page.goto("https://quotes.toscrape.com")

    //   await page.waitForSelector('div[data-loaded="true"]'); // Asegúrate de reemplazar esto con el selector de CSS correcto.
    const result = await page.evaluate(() => {

        const quotes = document.querySelectorAll(".quote")

        const data = [...quotes].map((quote) => {
            const quoteText = quote.querySelector(".text").innerText
            const author = quote.querySelector(".author").innerText
            const tags = [...quote.querySelectorAll(".tag")].map(
                (tag) => tag.innerText
            )
            return {
                quoteText,
                author,
                tags,
            }
        })
        return data
    })

    console.log(result)

    try {
        const jsonData = JSON.stringify(result, null, 2)
        const filePath = join(__dirname, 'quotes.json')
        await fs.writeFile(filePath, jsonData)
        console.log("✅ Archivo quotes.json creado exitosamente")
        console.log("📁 Ruta completa:", filePath)
    } catch (error) {
        console.error("❌ Error al escribir archivo:", error)
    }

    await browser.close()

}

// Ejecutar con manejo de errores global
handleDynamicWebPage()
    .then(() => {
        console.log("🎉 Proceso completado exitosamente")
    })
    .catch((error) => {
        console.error("💥 Error general:", error)
        process.exit(1)
    })
