// Direct test of what Azure Document Intelligence returns from the PDF
const fs = require('fs');
const { DocumentAnalysisClient, AzureKeyCredential } = require("@azure/ai-form-recognizer");

async function testAzureDirect() {
  console.log('🔍 TESTING AZURE DOCUMENT INTELLIGENCE DIRECTLY\n');
  console.log('=' .repeat(80));

  // Get Azure credentials from environment
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  const apiKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_API_KEY;

  if (!endpoint || !apiKey) {
    console.error('❌ Azure credentials not found in environment variables');
    console.error('   Set AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and AZURE_DOCUMENT_INTELLIGENCE_API_KEY');
    process.exit(1);
  }

  console.log(`✅ Azure endpoint: ${endpoint.substring(0, 40)}...`);

  // Read the PDF
  const pdfPath = '/Users/rozsagyene/Downloads/drexler bank statemetns 2023-2025.pdf';
  console.log(`\n📄 Reading PDF: ${pdfPath}`);

  const pdfBuffer = fs.readFileSync(pdfPath);
  console.log(`   Size: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB`);

  // Create Azure client
  const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(apiKey));

  console.log('\n⏳ Sending to Azure Document Intelligence...\n');

  try {
    const poller = await client.beginAnalyzeDocument("prebuilt-layout", pdfBuffer);
    const result = await poller.pollUntilDone();

    console.log('✅ Azure parsing complete!\n');
    console.log('=' .repeat(80));
    console.log('📊 WHAT AZURE FOUND:');
    console.log('=' .repeat(80));

    // Check tables
    const tables = result.tables || [];
    console.log(`\n📋 Tables: ${tables.length}`);

    let tableTransactionCount = 0;
    tables.forEach((table, idx) => {
      console.log(`   Table ${idx + 1}: ${table.rowCount} rows x ${table.columnCount} columns`);
      tableTransactionCount += table.rowCount;
    });

    // Check paragraphs
    const paragraphs = result.paragraphs || [];
    console.log(`\n📝 Paragraphs: ${paragraphs.length}`);

    // Search for Logix-related paragraphs
    const logixParagraphs = paragraphs.filter(p =>
      (p.content || '').match(/logix|dividend/i)
    );
    console.log(`   Logix-related paragraphs: ${logixParagraphs.length}`);

    // Show first 20 Logix paragraphs
    if (logixParagraphs.length > 0) {
      console.log('\n📋 SAMPLE LOGIX PARAGRAPHS:\n');
      logixParagraphs.slice(0, 20).forEach((p, idx) => {
        const content = (p.content || '').trim();
        if (content.length < 100) {
          console.log(`${String(idx + 1).padStart(3, ' ')}. ${content}`);
        }
      });
    }

    // Look for date + dividend pattern
    console.log('\n\n🔍 SEARCHING FOR DIVIDEND TRANSACTIONS:\n');

    let foundDividends = 0;
    for (let i = 0; i < paragraphs.length - 2; i++) {
      const p1 = (paragraphs[i].content || '').trim();
      const p2 = (paragraphs[i + 1].content || '').trim();
      const p3 = (paragraphs[i + 2].content || '').trim();

      // Check for date pattern
      if (p1.match(/^\d{2}\/\d{2}\/\d{2,4}$/)) {
        // Check for dividend description
        if (p2.match(/deposit.*dividend/i)) {
          // Check for amount
          if (p3.match(/^\$?[\d,]+\.\d{2}$/)) {
            foundDividends++;
            console.log(`${foundDividends}. ${p1} | ${p2} | ${p3}`);
          }
        }
      }
    }

    console.log(`\n✅ Found ${foundDividends} Logix dividend transactions in paragraphs`);

    if (foundDividends === 0) {
      console.log('\n❌ NO DIVIDENDS FOUND - Possible reasons:');
      console.log('   1. Dividends are in tables, not paragraphs');
      console.log('   2. PDF has images/scans, not text');
      console.log('   3. Paragraph structure is different than expected');
      console.log('\n💡 Let me check tables for dividends...\n');

      // Check tables for dividend data
      let tableHasDividends = false;
      tables.forEach((table, tableIdx) => {
        table.cells.forEach(cell => {
          const content = (cell.content || '').toLowerCase();
          if (content.includes('dividend') && content.includes('deposit')) {
            if (!tableHasDividends) {
              console.log(`✅ Found dividend data in Table ${tableIdx + 1}`);
              tableHasDividends = true;
            }
          }
        });
      });

      if (!tableHasDividends) {
        console.log('❌ Dividends NOT found in tables either');
      }
    }

    console.log('\n' + '=' .repeat(80));
    console.log('💾 Saving full Azure response for inspection...');

    // Save the full result
    fs.writeFileSync(
      '/Users/rozsagyene/accounting-app/azure-raw-response.json',
      JSON.stringify({
        tableCount: tables.length,
        paragraphCount: paragraphs.length,
        logixParagraphCount: logixParagraphs.length,
        foundDividends,
        sampleParagraphs: logixParagraphs.slice(0, 50).map(p => p.content),
        tables: tables.map(t => ({
          rows: t.rowCount,
          cols: t.columnCount,
          sample: t.cells.slice(0, 20).map(c => c.content)
        }))
      }, null, 2)
    );

    console.log('✅ Saved to: azure-raw-response.json');

  } catch (error) {
    console.error('\n❌ Azure Error:', error.message);
    throw error;
  }
}

testAzureDirect().catch(console.error);
