#!/usr/bin/env python3
"""
Gerador Procedural de Spritesheets Animados (Grid 4x5, 20 Frames, 1024x1280)
OH MY TD - Tower Defense 2D

Gera spritesheets PNG de alta definição em RGBA transparente para todos os monstros:
- STANDARD
- RUNNER
- TANK
- SHIELDED
- SPORE_SPRINTER
- MOSS_GIANT
- BOSS
"""

import os
import math
from PIL import Image, ImageDraw

FRAME_WIDTH = 256
FRAME_HEIGHT = 256
COLS = 4
ROWS = 5
TOTAL_WIDTH = COLS * FRAME_WIDTH   # 1024
TOTAL_HEIGHT = ROWS * FRAME_HEIGHT # 1280

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "assets")

def hex_to_rgba(hex_code, alpha=255):
    hex_code = hex_code.lstrip('#')
    if len(hex_code) == 3:
        hex_code = ''.join([c*2 for c in hex_code])
    r = int(hex_code[0:2], 16)
    g = int(hex_code[2:4], 16)
    b = int(hex_code[4:6], 16)
    return (r, g, b, alpha)

def create_base_frame():
    return Image.new("RGBA", (FRAME_WIDTH, FRAME_HEIGHT), (0, 0, 0, 0))

# -------------------------------------------------------------
# 1. STANDARD ENEMY (Goblin Soldado Carmesim)
# -------------------------------------------------------------
def draw_standard_frame(draw: ImageDraw.ImageDraw, state_row: int, frame_col: int):
    cx, cy = 128, 128
    body_color = hex_to_rgba("#e53935")
    dark_body = hex_to_rgba("#b71c1c")
    highlight = hex_to_rgba("#ff6f60")
    white_mark = hex_to_rgba("#ffffff")
    eye_color = hex_to_rgba("#ffebee")
    claw_color = hex_to_rgba("#f5f5f5")

    # State offsets and deformations
    bob_y = 0
    squash_x = 1.0
    squash_y = 1.0
    leg_offset = 0
    arm_angle = 0
    alpha_mult = 1.0
    is_hurt = (state_row == 3)
    is_defeat = (state_row == 4)

    if state_row == 0: # IDLE
        bob_y = math.sin(frame_col * math.pi / 2) * 4
        squash_y = 1.0 + math.sin(frame_col * math.pi / 2) * 0.04
        squash_x = 1.0 - math.sin(frame_col * math.pi / 2) * 0.03
    elif state_row == 1: # MOVING
        bob_y = abs(math.sin(frame_col * math.pi / 2)) * 6
        leg_offset = math.sin(frame_col * math.pi / 2) * 16
        arm_angle = -math.sin(frame_col * math.pi / 2) * 20
    elif state_row == 2: # ATTACK
        cx += (frame_col - 1.5) * 14
        squash_x = 1.15
        arm_angle = 35 + frame_col * 15
    elif state_row == 3: # HURT
        cx -= math.sin(frame_col * math.pi) * 12
        body_color = hex_to_rgba("#ffcdd2") if frame_col % 2 == 1 else hex_to_rgba("#ef5350")
    elif state_row == 4: # DEFEAT
        squash_y = max(0.1, 1.0 - frame_col * 0.25)
        squash_x = 1.0 + frame_col * 0.3
        bob_y = frame_col * 12
        alpha_mult = max(0.1, 1.0 - frame_col * 0.25)

    if is_defeat and frame_col >= 2:
        # Partículas de explosão
        for i in range(8):
            angle = i * (math.pi / 4) + frame_col
            dist = frame_col * 22
            px = 128 + math.cos(angle) * dist
            py = 128 + math.sin(angle) * dist
            draw.ellipse([px-6, py-6, px+6, py+6], fill=hex_to_rgba("#e53935", int(180 * alpha_mult)))

    # Sombra no solo
    shadow_w = int(60 * squash_x * alpha_mult)
    shadow_h = int(18 * squash_y * alpha_mult)
    draw.ellipse([cx - shadow_w, 200 - shadow_h, cx + shadow_w, 200 + shadow_h], fill=(0, 0, 0, int(70 * alpha_mult)))

    # Pernas
    l_leg_y = 175 + bob_y + (leg_offset if state_row == 1 else 0)
    r_leg_y = 175 + bob_y - (leg_offset if state_row == 1 else 0)
    draw.line([(cx - 24, cy + 30 + bob_y), (cx - 30, l_leg_y), (cx - 40, l_leg_y + 8)], fill=dark_body, width=10)
    draw.line([(cx + 24, cy + 30 + bob_y), (cx + 30, r_leg_y), (cx + 40, r_leg_y + 8)], fill=dark_body, width=10)

    # Tronco / Corpo Principal
    bw = int(48 * squash_x)
    bh = int(52 * squash_y)
    body_box = [cx - bw, cy - bh + bob_y, cx + bw, cy + bh + bob_y]
    draw.ellipse(body_box, fill=body_color, outline=dark_body, width=4)

    # Marcações tribais brancas
    draw.line([(cx - 20, cy - 15 + bob_y), (cx + 20, cy + 15 + bob_y)], fill=white_mark, width=6)
    draw.line([(cx + 20, cy - 15 + bob_y), (cx - 20, cy + 15 + bob_y)], fill=white_mark, width=6)

    # Cabeça e Olhos
    head_y = cy - bh - 10 + bob_y
    draw.ellipse([cx - 30, head_y - 28, cx + 30, head_y + 24], fill=body_color, outline=dark_body, width=4)
    # Chifres pequenos
    draw.polygon([(cx - 22, head_y - 20), (cx - 34, head_y - 45), (cx - 10, head_y - 24)], fill=dark_body)
    draw.polygon([(cx + 22, head_y - 20), (cx + 34, head_y - 45), (cx + 10, head_y - 24)], fill=dark_body)
    # Olhos incandescentes
    draw.ellipse([cx - 16, head_y - 6, cx - 6, head_y + 4], fill=eye_color)
    draw.ellipse([cx + 6, head_y - 6, cx + 16, head_y + 4], fill=eye_color)
    draw.ellipse([cx - 13, head_y - 4, cx - 8, head_y + 1], fill=(20, 20, 20, 255))
    draw.ellipse([cx + 9, head_y - 4, cx + 14, head_y + 1], fill=(20, 20, 20, 255))

    # Braços e Garras
    claw_x = cx + 45 + arm_angle
    claw_y = cy + bob_y - 5
    draw.line([(cx - 35, cy + bob_y), (cx - 55, cy + bob_y + 15)], fill=dark_body, width=8)
    draw.line([(cx + 35, cy + bob_y), (claw_x, claw_y)], fill=dark_body, width=8)
    # Garras
    draw.polygon([(claw_x, claw_y), (claw_x + 15, claw_y - 10), (claw_x + 8, claw_y + 5)], fill=claw_color)

