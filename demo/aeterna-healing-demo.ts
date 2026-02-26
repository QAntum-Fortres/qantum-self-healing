import { chromium } from 'playwright';
import { createHealingProxy, SelfHealingEngine } from '../src';

async function runAeternaDemo() {
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║     @qantum/self-healing — Aeterna.website Demo      ║');
    console.log('║     Executing: LIVE HEALING ON PRODUCTION            ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');

    // Предварително изчистване на локалния кеш за селекторите, за да видим AI в действие
    SelfHealingEngine.getInstance().clearCache();

    console.log('🚀 1. Стартиране на Chromium...');
    const browser = await chromium.launch({ headless: true });

    // Създаваме стандартна страница и я вплитаме в QAntum Playwright Proxy
    const context = await browser.newContext();
    const rawPage = await context.newPage();
    const page = createHealingProxy(rawPage);

    try {
        console.log('🌍 2. Навигация към локaлната симулация на aeterna.website...');
        const path = require('path');
        const fileUri = `file://${path.resolve(__dirname, 'test-page.html')}`;
        await page.goto(fileUri);

        console.log('\n💥 3. Опит за кликване върху СЧУПЕН селектор: #investigate-broken-btn');
        console.log('   (Това би сринало нормален тест. QAntum ще се намеси...)');

        // Нашето "лошо" действие, което ще се счупи.
        // QAntum Proxy ще прехване TimeoutError и ще извика Self-Healing Engine.
        // За да "помогнем" на AI, можем да подадем fallbacks, но тук ще разчитаме на неговия "brain",
        // като се надяваме PatternRecognizer/Ollama да намерят първия интерактивен "CTA" бутон.

        // Подаваме и targetText, за да насочим heal процеса към реалния селектор
        const btn = await page.click('#investigate-broken-btn', {
            timeout: 2000,
            qantumTargetText: 'START', // насочваме към бутон, съдържащ "START" (пример: "GET STARTED")
            qantumRole: 'button'
        } as any);

        console.log('\n✅ 4. УСПЕХ! Скриптът продължи своето изпълнение.');

        // Показваме статистиката от сесията
        const stats = SelfHealingEngine.getInstance().getStats();
        console.log('\n📊 QANTUM STATS:');
        console.log(`   Открити грешки: ${stats.totalAttempts}`);
        console.log(`   Успешно възстановени: ${stats.totalHealed}`);
        console.log(`   Успеваемост: ${stats.healRate}%`);

    } catch (e: any) {
        console.log('\n❌ FATAL: Self-healing failed or another error occurred.');
        console.error(e.message);
    } finally {
        await browser.close();
        console.log('\n🏁 Демонстрацията приключи.\n');
    }
}

runAeternaDemo().catch(console.error);
