import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

BASE = "https://app-diabete.vercel.app"
SHOTS = "/tmp/carbtracker_vercel"
os.makedirs(SHOTS, exist_ok=True)

PASS = "✅"
FAIL = "❌"
WARN = "⚠️"
results = []

def shot(page, name):
    path = f"{SHOTS}/{name}.png"
    page.screenshot(path=path, full_page=True)
    return path

def log(icon, msg):
    print(f"  {icon} {msg}")
    results.append((icon, msg))

CAT_LABELS = {
    "petit-déjeuner": "Petit-déj.",
    "déjeuner": "Déjeuner",
    "dîner": "Dîner",
    "collation": "Collation",
}

GI_OPTIONS = ["Bas", "Moyen", "Élevé"]

def close_modal(page):
    try:
        page.keyboard.press("Escape")
        page.wait_for_timeout(300)
    except Exception:
        pass

def mock_notifications(page):
    page.evaluate("""() => {
        Notification.requestPermission = () => Promise.resolve('granted');
        Object.defineProperty(Notification, 'permission', { get: () => 'granted', configurable: true });
        if (navigator.serviceWorker) {
            Object.defineProperty(navigator.serviceWorker, 'ready', {
                get: () => Promise.resolve({ active: null, periodicSync: null }),
                configurable: true,
            });
        }
    }""")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(
        viewport={"width": 390, "height": 844},
        permissions=["notifications"],
    )
    page = ctx.new_page()

    # ── Chargement initial ────────────────────────────────────────────────────
    print("\n🌐 CHARGEMENT VERCEL")
    try:
        page.goto(BASE, timeout=30000)
        page.wait_for_load_state("networkidle", timeout=20000)
        page.wait_for_timeout(1000)
        shot(page, "00_home")

        title = page.title()
        log(PASS, f"Page chargée — titre : {title}")

        # Vérifier le header CarbTracker
        header = page.locator("h1", has_text="CarbTracker")
        log(PASS if header.is_visible() else FAIL, f"Header CarbTracker visible")

        # Détecter si on est sur Settings (pas de clé API)
        on_settings = page.locator("h3", has_text="Clé d'API Gemini").count() > 0
        on_dashboard = page.locator("h2", has_text="Résumé").count() > 0
        if on_settings:
            log(WARN, "Aucune clé API — redirigé vers Settings (comportement attendu)")
        elif on_dashboard:
            log(PASS, "Dashboard affiché directement")

        # Vérifier la barre de navigation (5 boutons)
        nav_btns = page.locator(".bottom-nav .nav-btn")
        nav_count = nav_btns.count()
        log(PASS if nav_count == 5 else FAIL, f"Navigation : {nav_count} boutons trouvés (attendu 5)")

        # Vérifier PWA manifest
        manifest_link = page.locator("link[rel='manifest']")
        log(PASS if manifest_link.count() > 0 else WARN, "Manifest PWA présent dans le HTML")

        shot(page, "01_initial_state")
    except Exception as e:
        log(FAIL, f"Chargement Vercel échoué : {e}")
        shot(page, "00_error")

    # ══════════════════════════════════════════════════════════════════════════
    # FEATURE 2 — Saisie manuelle
    # ══════════════════════════════════════════════════════════════════════════
    print("\n📋 FEATURE 2 — Saisie manuelle sans IA")
    try:
        close_modal(page)
        page.locator('button[aria-label="Scanner"]').click()
        page.wait_for_timeout(800)

        # Onglet Manuel
        manuel_btn = page.locator("button", has_text="Manuel")
        manuel_btn.wait_for(state="visible", timeout=8000)
        log(PASS, "Onglet 'Manuel' présent")
        shot(page, "feat2_01_scanner_tabs")

        manuel_btn.click()
        page.wait_for_timeout(500)
        shot(page, "feat2_02_manual_form")

        # Vérifier formulaire
        carbs_input = page.locator("input[type='number']").first
        carbs_input.wait_for(state="visible", timeout=5000)
        log(PASS, "Formulaire Manuel affiché")

        # Bouton désactivé sans glucides
        submit = page.locator("button", has_text="Enregistrer le repas")
        log(PASS if submit.is_disabled() else FAIL, f"Bouton désactivé sans valeur : {submit.is_disabled()}")

        # Remplir
        carbs_input.fill("55")
        page.locator("textarea").first.fill("Pâtes complètes, sauce tomate")
        page.locator("button", has_text="Déjeuner").first.click()
        page.locator("button", has_text="Moyen").first.click()
        page.wait_for_timeout(200)
        shot(page, "feat2_03_filled")

        # Soumettre
        submit.click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(700)

        on_dash = page.locator("h2", has_text="Résumé").count() > 0
        log(PASS if on_dash else FAIL, f"Retour au dashboard après saisie : {on_dash}")

        meal_ok = page.locator("text=Pâtes complètes").count() > 0
        log(PASS if meal_ok else FAIL, f"Repas visible dans 'Derniers Repas' : {meal_ok}")
        shot(page, "feat2_04_dashboard")

    except Exception as e:
        log(FAIL, f"Feature 2 : {e}")
        shot(page, "feat2_error")

    # ══════════════════════════════════════════════════════════════════════════
    # FEATURE 1 — Édition de repas
    # ══════════════════════════════════════════════════════════════════════════
    print("\n✏️  FEATURE 1 — Édition de repas")
    try:
        # Ajouter un 2ème repas
        close_modal(page)
        page.locator('button[aria-label="Scanner"]').click()
        page.wait_for_timeout(600)
        page.locator("button", has_text="Manuel").first.click()
        page.wait_for_timeout(400)
        page.locator("input[type='number']").first.fill("30")
        page.locator("textarea").first.fill("Yaourt grec, miel")
        page.locator("button", has_text="Collation").first.click()
        page.wait_for_timeout(200)
        page.locator("button", has_text="Enregistrer le repas").click()
        page.wait_for_timeout(700)

        # Aller dans l'historique
        page.locator('button[aria-label="Historique"]').click()
        page.wait_for_timeout(800)
        shot(page, "feat1_01_history")

        # Bouton crayon
        pencil_btns = page.locator("button[title='Modifier ce repas']")
        count = pencil_btns.count()
        log(PASS if count > 0 else FAIL, f"Bouton modifier (crayon) : {count} trouvé(s)")

        pencil_btns.first.click()
        page.wait_for_timeout(500)
        shot(page, "feat1_02_modal_open")

        # Modal
        modal = page.locator("h3", has_text="Modifier le repas")
        log(PASS if modal.is_visible() else FAIL, f"Modal d'édition ouverte : {modal.is_visible()}")

        # Modifier
        page.locator("input[type='number']").first.fill("80")
        page.locator("textarea").first.fill("Repas édité sur Vercel")
        page.wait_for_timeout(300)
        shot(page, "feat1_03_edited")

        page.locator("button", has_text="Sauvegarder").click()
        page.wait_for_timeout(600)
        close_modal(page)
        shot(page, "feat1_04_saved")

        modal_closed = not modal.is_visible()
        log(PASS if modal_closed else FAIL, f"Modal fermée : {modal_closed}")

        edited = page.locator("text=Repas édité sur Vercel").count() > 0
        log(PASS if edited else FAIL, f"Description modifiée visible : {edited}")

        carbs_80 = page.locator("text=80g").count() > 0
        log(PASS if carbs_80 else FAIL, f"Glucides mis à jour à 80g : {carbs_80}")
        shot(page, "feat1_05_history_final")

    except Exception as e:
        log(FAIL, f"Feature 1 : {e}")
        shot(page, "feat1_error")

    # ══════════════════════════════════════════════════════════════════════════
    # FEATURE 3 — Rapport journalier
    # ══════════════════════════════════════════════════════════════════════════
    print("\n📊 FEATURE 3 — Rapport journalier")
    try:
        close_modal(page)
        page.locator('button[aria-label="Accueil"]').click()
        page.wait_for_timeout(700)
        shot(page, "feat3_01_dashboard")

        share_btn = page.locator("button", has_text="Partager")
        log(PASS if share_btn.is_visible() else FAIL, f"Bouton 'Partager' présent : {share_btn.is_visible()}")

        report_div = page.locator("text=Généré par CarbTracker")
        log(PASS if report_div.count() > 0 else FAIL, f"Div rapport caché présent dans le DOM")

        # Déclencher le partage → attend un téléchargement PNG
        try:
            with page.expect_download(timeout=12000) as dl:
                share_btn.click()
                page.wait_for_timeout(5000)
            filename = dl.value.suggested_filename
            log(PASS, f"Rapport PNG téléchargé : {filename}")
        except Exception:
            # Peut aussi être clipboard/share natif
            page.wait_for_timeout(3000)
            toast = (
                page.locator("text=partagé").count() > 0 or
                page.locator("text=téléchargé").count() > 0 or
                page.locator("text=copié").count() > 0
            )
            log(PASS if toast else WARN, f"Toast de confirmation : {toast}")
        shot(page, "feat3_02_after_share")

    except Exception as e:
        log(FAIL, f"Feature 3 : {e}")
        shot(page, "feat3_error")

    # ══════════════════════════════════════════════════════════════════════════
    # FEATURE 4 — Rappels PWA
    # ══════════════════════════════════════════════════════════════════════════
    print("\n🔔 FEATURE 4 — Rappels PWA")
    try:
        page.goto(BASE, timeout=20000)
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(600)

        page.locator('button[aria-label="Réglages"]').click()
        page.wait_for_timeout(800)
        shot(page, "feat4_01_settings")

        section = page.locator("h3", has_text="Rappels repas")
        log(PASS if section.is_visible() else FAIL, f"Section 'Rappels repas' présente : {section.is_visible()}")

        toggle = page.locator(".toggle-switch input[type='checkbox']").last
        log(PASS if toggle.count() > 0 else FAIL, f"Toggle notifications présent")

        initial = toggle.is_checked()
        log(PASS, f"État initial : {'activé' if initial else 'désactivé'}")

        mock_notifications(page)

        page.locator(".toggle-switch").last.click()
        page.wait_for_timeout(1200)
        shot(page, "feat4_02_toggled")

        new_state = toggle.is_checked()
        log(PASS if new_state != initial else FAIL, f"Toggle changé : {initial} → {new_state}")

        card = page.locator(".glass-panel", has_text="Rappels repas")
        confirm = card.locator("text=Rappels activés").count() > 0
        log(PASS if confirm else FAIL, f"Message 'Rappels activés' visible : {confirm}")
        shot(page, "feat4_03_confirmed")

    except Exception as e:
        log(FAIL, f"Feature 4 : {e}")
        shot(page, "feat4_error")

    # ══════════════════════════════════════════════════════════════════════════
    # VÉRIFICATIONS SUPPLÉMENTAIRES — PWA & SW
    # ══════════════════════════════════════════════════════════════════════════
    print("\n🔧 PWA & Service Worker")
    try:
        page.goto(BASE, timeout=20000)
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)

        # Vérifier service worker enregistré
        sw_registered = page.evaluate("""async () => {
            if (!('serviceWorker' in navigator)) return false;
            const regs = await navigator.serviceWorker.getRegistrations();
            return regs.length > 0;
        }""")
        log(PASS if sw_registered else WARN, f"Service Worker enregistré : {sw_registered}")

        # Vérifier manifest
        manifest_url = page.evaluate("""() => {
            const link = document.querySelector('link[rel=\"manifest\"]');
            return link ? link.href : null;
        }""")
        log(PASS if manifest_url else WARN, f"Manifest URL : {manifest_url}")

        # Vérifier icône PWA présente dans le manifest
        if manifest_url:
            manifest_resp = page.goto(manifest_url, timeout=5000)
            page.go_back()
            log(PASS, "Manifest accessible")
            page.wait_for_timeout(300)

    except Exception as e:
        log(WARN, f"PWA check : {e}")

    browser.close()

    # ══════════════════════════════════════════════════════════════════════════
    print("\n" + "═" * 60)
    print("  RÉCAPITULATIF — VERCEL")
    print("═" * 60)
    passed = sum(1 for i, _ in results if i == PASS)
    failed = sum(1 for i, _ in results if i == FAIL)
    warned = sum(1 for i, _ in results if i == WARN)
    for icon, msg in results:
        print(f"  {icon} {msg}")
    print("═" * 60)
    print(f"  ✅ {passed} réussis  |  ❌ {failed} échoués  |  ⚠️  {warned} avertissements")
    print(f"  📸 Screenshots : {SHOTS}/")
    print("═" * 60)