# -------------------------------------------------------------
# 2. RUNNER ENEMY (Batedor Ágil Laranja)
# -------------------------------------------------------------
def draw_runner_frame(draw: ImageDraw.ImageDraw, state_row: int, frame_col: int):
    cx, cy = 128, 128
    orange = hex_to_rgba("#ff9800")
    dark_orange = hex_to_rgba("#e65100")
    yellow_glow = hex_to_rgba("#ffe082")
    wind_trail = hex_to_rgba("#ffe082", 150)

    bob_y = 0
    stretch_x = 1.0
    leg_swing = 0
    alpha_mult = 1.0

    if state_row == 0: # IDLE
        bob_y = math.sin(frame_col * math.pi / 2) * 5
    elif state_row == 1: # MOVING (Sprint rápido)
        stretch_x = 1.25
        bob_y = abs(math.sin(frame_col * math.pi)) * 8
        leg_swing = math.sin(frame_col * math.pi) * 28
        # Rastros de vento
        draw.line([(cx - 70, cy + bob_y - 10), (cx - 120, cy + bob_y - 15)], fill=wind_trail, width=5)
        draw.line([(cx - 60, cy + bob_y + 10), (cx - 110, cy + bob_y + 15)], fill=wind_trail, width=4)
    elif state_row == 2: # ATTACK
        cx += (frame_col - 1.5) * 22
        stretch_x = 1.4
        draw.line([(cx - 80, cy), (cx + 80, cy)], fill=yellow_glow, width=6)
    elif state_row == 3: # HURT
        cx -= math.sin(frame_col * math.pi) * 15
        orange = hex_to_rgba("#ffcc80") if frame_col % 2 == 1 else orange
    elif state_row == 4: # DEFEAT
        alpha_mult = max(0.1, 1.0 - frame_col * 0.25)
        for i in range(10):
            fx = cx + (i - 5) * 12 + math.sin(frame_col + i) * 20
            fy = cy + (i % 3) * 10 - frame_col * 25
            draw.ellipse([fx-5, fy-5, fx+5, fy+5], fill=hex_to_rgba("#ff9800", int(200 * alpha_mult)))

    # Sombra
    draw.ellipse([cx - 50 * stretch_x, 195, cx + 50 * stretch_x, 215], fill=(0, 0, 0, int(60 * alpha_mult)))

    # Cauda de energia
    tail_wave = math.sin(frame_col * math.pi / 2) * 12
    draw.line([(cx - 45 * stretch_x, cy + bob_y + 5), (cx - 80 * stretch_x, cy + bob_y - 20 + tail_wave), (cx - 100 * stretch_x, cy + bob_y - 10)], fill=yellow_glow, width=7)

    # Patas traseiras e dianteiras
    draw.line([(cx - 30, cy + 15 + bob_y), (cx - 40 - leg_swing, 185 + bob_y)], fill=dark_orange, width=7)
    draw.line([(cx - 10, cy + 15 + bob_y), (cx - 20 + leg_swing, 185 + bob_y)], fill=dark_orange, width=7)
    draw.line([(cx + 20, cy + 15 + bob_y), (cx + 30 + leg_swing, 185 + bob_y)], fill=dark_orange, width=7)
    draw.line([(cx + 40, cy + 15 + bob_y), (cx + 50 - leg_swing, 185 + bob_y)], fill=dark_orange, width=7)

    # Corpo esguio / aerodinâmico
    draw.ellipse([cx - 45 * stretch_x, cy - 22 + bob_y, cx + 45 * stretch_x, cy + 22 + bob_y], fill=orange, outline=dark_orange, width=3)
    # Listras amarelas
    draw.polygon([(cx - 15, cy - 20 + bob_y), (cx + 5, cy + bob_y), (cx - 10, cy + 20 + bob_y)], fill=yellow_glow)
    draw.polygon([(cx + 5, cy - 20 + bob_y), (cx + 25, cy + bob_y), (cx + 10, cy + 20 + bob_y)], fill=yellow_glow)

    # Cabeça felina/aerodinâmica
    head_x = cx + 40 * stretch_x
    head_y = cy - 15 + bob_y
    draw.polygon([(head_x - 10, head_y - 20), (head_x + 35, head_y + 5), (head_x - 5, head_y + 20)], fill=orange, outline=dark_orange)
    # Orelhas
    draw.polygon([(head_x - 5, head_y - 18), (head_x, head_y - 38), (head_x + 10, head_y - 15)], fill=dark_orange)
    # Olho brilhante
    draw.ellipse([head_x + 10, head_y - 2, head_x + 22, head_y + 8], fill=yellow_glow)

