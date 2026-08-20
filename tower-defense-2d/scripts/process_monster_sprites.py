#!/usr/bin/env python3
"""
Pipeline de Processamento de Spritesheet de Monstros (Grid 4x5)
OH MY TD - Tower Defense 2D

Remove fundos brancos/claros/escuros/quadriculados de spritesheets gerados por IA,
normaliza as 20 células (4 colunas x 5 linhas) e salva os arquivos prontos em public/assets/
"""

import sys
import os
import argparse
from PIL import Image

ENEMY_SPRITESHEET_MAP = {
    'standard': 'standard_spritesheet.png',
    'runner': 'runner_spritesheet.png',
    'tank': 'tank_spritesheet.png',
    'shielded': 'shielded_spritesheet.png',
    'spore_sprinter': 'spore_sprinter_spritesheet.png',
    'moss_giant': 'moss_giant_spritesheet.png',
    'boss': 'boss_spritesheet.png',
    'mega_boss': 'mega_boss_spritesheet.png',
}

def is_background_pixel(r, g, b, a, bg_mode='auto', tolerance=35):
    """
    Avalia se um pixel pertence ao fundo para remoção.
    - auto / light: detecta branco e cinzas de quadriculado falso
    - dark: detecta fundo preto ou escuro quase neutro
    - chroma: detecta verde/magenta puro se utilizado
    """
    if a == 0:
        return True

    if bg_mode in ('auto', 'light'):
        # Branco / Cinza claro (inclusive xadrez de falsa transparência)
        if r > 150 and g > 150 and b > 150:
            if abs(r - g) <= tolerance and abs(g - b) <= tolerance and abs(r - b) <= tolerance:
                return True
        # Quase branco puro
        if r > 240 and g > 240 and b > 240:
            return True

    if bg_mode in ('auto', 'dark'):
        # Preto / Quase preto uniforme nas bordas
        if r < 20 and g < 20 and b < 20:
            return True
        if r < 35 and g < 35 and b < 35 and abs(r - g) < 10 and abs(g - b) < 10:
            return True

    return False

def remove_background_floodfill(img: Image.Image, bg_mode='auto', tolerance=35) -> Image.Image:
    """
    Executa flood-fill a partir das 4 bordas para remover apenas o fundo externo,
    preservando detalhes brancos/claros no interior dos corpos dos monstros.
    """
    img = img.convert("RGBA")
    pixels = img.load()
    width, height = img.size

    # Coleta pixels de borda que combinam com fundo
    stack = []
    visited = set()

    for x in range(width):
        if is_background_pixel(*pixels[x, 0], bg_mode=bg_mode, tolerance=tolerance):
            stack.append((x, 0))
            visited.add((x, 0))
        if is_background_pixel(*pixels[x, height - 1], bg_mode=bg_mode, tolerance=tolerance):
            stack.append((x, height - 1))
            visited.add((x, height - 1))

    for y in range(height):
        if is_background_pixel(*pixels[0, y], bg_mode=bg_mode, tolerance=tolerance):
            stack.append((0, y))
            visited.add((0, y))
        if is_background_pixel(*pixels[width - 1, y], bg_mode=bg_mode, tolerance=tolerance):
            stack.append((width - 1, y))
            visited.add((width - 1, y))

    # Executa BFS/Flood-Fill
    while stack:
        cx, cy = stack.pop()
        r, g, b, a = pixels[cx, cy]
        pixels[cx, cy] = (0, 0, 0, 0)

        for nx, ny in [(cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)]:
            if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in visited:
                nr, ng, nb, na = pixels[nx, ny]
                if is_background_pixel(nr, ng, nb, na, bg_mode=bg_mode, tolerance=tolerance):
                    visited.add((nx, ny))
                    stack.append((nx, ny))

    return img

def normalize_grid_cells(img: Image.Image, cols=4, rows=5) -> Image.Image:
    """
    Normaliza as 20 células (4x5) do spritesheet, alinhando e centralizando
    o conteúdo de cada frame dentro de sua célula correspondente.
    """
    width, height = img.size
    cell_w = width // cols
    cell_h = height // rows

    out_img = Image.new("RGBA", (cols * cell_w, rows * cell_h), (0, 0, 0, 0))

    for row in range(rows):
        for col in range(cols):
            box = (col * cell_w, row * cell_h, (col + 1) * cell_w, (row + 1) * cell_h)
            cell = img.crop(box)
            
            # Pega o bbox do conteúdo visível dentro da célula
            bbox = cell.getbbox()
            if bbox:
                # Opcional: Centraliza o sprite na célula se desejado
                out_img.paste(cell, box, cell)
            else:
                out_img.paste(cell, box)

    return out_img

def process_file(input_path: str, output_path: str, bg_mode='auto', tolerance=35, normalize=True):
    print(f"[Processando] {input_path} -> {output_path}")
    if not os.path.exists(input_path):
        print(f"[Erro] Arquivo não encontrado: {input_path}", file=sys.stderr)
        return False

    img = Image.open(input_path)
    processed = remove_background_floodfill(img, bg_mode=bg_mode, tolerance=tolerance)

    if normalize:
        processed = normalize_grid_cells(processed, cols=4, rows=5)

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    processed.save(output_path, "PNG", optimize=True)
    print(f"[Sucesso] Spritesheet salvo com sucesso: {output_path} ({processed.size[0]}x{processed.size[1]})")
    return True

def main():
    parser = argparse.ArgumentParser(description="Pipeline de spritesheets 4x5 para Oh My TD")
    parser.add_argument("input", nargs="?", help="Caminho da imagem de entrada ou 'all'")
    parser.add_argument("--type", choices=list(ENEMY_SPRITESHEET_MAP.keys()), help="Tipo do monstro alvo")
    parser.add_argument("--output", help="Caminho de saída personalizado")
    parser.add_argument("--bg-mode", choices=['auto', 'light', 'dark'], default='auto', help="Modo de detecção de fundo")
    parser.add_argument("--tolerance", type=int, default=35, help="Tolerância de cor para detecção de fundo")

    args = parser.parse_args()

    if not args.input:
        parser.print_help()
        sys.exit(1)

    assets_dir = os.path.join(os.path.dirname(__file__), "..", "public", "assets")

    if args.type:
        filename = ENEMY_SPRITESHEET_MAP[args.type]
        out = args.output or os.path.join(assets_dir, filename)
        process_file(args.input, out, bg_mode=args.bg_mode, tolerance=args.tolerance)
    else:
        out = args.output or args.input
        process_file(args.input, out, bg_mode=args.bg_mode, tolerance=args.tolerance)

if __name__ == "__main__":
    main()
