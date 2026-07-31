from PIL import Image
import os

path = os.path.join(os.path.dirname(__file__), '../public/assets/mega_boss_spritesheet.png')
if not os.path.exists(path):
    path = 'public/assets/mega_boss_spritesheet.png'

print(f"Processando imagem: {path}")
img = Image.open(path).convert("RGBA")
pixels = img.load()
width, height = img.size

def is_bg(r, g, b):
    # Detecta branco e tons de cinza do quadriculado
    if r > 160 and g > 160 and b > 160:
        if abs(r - g) < 25 and abs(g - b) < 25 and abs(r - b) < 25:
            return True
    return False

stack = []
for x in range(width):
    if is_bg(*pixels[x, 0][:3]): stack.append((x, 0))
    if is_bg(*pixels[x, height-1][:3]): stack.append((x, height-1))
for y in range(height):
    if is_bg(*pixels[0, y][:3]): stack.append((0, y))
    if is_bg(*pixels[width-1, y][:3]): stack.append((width-1, y))

visited = set(stack)
while stack:
    x, y = stack.pop()
    r, g, b, a = pixels[x, y]
    if a == 0: continue
    
    if is_bg(r, g, b):
        pixels[x, y] = (0, 0, 0, 0) # Aplica transparência
        for nx, ny in [(x-1, y), (x+1, y), (x, y-1), (x, y+1)]:
            if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in visited:
                visited.add((nx, ny))
                stack.append((nx, ny))

img.save(path)
print("Fundo falso do sprite removido com sucesso!")