# -------------------------------------------------------------
# 3. TANK ENEMY (Colosso Encouraçado Roxo)
# -------------------------------------------------------------
def draw_tank_frame(draw: ImageDraw.ImageDraw, state_row: int, frame_col: int):
    cx, cy = 128, 128
    purple = hex_to_rgba("#8e24aa")
    dark_purple = hex_to_rgba("#4a148c")
    metal = hex_to_rgba("#ba68c8")
    glow = hex_to_rgba("#e1bee7")

    bob_y = 0
    stomp_l = 0
    stomp_r = 0
    alpha_mult = 1.0

    if state_row == 0: # IDLE
        bob_y = math.sin(frame_col * math.pi / 2) * 3
    elif state_row == 1: # MOVING (Marcha sísmica)
        bob_y = abs(math.sin(frame_col * math.pi / 2)) * 5
        stomp_l = math.sin(frame_col * math.pi / 2) * 12
        stomp_r = -math.sin(frame_col * math.pi / 2) * 12
    elif state_row == 2: # ATTACK (Impacto de martelo)
        bob_y = -8 if frame_col < 2 else 12
        # Ondas de choque
        if frame_col >= 2:
            draw.arc([cx - 90, 180, cx + 90, 220], 0, 180, fill=glow, width=6)
    elif state_row == 3: # HURT
        purple = hex_to_rgba("#d1c4e9") if frame_col % 2 == 1 else purple
        cx += (frame_col % 2 - 0.5) * 10
    elif state_row == 4: # DEFEAT (Shatter / Fragmentos de pedra)
        alpha_mult = max(0.1, 1.0 - frame_col * 0.25)
        for i in range(12):
            bx = cx + (i - 6) * 18 + math.sin(frame_col + i) * 20
            by = cy + (i % 4) * 15 + frame_col * 18
            draw.rectangle([bx-10, by-10, bx+10, by+10], fill=dark_purple, outline=metal)

    # Sombra colossal
    draw.ellipse([cx - 75, 190, cx + 75, 220], fill=(0, 0, 0, int(90 * alpha_mult)))

    # Pernas colossais
    draw.rectangle([cx - 55, 150 + bob_y + stomp_l, cx - 25, 200 + bob_y + stomp_l], fill=dark_purple, outline=metal, width=3)
    draw.rectangle([cx + 25, 150 + bob_y + stomp_r, cx + 55, 200 + bob_y + stomp_r], fill=dark_purple, outline=metal, width=3)

    # Carapaça blindada / Corpo Hexagonal
    draw.polygon([
        (cx - 65, cy - 25 + bob_y),
        (cx, cy - 65 + bob_y),
        (cx + 65, cy - 25 + bob_y),
        (cx + 55, cy + 45 + bob_y),
        (cx - 55, cy + 45 + bob_y),
    ], fill=purple, outline=dark_purple, width=5)

    # Placas de blindagem metálica
    draw.polygon([(cx - 35, cy - 15 + bob_y), (cx, cy - 40 + bob_y), (cx + 35, cy - 15 + bob_y), (cx, cy + 20 + bob_y)], fill=metal, outline=dark_purple, width=3)

    # Núcleo de ametista pulsante
    core_glow = 12 + int(math.sin(frame_col * math.pi / 2) * 4)
    draw.ellipse([cx - core_glow, cy - 10 + bob_y - core_glow, cx + core_glow, cy - 10 + bob_y + core_glow], fill=glow)

    # Ombreiras gigantes
    draw.rectangle([cx - 85, cy - 50 + bob_y, cx - 55, cy - 10 + bob_y], fill=dark_purple, outline=metal, width=4)
    draw.rectangle([cx + 55, cy - 50 + bob_y, cx + 85, cy - 10 + bob_y], fill=dark_purple, outline=metal, width=4)

