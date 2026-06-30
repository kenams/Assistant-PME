# -*- coding: utf-8 -*-
"""
Génère la vidéo démo Assistant IT IA — format 16:9 1920x1080.
Workflow A→Z : landing → chat → IA répond → GLPI → admin dashboard.
"""
import os, sys, shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H = 1920, 1080
FPS = 30
MOCKUPS = os.path.join(os.path.dirname(__file__), "public", "mockups")
OUT_DIR = os.path.join(os.path.dirname(__file__), "public")
OUT = os.path.join(OUT_DIR, "demo.mp4")

# ─── Polices ──────────────────────────────────────────────────────────────────
def _fonts():
    paths = [
        (r"C:\Windows\Fonts\arialbd.ttf", r"C:\Windows\Fonts\arial.ttf"),
        ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
         "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    ]
    for bold, reg in paths:
        if os.path.exists(bold):
            return {
                "title":    ImageFont.truetype(bold, 72),
                "subtitle": ImageFont.truetype(bold, 42),
                "body":     ImageFont.truetype(reg,  34),
                "tag":      ImageFont.truetype(bold, 28),
                "small":    ImageFont.truetype(reg,  26),
            }
    d = ImageFont.load_default()
    return {k: d for k in ("title","subtitle","body","tag","small")}

FONTS = _fonts()

# ─── Couleurs ─────────────────────────────────────────────────────────────────
BG_DARK   = (13, 13, 20)
BG_CARD   = (19, 19, 30)
PRIMARY   = (99, 102, 241)
SUCCESS   = (34, 197, 94)
WHITE     = (255, 255, 255)
MUTED     = (107, 107, 128)
GOLD      = (245, 158, 11)

def wrap(draw, text, font, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if draw.textbbox((0,0), test, font=font)[2] > max_w:
            if cur: lines.append(cur)
            cur = w
        else:
            cur = test
    if cur: lines.append(cur)
    return lines

# ─── Slide de titre ────────────────────────────────────────────────────────────
def make_title_slide(title, subtitle, tag="", duration=4.0):
    n = int(duration * FPS)
    frames = []
    for i in range(n):
        t = i / max(n-1, 1)
        img = Image.new("RGB", (W, H), BG_DARK)
        d = ImageDraw.Draw(img)

        # Fond dégradé subtil
        for y in range(H):
            alpha = int(8 * (1 - y/H))
            d.line([(0,y),(W,y)], fill=(max(0,PRIMARY[0]-alpha), max(0,PRIMARY[1]-alpha), max(0,PRIMARY[2]-alpha+alpha*2)))

        # Barre accent gauche
        bar_x = 120
        d.rectangle([(bar_x, H//2-120), (bar_x+4, H//2+120)], fill=PRIMARY)

        # Tag
        if tag:
            tx = bar_x + 28
            d.text((tx, H//2-110), tag.upper(), fill=PRIMARY, font=FONTS["tag"])

        # Titre
        tx = bar_x + 28
        ty = H//2 - 60 if tag else H//2 - 80
        title_lines = wrap(d, title, FONTS["title"], W - tx - 100)
        for li, line in enumerate(title_lines[:3]):
            alpha_t = min(255, int(255 * (t/0.3))) if t < 0.3 else 255
            d.text((tx+2, ty + li*90 + 2), line, fill=(0,0,0,80), font=FONTS["title"])
            d.text((tx, ty + li*90), line, fill=(*WHITE, alpha_t), font=FONTS["title"])
        ty += len(title_lines[:3]) * 90 + 16

        # Subtitle
        sub_lines = wrap(d, subtitle, FONTS["subtitle"], W - tx - 100)
        for li, line in enumerate(sub_lines[:2]):
            alpha_s = min(255, int(255 * max(0, (t-0.15)/0.3))) if t < 0.45 else 255
            d.text((tx, ty + li*56), line, fill=(*SUCCESS, alpha_s), font=FONTS["subtitle"])

        # Branding bas droite
        brand = "KAH Digital — Assistant IT IA"
        bw = d.textbbox((0,0), brand, font=FONTS["small"])[2]
        d.text((W - bw - 40, H - 50), brand, fill=(*MUTED, 180), font=FONTS["small"])

        frames.append(np.array(img))
    return frames

# ─── Slide screenshot ──────────────────────────────────────────────────────────
def make_screenshot_slide(img_path, step_num, step_tag, title, bullets, duration=6.0):
    n = int(duration * FPS)
    frames = []

    # Charger et préparer le screenshot
    if os.path.exists(img_path):
        shot = Image.open(img_path).convert("RGB")
    else:
        shot = Image.new("RGB", (W, H), BG_CARD)

    # Recadrer et resize pour occuper la zone droite (60% de l'écran)
    sw, sh = shot.size
    shot_w = int(W * 0.62)
    shot_h = int(shot_w * sh / sw)
    if shot_h > H - 80:
        shot_h = H - 80
        shot_w = int(shot_h * sw / sh)
    shot = shot.resize((shot_w, shot_h), Image.LANCZOS)

    for i in range(n):
        t = i / max(n-1, 1)
        img = Image.new("RGB", (W, H), BG_DARK)
        d = ImageDraw.Draw(img)

        # Panel gauche (38%)
        panel_w = int(W * 0.36)
        d.rectangle([(0,0),(panel_w, H)], fill=BG_CARD)
        d.line([(panel_w, 0),(panel_w, H)], fill=(*PRIMARY, 60), width=1)

        # Numéro d'étape
        step_str = f"0{step_num}" if step_num < 10 else str(step_num)
        d.text((40, 48), step_str, fill=(*PRIMARY, 80), font=FONTS["title"])

        # Tag
        d.text((40, 160), step_tag.upper(), fill=PRIMARY, font=FONTS["tag"])

        # Titre
        title_lines = wrap(d, title, FONTS["subtitle"], panel_w - 80)
        ty = 200
        for li, line in enumerate(title_lines[:3]):
            a = min(255, int(255 * (t/0.25))) if t < 0.25 else 255
            d.text((40, ty + li*58), line, fill=(*WHITE, a), font=FONTS["subtitle"])
        ty += len(title_lines[:3]) * 58 + 24

        # Séparateur
        d.line([(40, ty), (panel_w-40, ty)], fill=(*PRIMARY, 80), width=1)
        ty += 20

        # Bullets
        for bi, bullet in enumerate(bullets[:5]):
            delay = 0.2 + bi * 0.08
            a = min(255, int(255 * max(0, (t - delay)/0.2))) if t < delay + 0.2 else 255
            # Dot
            d.ellipse([(40, ty+10), (50, ty+20)], fill=(*SUCCESS, a))
            # Texte
            b_lines = wrap(d, bullet, FONTS["body"], panel_w - 100)
            for bj, bline in enumerate(b_lines[:2]):
                d.text((62, ty + bj*40), bline, fill=(*MUTED[:3], a), font=FONTS["body"])
            ty += len(b_lines[:2]) * 40 + 14

        # Screenshot zone droite (léger Ken Burns)
        scale = 1.0 + 0.02 * t
        sw2 = int(shot_w * scale)
        sh2 = int(shot_h * scale)
        shot_s = shot.resize((sw2, sh2), Image.LANCZOS)
        # Crop au centre
        x0 = (sw2 - shot_w) // 2
        y0 = (sh2 - shot_h) // 2
        shot_c = shot_s.crop((x0, y0, x0 + shot_w, y0 + shot_h))

        # Ombre + border
        sx = panel_w + 30
        sy = (H - shot_h) // 2
        # Shadow
        shad = Image.new("RGB", (shot_w + 20, shot_h + 20), BG_DARK)
        img.paste(shad, (sx + 6, sy + 6))
        img.paste(shot_c, (sx, sy))
        # Border
        d.rectangle([(sx-1, sy-1),(sx+shot_w, sy+shot_h)], outline=(*PRIMARY, 60), width=1)

        # Badge étape haut screenshot
        badge = f" Étape {step_num} "
        bw2 = d.textbbox((0,0), badge, font=FONTS["tag"])[2]
        d.rectangle([(sx, sy-28),(sx+bw2+12, sy)], fill=PRIMARY)
        d.text((sx+6, sy-26), badge, fill=WHITE, font=FONTS["tag"])

        # Branding
        brand = "assistant-pme.vercel.app"
        bw3 = d.textbbox((0,0), brand, font=FONTS["small"])[2]
        d.text((W - bw3 - 24, H - 42), brand, fill=(*MUTED, 140), font=FONTS["small"])

        frames.append(np.array(img))
    return frames

# ─── Slide stat ───────────────────────────────────────────────────────────────
def make_stats_slide(title, stats, duration=4.0):
    n = int(duration * FPS)
    frames = []
    for i in range(n):
        t = i / max(n-1, 1)
        img = Image.new("RGB", (W, H), BG_DARK)
        d = ImageDraw.Draw(img)

        # Titre centré
        tw = d.textbbox((0,0), title, font=FONTS["subtitle"])[2]
        d.text(((W-tw)//2, 80), title, fill=WHITE, font=FONTS["subtitle"])
        d.line([(W//2-100, 148),(W//2+100, 148)], fill=PRIMARY, width=3)

        # Stats en grille
        cols = min(3, len(stats))
        cell_w = W // cols
        for si, (val, label, color) in enumerate(stats):
            cx = int(cell_w * (si % cols) + cell_w/2)
            cy = H//2 - 40 if len(stats) <= 3 else (H//2 - 100 if si < cols else H//2 + 80)
            delay = 0.1 + si * 0.12
            a = min(255, int(255 * max(0, (t-delay)/0.25)))

            vw = d.textbbox((0,0), val, font=FONTS["title"])[2]
            d.text((cx - vw//2, cy - 45), val, fill=(*color, a), font=FONTS["title"])
            lw = d.textbbox((0,0), label, font=FONTS["small"])[2]
            d.text((cx - lw//2, cy + 50), label, fill=(*MUTED, a), font=FONTS["small"])

        # Branding
        brand = "KAH Digital — Assistant IT IA"
        bw = d.textbbox((0,0), brand, font=FONTS["small"])[2]
        d.text((W - bw - 40, H - 50), brand, fill=(*MUTED, 140), font=FONTS["small"])

        frames.append(np.array(img))
    return frames

# ─── Transition flash ─────────────────────────────────────────────────────────
def flash(n=8):
    frames = []
    for i in range(n):
        mid = n // 2
        a = i/mid if i < mid else (n-i)/mid
        c = int(255 * a * 0.3)
        img = Image.new("RGB", (W, H), (c, c, c+10))
        frames.append(np.array(img))
    return frames

# ─── MAIN ─────────────────────────────────────────────────────────────────────
def main():
    from moviepy import ImageSequenceClip

    print("=== Génération vidéo démo Assistant IT IA ===")

    all_frames = []

    # 1. Intro titre
    print("[1/7] Slide titre...")
    all_frames += make_title_slide(
        "Votre support IT, piloté par l'IA.",
        "94% des tickets résolus automatiquement — GLPI natif — Déployé en 15 min",
        tag="Assistant IT IA — KAH Digital",
        duration=4.5
    )
    all_frames += flash()

    # 2. Problème (stats)
    print("[2/7] Slide problème...")
    all_frames += make_stats_slide(
        "Le support IT manuel coûte trop cher",
        [
            ("8 min", "par ticket N1 traité manuellement", GOLD),
            ("45 min", "d'attente hors heures ouvrées", (239,68,68)),
            ("35-50k€", "coût technicien N1 dédié / an", (239,68,68)),
        ],
        duration=4.0
    )
    all_frames += flash()

    # 3. Chat vide — point d'entrée
    print("[3/7] Slide chat...")
    all_frames += make_screenshot_slide(
        os.path.join(MOCKUPS, "step3_chat_empty.png"),
        step_num=1,
        step_tag="Point d'entrée",
        title="L'utilisateur décrit son problème en langage naturel",
        bullets=[
            "Pas de formulaire, pas de catégorie à choisir",
            "Interface web accessible depuis n'importe quel device",
            "Disponible 24h/24, 7j/7, FR et EN",
            "Suggestions intelligentes selon les problèmes fréquents",
        ],
        duration=6.0
    )
    all_frames += flash()

    # 4. Réponse IA
    print("[4/7] Slide IA répond...")
    all_frames += make_screenshot_slide(
        os.path.join(MOCKUPS, "step4_chat_response.png"),
        step_num=2,
        step_tag="IA N1 — Résolution instantanée",
        title="GPT-4o diagnostique et guide en moins de 3 secondes",
        bullets=[
            "Analyse le contexte et consulte la base de connaissances",
            "Solution guidée étape par étape, adaptée au profil",
            "94% des tickets N1 résolus sans technicien humain",
            "Mémorisation pour ne pas reposer la même question",
        ],
        duration=6.0
    )
    all_frames += flash()

    # 5. GLPI escalade
    print("[5/7] Slide GLPI...")
    all_frames += make_screenshot_slide(
        os.path.join(MOCKUPS, "step5_glpi_escalade.png"),
        step_num=3,
        step_tag="Escalade automatique → GLPI",
        title="Si trop complexe : ticket GLPI créé et classifié automatiquement",
        bullets=[
            "Catégorie, priorité et description structurée par l'IA",
            "Technicien N2 reçoit un ticket pré-rempli — zéro saisie",
            "Notification Slack ou Teams selon config",
            "Traçabilité complète de la demande initiale",
        ],
        duration=6.0
    )
    all_frames += flash()

    # 6. Admin dashboard
    print("[6/7] Slide admin...")
    all_frames += make_screenshot_slide(
        os.path.join(MOCKUPS, "step6_admin.png"),
        step_num=4,
        step_tag="Tableau de bord DSI",
        title="Visibilité totale en temps réel pour piloter le support",
        bullets=[
            "Taux de résolution IA, temps moyen, tickets en attente N2",
            "Alertes SLA automatiques avant dépassement",
            "Rapports PDF générés automatiquement",
            "Séparation totale des données par tenant — RGPD EU",
        ],
        duration=6.0
    )
    all_frames += flash()

    # 7. Stats finales + CTA
    print("[7/7] Slide résultats...")
    all_frames += make_stats_slide(
        "Résultats après déploiement",
        [
            ("94%", "tickets N1 résolus automatiquement", SUCCESS),
            ("2,4 min", "temps moyen de résolution", PRIMARY),
            ("-70%", "de tickets traités manuellement", SUCCESS),
            ("15 min", "pour être opérationnel", GOLD),
            ("24/7", "disponibilité sans surcoût", SUCCESS),
            ("+38%", "précision à 3 mois (auto-learn)", PRIMARY),
        ],
        duration=5.0
    )

    # Slide CTA finale
    print("Génération slide CTA...")
    cta_frames = make_title_slide(
        "Prêt à voir ça sur vos données ?",
        "Démo personnalisée 30 min · 14 jours gratuits · contact@kah-digital.ch",
        tag="assistant-pme.vercel.app",
        duration=4.0
    )
    all_frames += flash()
    all_frames += cta_frames

    print(f"\nTotal frames : {len(all_frames)} ({len(all_frames)/FPS:.1f}s)")
    print("Encodage vidéo...")

    clip = ImageSequenceClip(all_frames, fps=FPS)
    clip.write_videofile(OUT, codec="libx264", audio=False,
                         ffmpeg_params=["-crf","20","-preset","fast","-pix_fmt","yuv420p"],
                         logger=None)
    clip.close()

    size_mb = os.path.getsize(OUT) / 1024 / 1024
    print(f"\n✅ Vidéo : {OUT}")
    print(f"   Durée  : {len(all_frames)/FPS:.1f}s")
    print(f"   Taille : {size_mb:.1f} MB")

    # Copie bureau
    desk = os.path.join(os.path.expanduser("~"), "Desktop", "demo_assistant_it.mp4")
    shutil.copy2(OUT, desk)
    print(f"   Bureau : {desk}")

if __name__ == "__main__":
    main()
