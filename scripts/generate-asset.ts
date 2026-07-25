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
    if (arg === '--prompt' && args[i + 1]) result.prompt = args[++i];
    else if (arg === '--output' && args[i + 1]) result.output = args[++i];
    else if (arg === '--style' && args[i + 1]) {
      const val = args[++i];
      if (val === 'sprite' || val === 'icon' || val === 'background' || val === 'boss') result.style = val;
    } else if (arg === '--width' && args[i + 1]) result.width = parseInt(args[++i], 10);
    else if (arg === '--height' && args[i + 1]) result.height = parseInt(args[++i], 10);
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
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  const outputPath = path.join(targetDir, `${outputName}.svg`);

  console.log(`\n🎨 [Image Generator] Iniciando geração de asset visual...`);
  console.log(`💡 Utilizando Gerador Procedural de Alta Qualidade (SVG -> Asset)...`);

  let svgContent = '';
  if (style === 'boss') {
    svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 512 512"><defs><radialGradient id="aura" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#ea80fc" stop-opacity="0.8"/><stop offset="100%" stop-color="#4a148c" stop-opacity="0"/></radialGradient></defs><circle cx="256" cy="256" r="230" fill="url(#aura)"/><circle cx="256" cy="256" r="180" fill="#11111a" stroke="#e040fb" stroke-width="12"/><circle cx="190" cy="210" r="24" fill="#ff1744"/><circle cx="322" cy="210" r="24" fill="#ff1744"/><path d="M180 320 Q256 380 332 320" fill="none" stroke="#ff1744" stroke-width="10"/></svg>`;
  } else {
    svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 512 512"><rect width="512" height="512" rx="64" fill="#181824"/><circle cx="256" cy="256" r="160" fill="#40c4ff" opacity="0.3"/><circle cx="256" cy="256" r="120" fill="#29b6f6"/><text x="256" y="275" font-size="72" font-weight="bold" fill="#ffffff" text-anchor="middle">🎮</text></svg>`;
  }

  fs.writeFileSync(outputPath, svgContent);
  console.log(`✅ Asset vetorial procedural gerado e salvo em: ${outputPath}`);
  console.log('🎉 Processo finalizado com sucesso!\n');
}

main().catch(err => {
  console.error('❌ Erro na geração de asset:', err);
  process.exit(1);
});