# -------------------------------------------------------------
# 4. SHIELDED ENEMY (Arcanista / Guardião de Barreira)
# -------------------------------------------------------------
def draw_shielded_frame(draw: ImageDraw.ImageDraw, state_row: int, frame_col: int):
    cx, cy = 128, 128
    core_cyan = hex_to_rgba("#0288d1")
    dark_cyan = hex_to_rgba("#01579b")
    electric_blue = hex_to_rgba("#29b6f6")
    shield_glow = hex_to_rgba("#80d8ff", 110)

    bob_y = math.sin(frame_col * math.pi / 2) * 8
    ring_rot = frame_col * 22
    shield_radius = 80 + int(math.sin(frame_col * math.pi / 2) * 5)
    alpha_mult = 1.0

    if state_row == 2: # ATTACK (Pulso de choque)
        shield_radius = 95 + frame_col * 8
        shield_glow = hex_to_rgba("#80d8ff", 200)
    elif state_row == 3: # HURT (Rachaduras no escudo)
        shield_glow = hex_to_rgba("#ff80ab", 160)
        draw.line([(cx - 40, cy - 30), (cx, cy), (cx + 40, cy + 30)], fill=hex_to_rgba("#ffffff"), width=4)
    elif state_row == 4: # DEFEAT (Colapso)
        alpha_mult = max(0.1, 1.0 - frame_col * 0.25)
        shield_radius = max(10, 80 - frame_col * 20)

    # Sombra flutuante
    draw.ellipse([cx - 40, 205, cx + 40, 225], fill=(0, 0, 0, int(50 * alpha_mult)))

    # Barreira de plasma translúcida
    draw.ellipse([cx - shield_radius, cy + bob_y - shield_radius, cx + shield_radius, cy + bob_y + shield_radius], fill=shield_glow, outline=electric_blue, width=3)

    # Anéis orbitais
    draw.arc([cx - 60, cy + bob_y - 25, cx + 60, cy + bob_y + 25], ring_rot, ring_rot + 180, fill=electric_blue, width=5)
    draw.arc([cx - 60, cy + bob_y - 25, cx + 60, cy + bob_y + 25], ring_rot + 180, ring_rot + 360, fill=dark_cyan, width=4)

    # Núcleo cristalino flutuante
    draw.polygon([
        (cx, cy - 35 + bob_y),
        (cx + 25, cy + bob_y),
        (cx, cy + 35 + bob_y),
        (cx - 25, cy + bob_y),
    ], fill=core_cyan, outline=dark_cyan, width=4)

    # Brilho central
    draw.ellipse([cx - 10, cy - 10 + bob_y, cx + 10, cy + 10 + bob_y], fill=hex_to_rgba("#e1f5fe"))

