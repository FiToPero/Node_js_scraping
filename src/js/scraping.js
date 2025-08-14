import puppeteer from "puppeteer";

async function openWebPage() {
  const browser = await puppeteer.launch({
    headless: true, // Modo headless para Docker (no hay display)
    executablePath: '/usr/bin/google-chrome', // Usar Google Chrome
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
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('🌐 Navegando a example.com con Google Chrome...');
    await page.goto("https://www.example.com", { waitUntil: 'networkidle2' });
    
    // Obtener el título de la página
    const title = await page.title();
    console.log('📄 Título de la página:', title);
    
    // Tomar screenshot
    await page.screenshot({ path: '/app/src/example.png' });
    console.log('📸 Screenshot guardado en /app/src/example.png');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
    console.log('✅ Browser cerrado correctamente');
  }
}

openWebPage();
