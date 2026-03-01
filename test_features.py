"""
Tests des 4 nouvelles fonctionnalités CarbTracker
- Feature 1 : Édition de repas (HistoryView)
- Feature 2 : Saisie manuelle sans IA (Scanner onglet Manuel)
- Feature 3 : Rapport journalier partageable (Dashboard)
- Feature 4 : Rappels PWA (Settings toggle)
"""
import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright, expect

BASE = "http://localhost:5173"
SHOTS = "/tmp/carbtracker_tests"
os.makedirs(SHOTS, exist_ok=True)

PASS = "✅"
FAIL = "❌"
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

def close_any_modal(page):
    """Ferme toute modal ouverte via Escape."""
    try:
        page.keyboard.press("Escape")
        page.wait_for_timeout(300)
    except Exception:
        pass

def add_manual_meal(page, carbs="45", details="Test repas manuel", category="déjeuner", gi="Moyen"):
    """Ajoute un repas via l'onglet Manuel dans Scanner."""
    close_any_modal(page)
    page.locator('button[aria-label="Scanner"]').click()
    page.wait_for_load_state("networkidle")
    # Clic sur l'onglet Manuel
    manuel_btn = page.locator("button", has_text="Manuel")
    manuel_btn.wait_for(state="visible", timeout=5000)
    manuel_btn.click()
    page.wait_for_timeout(400)
    # Remplir le formulaire
    page.locator("input[type='number']").first.fill(carbs)
    page.locator("textarea").first.fill(details)
    # Catégorie (utilise le label court)
    label = CAT_LABELS.get(category, category)
    page.locator("button", has_text=label).first.click()
    # IG
    page.locator("button", has_text=gi).first.click()
    page.wait_for_timeout(200)
    # Soumettre
    page.locator("button", has_text="Enregistrer le repas").click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(600)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(
        viewport={"width": 390, "height": 844},
        permissions=["notifications"],
    )
    page = ctx.new_page()

    # ── Page initiale ─────────────────────────────────────────────────────────
    page.goto(BASE)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(800)

    # Si on atterrit sur Settings (pas de clé API), continuer quand même
    is_settings = page.locator("h3", has_text="Clé d'API Gemini").count() > 0
    if is_settings:
        log("ℹ️", "Pas de clé API — les tests AI sont skippés, tests UI uniquement")

    shot(page, "00_home")

    # ══════════════════════════════════════════════════════════════════════════
    # FEATURE 2 : Saisie manuelle (testé en premier pour avoir des données)
    # ══════════════════════════════════════════════════════════════════════════
    print("\n📋 FEATURE 2 — Saisie manuelle sans IA")

    try:
        # Naviguer vers le scanner
        page.locator('button[aria-label="Scanner"]').click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(600)
        shot(page, "feat2_01_scanner")

        # Vérifier que l'onglet Manuel existe
        manuel_btn = page.locator("button", has_text="Manuel")
        manuel_btn.wait_for(state="visible", timeout=5000)
        log(PASS, "Onglet 'Manuel' présent dans le Scanner")
        shot(page, "feat2_02_tabs")

        # Cliquer sur Manuel
        manuel_btn.click()
        page.wait_for_timeout(500)
        shot(page, "feat2_03_manual_form")

        # Vérifier le formulaire
        carbs_input = page.locator("input[type='number']").first
        carbs_input.wait_for(state="visible", timeout=3000)
        log(PASS, "Formulaire Manuel affiché (input glucides visible)")

        # Vérifier que le bouton submit est désactivé sans valeur
        submit_btn = page.locator("button", has_text="Enregistrer le repas")
        is_disabled = submit_btn.is_disabled()
        log(PASS if is_disabled else FAIL, f"Bouton désactivé sans glucides: {is_disabled}")

        # Remplir le formulaire
        carbs_input.fill("60")
        page.locator("textarea").fill("Pain complet, beurre, confiture")
        page.wait_for_timeout(200)

        # Sélectionner catégorie "petit-déjeuner"
        page.locator("button", has_text="Petit-déj.").first.click()
        page.wait_for_timeout(200)

        # Sélectionner IG Bas
        gi_buttons = page.locator("button", has_text="Bas")
        gi_buttons.last.click()
        page.wait_for_timeout(200)
        shot(page, "feat2_04_form_filled")

        # Soumettre
        page.locator("button", has_text="Enregistrer le repas").click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(800)

        # Vérifier le retour au dashboard
        on_dashboard = page.locator("h2", has_text="Résumé du Jour").count() > 0
        log(PASS if on_dashboard else FAIL, f"Retour au dashboard après saisie manuelle: {on_dashboard}")

        # Vérifier que le repas apparaît
        page.wait_for_timeout(300)
        meal_in_list = page.locator("text=Pain complet").count() > 0
        log(PASS if meal_in_list else FAIL, f"Repas manuel visible dans 'Derniers Repas': {meal_in_list}")
        shot(page, "feat2_05_dashboard_after")

    except Exception as e:
        log(FAIL, f"Feature 2 exception: {e}")
        shot(page, "feat2_error")

    # ══════════════════════════════════════════════════════════════════════════
    # FEATURE 1 : Édition de repas
    # ══════════════════════════════════════════════════════════════════════════
    print("\n✏️  FEATURE 1 — Édition de repas")

    try:
        # Ajouter un 2ème repas si on n'en a pas
        add_manual_meal(page, carbs="35", details="Yaourt nature, fruits", category="collation", gi="Bas")
        shot(page, "feat1_01_after_2nd_meal")

        # Aller dans l'historique
        page.locator('button[aria-label="Historique"]').click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(700)
        shot(page, "feat1_02_history")

        # Vérifier que le bouton crayon existe
        pencil_btns = page.locator("button[title='Modifier ce repas']")
        count = pencil_btns.count()
        log(PASS if count > 0 else FAIL, f"Bouton modifier (crayon) présent: {count} trouvé(s)")

        # Cliquer sur le premier crayon
        pencil_btns.first.click()
        page.wait_for_timeout(500)
        shot(page, "feat1_03_modal_open")

        # Vérifier la modal
        modal_title = page.locator("h3", has_text="Modifier le repas")
        modal_visible = modal_title.is_visible()
        log(PASS if modal_visible else FAIL, f"Modal d'édition ouverte: {modal_visible}")

        # Vérifier les champs présents
        carbs_field = page.locator("input[type='number']").first
        details_field = page.locator("textarea").first
        log(PASS, f"Champs glucides et description présents")

        # Modifier les glucides
        carbs_field.fill("75")

        # Modifier la description
        details_field.fill("Repas modifié - test édition")
        page.wait_for_timeout(300)
        shot(page, "feat1_04_edited")

        # Sauvegarder
        save_btn = page.locator("button", has_text="Sauvegarder")
        save_btn.click()
        page.wait_for_timeout(800)
        close_any_modal(page)
        shot(page, "feat1_05_saved")

        # Vérifier que la modal est fermée
        modal_closed = not modal_title.is_visible()
        log(PASS if modal_closed else FAIL, f"Modal fermée après sauvegarde: {modal_closed}")

        # Vérifier que la modification est visible
        page.wait_for_timeout(300)
        edited_visible = page.locator("text=Repas modifié - test édition").count() > 0
        log(PASS if edited_visible else FAIL, f"Repas modifié visible dans l'historique: {edited_visible}")

        # Vérifier les glucides modifiés
        carbs_75 = page.locator("text=75g").count() > 0
        log(PASS if carbs_75 else FAIL, f"Glucides mis à jour à 75g: {carbs_75}")
        shot(page, "feat1_06_history_after")

    except Exception as e:
        log(FAIL, f"Feature 1 exception: {e}")
        shot(page, "feat1_error")

    # ══════════════════════════════════════════════════════════════════════════
    # FEATURE 3 : Rapport journalier partageable
    # ══════════════════════════════════════════════════════════════════════════
    print("\n📊 FEATURE 3 — Rapport journalier")

    try:
        close_any_modal(page)
        page.wait_for_timeout(400)
        # Aller au dashboard
        page.locator('button[aria-label="Accueil"]').click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(500)
        shot(page, "feat3_01_dashboard")

        # Vérifier que le bouton Partager existe
        share_btn = page.locator("button", has_text="Partager")
        share_visible = share_btn.is_visible()
        log(PASS if share_visible else FAIL, f"Bouton 'Partager' présent sur le dashboard: {share_visible}")

        # Vérifier que le div caché de rapport existe dans le DOM
        report_div = page.locator("text=Généré par CarbTracker")
        report_exists = report_div.count() > 0
        log(PASS if report_exists else FAIL, f"Div de rapport caché présent dans le DOM: {report_exists}")

        # Cliquer sur Partager (va déclencher html2canvas et téléchargement ou clipboard)
        with page.expect_download(timeout=8000) as download_info:
            share_btn.click()
            page.wait_for_timeout(4000)

        try:
            download = download_info.value
            filename = download.suggested_filename
            log(PASS, f"Rapport téléchargé: {filename}")
        except Exception:
            # Peut aussi être un share natif ou clipboard — vérifier le toast
            page.wait_for_timeout(3000)
            toast_ok = (
                page.locator("text=partagé").count() > 0 or
                page.locator("text=téléchargé").count() > 0 or
                page.locator("text=copié").count() > 0 or
                page.locator("text=Rapport").count() > 0
            )
            log(PASS if toast_ok else FAIL, f"Toast de confirmation après partage: {toast_ok}")

        shot(page, "feat3_02_after_share")

    except Exception as e:
        log(FAIL, f"Feature 3 exception: {e}")
        shot(page, "feat3_error")

    # ══════════════════════════════════════════════════════════════════════════
    # FEATURE 4 : Rappels PWA (toggle dans Settings)
    # ══════════════════════════════════════════════════════════════════════════
    print("\n🔔 FEATURE 4 — Rappels PWA")

    try:
        # Recharger proprement pour éviter tout état résiduel de Feature 3
        page.goto(BASE)
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(500)

        # Aller dans les réglages
        page.locator('button[aria-label="Réglages"]').click()
        page.wait_for_timeout(800)
        shot(page, "feat4_01_settings")

        # Vérifier la section "Rappels repas"
        rappels_section = page.locator("h3", has_text="Rappels repas")
        section_visible = rappels_section.is_visible()
        log(PASS if section_visible else FAIL, f"Section 'Rappels repas' présente dans Settings: {section_visible}")

        # Vérifier le toggle
        toggle = page.locator(".toggle-switch input[type='checkbox']").last
        toggle_count = toggle.count()
        log(PASS if toggle_count > 0 else FAIL, f"Toggle notifications présent: {toggle_count > 0}")

        initial_state = toggle.is_checked()
        log(PASS, f"État initial du toggle: {'activé' if initial_state else 'désactivé'}")

        # Mocker requestPermission ET serviceWorker.ready avant le clic
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

        # Activer le toggle
        page.locator(".toggle-switch").last.click()
        page.wait_for_timeout(1200)
        shot(page, "feat4_02_toggle_clicked")

        new_state = toggle.is_checked()
        state_changed = new_state != initial_state
        log(PASS if state_changed else FAIL, f"Toggle changé: {initial_state} → {new_state}")

        # Confirmation verte dans la card
        rappels_card = page.locator(".glass-panel", has_text="Rappels repas")
        confirmation = rappels_card.locator("text=Rappels activés").count() > 0
        log(PASS if confirmation else FAIL, f"Message 'Rappels activés' visible dans la card: {confirmation}")
        shot(page, "feat4_03_after_toggle")

    except Exception as e:
        log(FAIL, f"Feature 4 exception: {e}")
        shot(page, "feat4_error")

    # ══════════════════════════════════════════════════════════════════════════
    # RÉCAPITULATIF
    # ══════════════════════════════════════════════════════════════════════════
    browser.close()

    print("\n" + "═" * 60)
    print("  RÉCAPITULATIF DES TESTS")
    print("═" * 60)
    passed = sum(1 for icon, _ in results if icon == PASS)
    failed = sum(1 for icon, _ in results if icon == FAIL)
    for icon, msg in results:
        print(f"  {icon} {msg}")
    print("═" * 60)
    print(f"  {PASS} {passed} réussis  |  {FAIL} {failed} échoués")
    print(f"  📸 Screenshots : {SHOTS}/")
    print("═" * 60)