# -------------------------------------------------------------
# 5. SPORE_SPRINTER (Saltador Fúngico)
# -------------------------------------------------------------
def draw_spore_sprinter_frame(draw: ImageDraw.ImageDraw, state_row: int, frame_col: int):
    cx, cy = 128, 128
    green = hex_to_rgba("#7cb342")
    dark_green = hex_to_rgba("#33691e")
    spore_yellow = hex_to_rgba("#c0ca33")
    spore_cloud = hex_to_rgba("#dce775", 140)

    bob_y = 0
    squash_x = 1.0
    squash_y = 1.0
    alpha_mult = 1.0

    if state_row == 0: # IDLE
        bob_y = math.sin(frame_col * math.pi / 2) * 5
        squash_y = 1.0 + math.sin(frame_col * math.pi / 2) * 0.08
    elif state_row == 1: # MOVING (Saltos contínuos)
        bob_y = -abs(math.sin(frame_col * math.pi / 2)) * 25
        # Nuvens de esporos na impulsão
        draw.ellipse([cx - 35, 180, cx - 15, 200], fill=spore_cloud)
        draw.ellipse([cx + 15, 180, cx + 35, 200], fill=spore_cloud)
    elif state_row == 2: # ATTACK (Ejeção de esporos)
        for i in range(8):
            sx = cx + 35 + frame_col * 18 + (i % 3) * 12
            sy = cy + (i - 4) * 10
            draw.ellipse([sx-7, sy-7, sx+7, sy+7], fill=spore_yellow)
    elif state_row == 3: # HURT
        squash_y = 0.65
        squash_x = 1.35
    elif state_row == 4: # DEFEAT (Nuvem de fumaça fúngica)
        alpha_mult = max(0.1, 1.0 - frame_col * 0.25)
        for i in range(12):
            px = cx + math.cos(i) * frame_col * 25
            py = cy + math.sin(i) * frame_col * 25
            draw.ellipse([px-14, py-14, px+14, py+14], fill=hex_to_rgba("#7cb342", int(170 * alpha_mult)))

    # Sombra
    draw.ellipse([cx - 45, 195, cx + 45, 215], fill=(0, 0, 0, int(60 * alpha_mult)))

    # Pernas insectóides / saltitantes
    draw.line([(cx - 30, cy + 20 + bob_y), (cx - 45, 160 + bob_y), (cx - 35, 195)], fill=dark_green, width=6)
    draw.line([(cx + 30, cy + 20 + bob_y), (cx + 45, 160 + bob_y), (cx + 35, 195)], fill=dark_green, width=6)

    # Chapéu de cogumelo (Corpo superior)
    mw = int(60 * squash_x)
    mh = int(45 * squash_y)
    draw.chord([cx - mw, cy - mh + bob_y, cx + mw, cy + mh + bob_y], 180, 360, fill=green, outline=dark_green, width=4)

    # Bolsas de esporos luminescentes
    draw.ellipse([cx - 30, cy - 30 + bob_y, cx - 14, cy - 14 + bob_y], fill=spore_yellow)
    draw.ellipse([cx + 14, cy - 30 + bob_y, cx + 30, cy - 14 + bob_y], fill=spore_yellow)
    draw.ellipse([cx - 8, cy - 42 + bob_y, cx + 8, cy - 26 + bob_y], fill=spore_yellow)

    # Haste / Tronco do cogumelo
    draw.rectangle([cx - 20 * squash_x, cy + bob_y, cx + 20 * squash_x, cy + 35 * squash_y + bob_y], fill=hex_to_rgba("#dce775"), outline=dark_green, width=3)

