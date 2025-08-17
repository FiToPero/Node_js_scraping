import puppeteer from "puppeteer"


export async function searchCategoriesAndSubcategories(page) {
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
                        category: Array.from(categories__title).map(link => ({
                            title_category: link.textContent.trim(),
                            url: link.href,                        
                            sub_category: Array.from(categories__item).map(link => ({
                                tagName: link.tagName,
                                className: link.className,
                                title_item: link.textContent.trim(),
                                url: link.href,
                            }))
                        }))
                    }
                })
                // Mostrar todos los títulos de categorías principales y sus subcategorías
                elementCat.category.forEach(cat => {
                    console.log(`Categoría: ${cat.title_category}`)
                    cat.sub_category.forEach(sub => {
                        console.log(`  Subcategoría: ${sub.title_item}`)
                    })
                })

                result.push(elementCat)
            }       
        } catch(error){ console.log(`Error con selector ${selector}: ${error.message}`) }
    }
    return result
}