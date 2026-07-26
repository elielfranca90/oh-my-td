import fs from 'fs';
import path from 'path';

interface CliArgs {
  prompt?: string;
  output?: string;
  style?: 'sprite' | 'icon' | 'background' | 'boss';
  width?: number;
  height?: number;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--prompt' && args[i + 1]) {
      result.prompt = args[++i];
    } else if (arg === '--output' && args[i + 1]) {
      result.output = args[++i];
    } else if (arg === '--style' && args[i + 1]) {
      const val = args[++i];
      if (val === 'sprite' || val === 'icon' || val === 'background' || val === 'boss') {
        result.style = val;
      }
    } else if (arg === '--width' && args[i + 1]) {
      result.width = parseInt(args[++i], 10);
    } else if (arg === '--height' && args[i + 1]) {
      result.height = parseInt(args[++i], 10);
    }
  }

  return result;
}

async function main() {
  const args = parseArgs();
  const prompt = args.prompt || '2D Game Asset Icon';
  const outputName = args.output || `asset_${Date.now()}`;
  const style = args.style || 'sprite';
  const width = args.width || 512;
  const height = args.height || 512;

  const targetDir = path.join(process.cwd(), 'tower-defense-2d', 'public', 'assets');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const outputPath = path.join(targetDir, `${outputName}.png`);

  console.log(`\n🎨 [Image Generator] Iniciando geração de asset visual...`);
  console.log(`📝 Prompt: "${prompt}"`);
  console.log(`📁 Estilo: ${style} | Resolução: ${width}x${height}`);
  console.log(`💾 Destino: ${outputPath}\n`);

  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  let success = false;

  // 1. Tentar API Google Imagen 3 se houver chave válida
  if (geminiKey) {
    try {
      console.log('🔄 Tentando API Google Imagen 3...');
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generateImages:predict?key=${geminiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: `2D video game asset, ${style} style, ${prompt}, centered on solid black background, sharp details` }],
          parameters: { sampleCount: 1, aspectRatio: '1:1' },
        }),
      });

      const data = (await res.json()) as { predictions?: { bytesBase64Encoded?: string }[] };
      if (data.predictions && data.predictions[0]?.bytesBase64Encoded) {
        const buffer = Buffer.from(data.predictions[0].bytesBase64Encoded, 'base64');
        fs.writeFileSync(outputPath, buffer);
        console.log(`✨ Asset gerado via Google Imagen 3 e salvo com sucesso!`);
        success = true;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('⚠️ Google Imagen 3 indisponível:', msg);
    }
  }

  // 2. Tentar API OpenAI DALL-E 3 se DALL-E estiver configurado
  if (!success && openaiKey) {
    try {
      console.log('🔄 Tentando API OpenAI DALL-E 3...');
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: `2d game sprite icon, ${prompt}, dark style, high detail`,
          n: 1,
          size: '1024x1024',
          response_format: 'b64_json',
        }),
      });

      const data = (await res.json()) as { data?: { b64_json?: string }[] };
      if (data.data && data.data[0]?.b64_json) {
        const buffer = Buffer.from(data.data[0].b64_json, 'base64');
        fs.writeFileSync(outputPath, buffer);
        console.log(`✨ Asset gerado via DALL-E 3 e salvo com sucesso!`);
        success = true;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('⚠️ DALL-E 3 indisponível:', msg);
    }
  }

  // 3. Fallback: Criar um ícone/sprite SVG vetorial limpo de alta resolução
  if (!success) {
    console.log('💡 Utilizando Fallback Procedural de Alta Qualidade (SVG -> Asset)...');

    let svgContent = '';
    if (style === 'boss') {
      svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 512 512">
        <defs>
          <radialGradient id="aura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#d500f9" stop-opacity="0.9"/>
            <stop offset="60%" stop-color="#4a148c" stop-opacity="0.5"/>
            <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="armor" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#2a0845"/>
            <stop offset="100%" stop-color="#6441a5"/>
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="6" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
        </defs>
        <rect width="512" height="512" fill="#0b0c10" rx="32"/>
        <circle cx="256" cy="256" r="230" fill="url(#aura)"/>
        <!-- Demonic Armor Crown -->
        <path d="M120 200 L180 120 L256 180 L332 120 L392 200 L350 280 L160 280 Z" fill="url(#armor)" stroke="#e040fb" stroke-width="4"/>
        <!-- Face Core -->
        <polygon points="180,240 256,360 332,240 256,220" fill="#11111a" stroke="#d500f9" stroke-width="6"/>
        <!-- Eyes -->
        <ellipse cx="210" cy="250" rx="20" ry="10" fill="#ff1744" filter="url(#glow)"/>
        <ellipse cx="302" cy="250" rx="20" ry="10" fill="#ff1744" filter="url(#glow)"/>
        <polygon points="210,250 220,252 205,255" fill="#ffffff"/>
        <polygon points="302,250 312,252 297,255" fill="#ffffff"/>
      </svg>`;
    } else if (style === 'icon') {
      svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 512 512">
        <defs>
          <linearGradient id="iconBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffb74d"/>
            <stop offset="100%" stop-color="#f57c00"/>
          </linearGradient>
          <filter id="shadow">
            <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000000" flood-opacity="0.6"/>
          </filter>
        </defs>
        <rect width="512" height="512" rx="96" fill="#12131c"/>
        <rect x="32" y="32" width="448" height="448" rx="80" fill="url(#iconBg)" stroke="#ffe082" stroke-width="8"/>
        <circle cx="256" cy="256" r="140" fill="#ffffff" opacity="0.2"/>
        <!-- Crystal Prism Icon -->
        <polygon points="256,110 370,256 256,402 142,256" fill="#fff59d" filter="url(#shadow)" stroke="#fff" stroke-width="6"/>
        <polygon points="256,110 256,402 370,256" fill="#ffe082"/>
      </svg>`;
    } else {
      svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 512 512">
        <defs>
          <radialGradient id="spriteGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#29b6f6" stop-opacity="0.8"/>
            <stop offset="100%" stop-color="#0288d1" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="512" height="512" rx="32" fill="#0d1117"/>
        <circle cx="256" cy="256" r="180" fill="url(#spriteGlow)"/>
        <!-- Aerodynamic Bio Sprite -->
        <path d="M256 90 L360 220 L310 380 L256 320 L202 380 L152 220 Z" fill="#0288d1" stroke="#81d4fa" stroke-width="8"/>
        <circle cx="256" cy="220" r="40" fill="#e0f7fa"/>
      </svg>`;
    }

    const svgPath = path.join(targetDir, `${outputName}.svg`);
    fs.writeFileSync(svgPath, svgContent);
    console.log(`✅ Asset vetorial procedural gerado e salvo em: ${svgPath}`);
  }

  console.log('🎉 Processo finalizado com sucesso!\n');
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('❌ Erro na geração de asset:', msg);
  process.exit(1);
});
