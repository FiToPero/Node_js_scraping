import puppeteer from "puppeteer"


export async function buscarEnCategories(page) {
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
                            className: link.className,
                            url: link.href,
                        }))
                    }
                })
                // Mostrar todos los títulos de categorías principales
                elementCat.categories__title.forEach(categoria => {
                    console.log(`Categoría principal: ${categoria.title_category}`)
                })
                result.push(elementCat)
            }       
        } catch(error){ console.log(`Error con selector ${selector}: ${error.message}`) }
    }
    return result
}