# -------------------------------------------------------------
# 6. MOSS_GIANT (Gigante de Musgo Ancestral)
# -------------------------------------------------------------
def draw_moss_giant_frame(draw: ImageDraw.ImageDraw, state_row: int, frame_col: int):
    cx, cy = 128, 128
    dark_moss = hex_to_rgba("#1b5e20")
    bright_moss = hex_to_rgba("#33691e")
    emerald_eye = hex_to_rgba("#aed581")
    stone_color = hex_to_rgba("#424242")
    vine_color = hex_to_rgba("#558b2f")

    bob_y = math.sin(frame_col * math.pi / 2) * 4
    arm_swing = math.sin(frame_col * math.pi / 2) * 20
    alpha_mult = 1.0

    if state_row == 2: # ATTACK (Chicote de vinhas / Golpe de terra)
        arm_swing = 45 + frame_col * 15
        draw.line([(cx + 50, cy + bob_y), (cx + 100, cy + 60 + bob_y)], fill=vine_color, width=8)
    elif state_row == 3: # HURT
        dark_moss = hex_to_rgba("#689f38") if frame_col % 2 == 1 else dark_moss
    elif state_row == 4: # DEFEAT (Desmoronamento em pedras e musgo)
        alpha_mult = max(0.1, 1.0 - frame_col * 0.25)
        for i in range(12):
            bx = cx + (i - 6) * 16
            by = cy + frame_col * 22 + (i % 3) * 10
            draw.ellipse([bx-12, by-12, bx+12, by+12], fill=dark_moss, outline=stone_color)

    # Sombra maciça
    draw.ellipse([cx - 70, 195, cx + 70, 225], fill=(0, 0, 0, int(90 * alpha_mult)))

    # Pernas de tronco de árvore ancestral
    draw.rectangle([cx - 50, 145 + bob_y, cx - 20, 200], fill=stone_color, outline=dark_moss, width=4)
    draw.rectangle([cx + 20, 145 + bob_y, cx + 50, 200], fill=stone_color, outline=dark_moss, width=4)

    # Tronco de rocha ancestral com musgo
    draw.polygon([
        (cx - 55, cy - 35 + bob_y),
        (cx, cy - 70 + bob_y),
        (cx + 55, cy - 35 + bob_y),
        (cx + 45, cy + 45 + bob_y),
        (cx - 45, cy + 45 + bob_y),
    ], fill=dark_moss, outline=stone_color, width=5)

    # Camadas de musgo brilhante
    draw.ellipse([cx - 40, cy - 30 + bob_y, cx + 40, cy + 20 + bob_y], fill=bright_moss)

    # Vinhas penduradas
    draw.line([(cx - 35, cy + bob_y), (cx - 30, cy + 50 + bob_y)], fill=vine_color, width=5)
    draw.line([(cx + 30, cy + bob_y), (cx + 35, cy + 55 + bob_y)], fill=vine_color, width=5)

    # Olhos de esmeralda ancestrais
    draw.ellipse([cx - 22, cy - 25 + bob_y, cx - 8, cy - 11 + bob_y], fill=emerald_eye)
    draw.ellipse([cx + 8, cy - 25 + bob_y, cx + 22, cy - 11 + bob_y], fill=emerald_eye)

    # Braços pesados de madeira/pedra
    draw.line([(cx - 55, cy - 15 + bob_y), (cx - 75, cy + 30 + arm_swing + bob_y)], fill=stone_color, width=12)
    draw.line([(cx + 55, cy - 15 + bob_y), (cx + 75, cy + 30 - arm_swing + bob_y)], fill=stone_color, width=12)

