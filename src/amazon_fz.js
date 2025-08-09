import puppeteer from "puppeteer"
import xlsx from "xlsx"


const URL =
  "https://www.amazon.com/s?k=programmer+socks&crid=2GGN7SIBWWR17&sprefix=programmer+socks%2Caps%2C161&ref=nb_sb_ss_pltr-xclick_1_16";
const proxyURL = 'gw.dataimpulse.com:823'
const username = ''
const password = ''

async function handleDynamicWebPage() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome',
    args: [
      // `--proxy-server=${proxyURL}`, 
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
  });

  const page = await browser.newPage();

  // Configurar User-Agent realista
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  // Configurar viewport
  // await page.setViewport({ width: 1366, height: 768 });

 
  // await page.authenticate({
  //   username,
  //   password,
  // })

  console.log("🌐 Accediendo a Amazon directamente (sin proxy)...");
  await page.goto(URL, { waitUntil: "networkidle2" });

  const title = await page.title();
  console.log(`Titulo de la pagina: ${title}`);

  let products = [];
  let nextPage = true

  while (nextPage) {
    console.log("🔍 Buscando productos en la página...");

    const newProducts = await page.evaluate(() => {
      // Intentar diferentes selectores para productos de Amazon
      let productElements = document.querySelectorAll(".puis-card-container.s-card-container");
      
      if (productElements.length === 0) {
        productElements = document.querySelectorAll("[data-component-type='s-search-result']");
      }
      
      if (productElements.length === 0) {
        productElements = document.querySelectorAll(".s-result-item");
      }
      
      if (productElements.length === 0) {
        productElements = document.querySelectorAll(".sg-col-inner");
      }

      console.log(`Productos encontrados: ${productElements.length}`);
      
      if (productElements.length === 0) {
        // Debug: mostrar algunos selectores que SÍ existen en la página
        const allDivs = document.querySelectorAll('div');
        console.log(`Total divs en la página: ${allDivs.length}`);
        
        // Buscar elementos que contengan texto relacionado con productos
        const textElements = Array.from(document.querySelectorAll('*')).filter(el => 
          el.textContent && el.textContent.toLowerCase().includes('sock')
        );
        console.log(`Elementos que contienen 'sock': ${textElements.length}`);
        
        return [];
      }

      const products = Array.from(productElements);

      return products.map((product, index) => {
        try {
          // Intentar múltiples selectores para el título
          let title = product.querySelector(".a-text-normal")?.innerText ||
                     product.querySelector("h2 a span")?.innerText ||
                     product.querySelector(".s-size-mini span")?.innerText ||
                     product.querySelector("h2")?.innerText ||
                     `Producto ${index + 1}`;

          // Intentar múltiples selectores para el precio
          const priceWhole = product.querySelector(".a-price-whole")?.innerText ||
                           product.querySelector(".a-price .a-offscreen")?.innerText ||
                           product.querySelector(".a-color-price")?.innerText;
          
          const priceFraction = product.querySelector(".a-price-fraction")?.innerText || "";

          let price = "N/A";
          if (priceWhole) {
            const priceWholeCleaned = priceWhole.replace(/\n/g, "").trim();
            const priceFractionCleaned = priceFraction.replace(/\n/g, "").trim();
            price = `${priceWholeCleaned}${priceFractionCleaned}`;
          }

          return {
            title: title.trim(),
            price: price,
            selector_usado: product.className || "unknown"
          };
        } catch (error) {
          return {
            title: `Error en producto ${index + 1}`,
            price: "Error",
            selector_usado: "error"
          };
        }
      });
    });

    console.log(`✅ Productos extraídos de esta página: ${newProducts.length}`);
    
    // Mostrar algunos productos para debugging
    if (newProducts.length > 0) {
      console.log("📋 Primeros 3 productos encontrados:");
      newProducts.slice(0, 3).forEach((product, i) => {
        console.log(`  ${i + 1}. ${product.title} - ${product.price}`);
      });
    } else {
      console.log("❌ No se encontraron productos en esta página");
      
      // Tomar screenshot para debugging
      await page.screenshot({ path: 'debug-amazon.png', fullPage: true });
      console.log("📸 Screenshot guardado como debug-amazon.png");
      
      // Mostrar el HTML de la página para debugging
      const bodyHTML = await page.evaluate(() => {
        return document.body.innerHTML.substring(0, 1000) + "...";
      });
      console.log("📄 Muestra del HTML de la página:", bodyHTML);
    }

    products = [...products, ...newProducts];

    nextPage = await page.evaluate(() => {
      const nextButton = document.querySelector(".s-pagination-next");

      if (
        nextButton &&
        !nextButton.classList.contains("s-pagination-disabled")
      ) {
        nextButton.click();
        return true;
      }

      return false;
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log(`🎯 RESUMEN FINAL:`);
  console.log(`📊 Total de productos encontrados: ${products.length}`);
  
  if (products.length > 0) {
    console.log(`📋 Primeros 5 productos:`);
    products.slice(0, 5).forEach((product, i) => {
      console.log(`  ${i + 1}. ${product.title} - ${product.price}`);
    });
  } else {
    console.log(`❌ No se encontraron productos. Posibles causas:`);
    console.log(`   • Amazon está bloqueando el bot`);
    console.log(`   • Los selectores CSS han cambiado`);
    console.log(`   • El proxy no está funcionando`);
    console.log(`   • La página requiere interacción adicional`);
  }

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(products);
  const path = "products.xlsx";

  xlsx.utils.book_append_sheet(wb, ws, "Products");
  xlsx.writeFile(wb, path);

  await browser.close();
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