# -------------------------------------------------------------
# 7. BOSS ENEMY (Lorde Chefe com Coroa Dourada)
# -------------------------------------------------------------
def draw_boss_frame(draw: ImageDraw.ImageDraw, state_row: int, frame_col: int):
    cx, cy = 128, 128
    crimson = hex_to_rgba("#b71c1c")
    dark_crimson = hex_to_rgba("#7f0000")
    gold_crown = hex_to_rgba("#ffd700")
    gold_flame = hex_to_rgba("#ffea00")
    cape_color = hex_to_rgba("#4a148c")
    eye_red = hex_to_rgba("#ff1744")

    bob_y = math.sin(frame_col * math.pi / 2) * 5
    cape_wave = math.sin(frame_col * math.pi / 2) * 15
    slash_angle = 0
    alpha_mult = 1.0

    if state_row == 2: # ATTACK (Corte Régio Devastador)
        slash_angle = 35 + frame_col * 20
        draw.arc([cx - 40, cy - 40, cx + 110, cy + 110], -45, 120, fill=gold_flame, width=8)
    elif state_row == 3: # HURT
        crimson = hex_to_rgba("#ff8a80") if frame_col % 2 == 1 else crimson
    elif state_row == 4: # DEFEAT (Explosão e coroa caindo)
        alpha_mult = max(0.1, 1.0 - frame_col * 0.25)
        # Coroa caindo
        crown_y = cy + frame_col * 25
        draw.polygon([(cx - 25, crown_y), (cx - 35, crown_y - 20), (cx, crown_y - 10), (cx + 35, crown_y - 20), (cx + 25, crown_y)], fill=gold_crown)
        for i in range(12):
            fx = cx + math.cos(i) * frame_col * 28
            fy = cy + math.sin(i) * frame_col * 28
            draw.ellipse([fx-10, fy-10, fx+10, fy+10], fill=crimson)
        return

    # Sombra imperial
    draw.ellipse([cx - 65, 195, cx + 65, 225], fill=(0, 0, 0, int(90 * alpha_mult)))

    # Capa Real esvoaçante
    draw.polygon([
        (cx - 45, cy - 10 + bob_y),
        (cx - 70 + cape_wave, 185 + bob_y),
        (cx + 70 - cape_wave, 185 + bob_y),
        (cx + 45, cy - 10 + bob_y),
    ], fill=cape_color, outline=dark_crimson, width=3)

    # Pernas do Lorde
    draw.line([(cx - 30, cy + 30 + bob_y), (cx - 35, 195)], fill=dark_crimson, width=12)
    draw.line([(cx + 30, cy + 30 + bob_y), (cx + 35, 195)], fill=dark_crimson, width=12)

    # Peitoral demoníaco régio
    draw.polygon([
        (cx - 50, cy - 30 + bob_y),
        (cx, cy - 55 + bob_y),
        (cx + 50, cy - 30 + bob_y),
        (cx + 40, cy + 40 + bob_y),
        (cx - 40, cy + 40 + bob_y),
    ], fill=crimson, outline=dark_crimson, width=5)

    # Cabeça régia com chifres
    head_y = cy - 65 + bob_y
    draw.ellipse([cx - 32, head_y - 25, cx + 32, head_y + 25], fill=crimson, outline=dark_crimson, width=4)
    # Chifres régios
    draw.polygon([(cx - 25, head_y - 15), (cx - 45, head_y - 50), (cx - 15, head_y - 25)], fill=dark_crimson)
    draw.polygon([(cx + 25, head_y - 15), (cx + 45, head_y - 50), (cx + 15, head_y - 25)], fill=dark_crimson)

    # COROA REAL DE OURO FLAMEJANTE
    crown_y = head_y - 32
    draw.polygon([
        (cx - 28, crown_y),
        (cx - 36, crown_y - 26),
        (cx - 14, crown_y - 14),
        (cx, crown_y - 32),
        (cx + 14, crown_y - 14),
        (cx + 36, crown_y - 26),
        (cx + 28, crown_y),
    ], fill=gold_crown, outline=hex_to_rgba("#b26a00"), width=3)
    # Joia central da coroa
    draw.ellipse([cx - 6, crown_y - 10, cx + 6, crown_y - 2], fill=eye_red)

    # Olhos vermelhos ameaçadores
    draw.ellipse([cx - 18, head_y - 5, cx - 6, head_y + 6], fill=eye_red)
    draw.ellipse([cx + 6, head_y - 5, cx + 18, head_y + 6], fill=eye_red)

    # Braços e Garra Real / Espada
    draw.line([(cx - 45, cy - 10 + bob_y), (cx - 70, cy + 30 + bob_y)], fill=dark_crimson, width=10)
    draw.line([(cx + 45, cy - 10 + bob_y), (cx + 70 + slash_angle, cy + 20 + bob_y)], fill=dark_crimson, width=10)


MONSTER_GENERATORS = {
    'standard_spritesheet.png': draw_standard_frame,
    'runner_spritesheet.png': draw_runner_frame,
    'tank_spritesheet.png': draw_tank_frame,
    'shielded_spritesheet.png': draw_shielded_frame,
    'spore_sprinter_spritesheet.png': draw_spore_sprinter_frame,
    'moss_giant_spritesheet.png': draw_moss_giant_frame,
    'boss_spritesheet.png': draw_boss_frame,
}

def generate_all_spritesheets():
    os.makedirs(OUT_DIR, exist_ok=True)
    print(f"--- Gerando Spritesheets Animados em {OUT_DIR} ---")

    for filename, draw_func in MONSTER_GENERATORS.items():
        sheet = Image.new("RGBA", (TOTAL_WIDTH, TOTAL_HEIGHT), (0, 0, 0, 0))

        for row in range(ROWS):
            for col in range(COLS):
                frame = create_base_frame()
                draw = ImageDraw.Draw(frame)
                draw_func(draw, row, col)
                sheet.paste(frame, (col * FRAME_WIDTH, row * FRAME_HEIGHT))

        out_path = os.path.join(OUT_DIR, filename)
        sheet.save(out_path, "PNG", optimize=True)
        print(f"[OK] Gerado: {filename} ({TOTAL_WIDTH}x{TOTAL_HEIGHT}) -> {os.path.getsize(out_path)} bytes")

    print("--- Todos os 7 Spritesheets Animados foram gerados com sucesso! ---")

if __name__ == "__main__":
    generate_all_spritesheets()
